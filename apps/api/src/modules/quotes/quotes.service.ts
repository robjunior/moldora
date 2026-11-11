import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

function round4(n: number) { return Math.round((n + Number.EPSILON) * 10000) / 10000; }
function calculatePricing(input: any, currency = 'BRL') {
  const volumeMl = Number(input.volumeMl || 0);
  const pricePerLiter = Number(input.pricePerLiter || 0);
  const printTimeHours = Number(input.printTimeHours || 0);
  const machineCostPerHour = Number(input.machineCostPerHour || 0);
  const energyCost = Number(input.energyCost || 0);
  const operationCost = Number(input.operationCost || 0);
  const laborCost = Number(input.laborCost || 0);
  const lossRate = Number(input.lossRate || 0);
  const marginRate = Math.min(Math.max(Number(input.marginRate || 0), 0), 0.99);
  const effectiveVolumeMl = volumeMl * (1 + lossRate);
  const materialCost = (effectiveVolumeMl / 1000) * pricePerLiter;
  const machineCost = printTimeHours * machineCostPerHour;
  const lossCost = ((volumeMl * lossRate) / 1000) * pricePerLiter;
  const totalCost = materialCost + energyCost + machineCost + operationCost + laborCost;
  const salePrice = marginRate >= 1 ? totalCost : totalCost / (1 - marginRate);
  return { materialCost: round4(materialCost), energyCost: round4(energyCost), machineCost: round4(machineCost), operationCost: round4(operationCost), laborCost: round4(laborCost), lossCost: round4(lossCost), totalCost: round4(totalCost), marginRate: round4(marginRate), salePrice: round4(salePrice), currency, inputs: { volumeMl, pricePerLiter, printTimeHours, machineCostPerHour, energyCost, operationCost, laborCost, lossRate } };
}

@Injectable()
export class QuotesService {
  constructor(private prisma: PrismaService) {}

  list() { return this.prisma.quote.findMany({ include: { customer: true, items: true }, orderBy: { createdAt: 'desc' } }); }

  async create(data: { customerId: string; notes?: string; validityDays?: number }) {
    const validityUntil = data.validityDays ? new Date(Date.now() + Number(data.validityDays) * 86400000) : null;
    return this.prisma.quote.create({ data: { customerId: data.customerId, notes: data.notes, status: 'DRAFT', validityUntil } });
  }

  async get(id: string) {
    const q = await this.prisma.quote.findUnique({ where: { id }, include: { items: { include: { slicingJob: true, file: true, material: true } }, customer: true, orders: true } });
    if (!q) throw new NotFoundException('Quote not found');
    return q;
  }

  async addItem(quoteId: string, body: any) {
    const quote = await this.get(quoteId);
    if (['SENT', 'APPROVED', 'CONVERTED'].includes(quote.status)) throw new BadRequestException('Quote is immutable in current status');
    let breakdown: any = body.breakdownJson;
    if (!breakdown && body.pricingInput) {
      const b = calculatePricing(body.pricingInput, body.currency || 'BRL') as any;
      breakdown = { ...b, inputs: body.pricingInput };
    }
    const qty = Number(body.quantity || 1);
    const unitPrice = Number(breakdown?.salePrice ?? body.unitPrice ?? 0);
    return this.prisma.quoteItem.create({
      data: {
        quoteId,
        fileId: body.fileId,
        slicingJobId: body.slicingJobId,
        materialId: body.materialId,
        description: body.description,
        quantity: qty,
        breakdownJson: breakdown ?? undefined,
        unitPrice: unitPrice as any,
        totalPrice: (unitPrice * qty) as any,
      },
    });
  }

  async recalcTotals(id: string) {
    const quote = await this.get(id);
    const subtotal = quote.items.reduce((sum, it) => sum + Number(it.totalPrice || 0), 0);
    await this.prisma.quote.update({ where: { id }, data: { subtotal: subtotal as any, total: subtotal as any } });
    return this.get(id);
  }

  async send(id: string) {
    const quote = await this.recalcTotals(id);
    if (!quote.items.length) throw new BadRequestException('Quote must have items');
    if (!['DRAFT', 'REVIEW', 'PROCESSING'].includes(quote.status)) throw new BadRequestException('Invalid status for send');
    const snapshot = {
      quoteId: id,
      version: quote.version,
      frozenAt: new Date().toISOString(),
      statusAtSend: quote.status,
      currency: quote.currency,
      customer: quote.customer,
      items: quote.items,
      subtotal: quote.subtotal,
      total: quote.total,
      notes: quote.notes,
      validityUntil: quote.validityUntil,
    };
    return this.prisma.quote.update({ where: { id }, data: { status: 'SENT', sentAt: new Date(), snapshotJson: snapshot as any } });
  }

  async approve(id: string) {
    const quote = await this.get(id);
    if (quote.status !== 'SENT') throw new BadRequestException('Quote must be SENT to approve');
    const snapshot = quote.snapshotJson || { quoteId: id, frozenAt: new Date().toISOString(), note: 'approved without prior snapshot', items: quote.items, total: quote.total };
    return this.prisma.quote.update({ where: { id }, data: { status: 'APPROVED', approvedAt: new Date(), snapshotJson: snapshot as any } });
  }

  async reject(id: string) {
    const quote = await this.get(id);
    if (!['SENT'].includes(quote.status)) throw new BadRequestException('Quote must be SENT to reject');
    return this.prisma.quote.update({ where: { id }, data: { status: 'REJECTED', rejectedAt: new Date() } });
  }

  async proposalHtml(id: string) {
    const q = await this.get(id);
    const snap: any = q.snapshotJson || q;
    const items = (snap.items || q.items || []).map((it: any) => `<tr><td>${it.description || it.file?.originalName || 'Item'}</td><td>${it.quantity}</td><td>BRL ${Number(it.unitPrice||0).toFixed(2)}</td><td>BRL ${Number(it.totalPrice||0).toFixed(2)}</td></tr>`).join('');
    return `<!doctype html><html><head><meta charset="utf-8"><title>Proposal ${q.id}</title>
<style>body{font-family:Arial,sans-serif;margin:32px;color:#111}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5}.total{font-size:20px;margin-top:16px}</style></head>
<body><h1>Commercial Proposal - 3D Printing</h1>
<p><b>Quote:</b> ${q.id} &nbsp; <b>Status:</b> ${q.status} &nbsp; <b>Version:</b> ${q.version}</p>
<p><b>Customer:</b> ${q.customer?.name || ''} ${q.customer?.email ? '('+q.customer.email+')':''}</p>
<p><b>Valid until:</b> ${q.validityUntil ? new Date(q.validityUntil).toLocaleDateString('en-US') : 'Not defined'}</p>
<table><thead><tr><th>Description</th><th>Qty</th><th>Unit</th><th>Total</th></tr></thead><tbody>${items}</tbody></table>
<p class="total"><b>Total:</b> BRL ${Number(snap.total ?? q.total ?? 0).toFixed(2)}</p>
<p><b>Notes:</b> ${q.notes || '-'}</p>
<hr><small>Generated at ${new Date().toLocaleString('en-US')}. Values are frozen in the snapshot when issued/approved.</small>
</body></html>`;
  }
}
