export interface PricingInput {
  volumeMl: number;
  pricePerLiter: number; // currency per liter
  printTimeHours: number;
  machineCostPerHour: number;
  energyCost: number;
  operationCost: number;
  laborCost: number;
  marginRate: number; // 0..1 over sale price (Pv = Ct/(1-M))
  lossRate?: number; // 0..1
}

export interface PricingBreakdown {
  materialCost: number;
  energyCost: number;
  machineCost: number;
  operationCost: number;
  laborCost: number;
  lossCost: number;
  totalCost: number;
  marginRate: number;
  salePrice: number;
  currency: string;
}

const round4 = (n: number) => Math.round((n + Number.EPSILON) * 10000) / 10000;

export function calculatePricing(input: PricingInput, currency = "BRL"): PricingBreakdown {
  const lossRate = input.lossRate ?? 0;
  const effectiveVolumeMl = input.volumeMl * (1 + lossRate);
  const materialCost = (effectiveVolumeMl / 1000) * input.pricePerLiter;
  const machineCost = input.printTimeHours * input.machineCostPerHour;
  const lossCost = ((input.volumeMl * lossRate) / 1000) * input.pricePerLiter;
  const totalCost = materialCost + input.energyCost + machineCost + input.operationCost + input.laborCost;
  const m = Math.min(Math.max(input.marginRate, 0), 0.99);
  const salePrice = totalCost / (1 - m);
  return {
    materialCost: round4(materialCost),
    energyCost: round4(input.energyCost),
    machineCost: round4(machineCost),
    operationCost: round4(input.operationCost),
    laborCost: round4(input.laborCost),
    lossCost: round4(lossCost),
    totalCost: round4(totalCost),
    marginRate: round4(m),
    salePrice: round4(salePrice),
    currency,
  };
}
