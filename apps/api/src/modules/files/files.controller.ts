import { BadRequestException, Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { FilesService } from './files.service';
import { StorageService } from '../storage/storage.service';
import { createHash } from 'crypto';

const ALLOWED = ['stl','3mf','obj','vox'];

@Controller('files')
export class FilesController {
  constructor(private readonly service: FilesService, private readonly storage: StorageService) {}

  @Post('upload')
  async upload(@Req() req: any) {
    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('multipart/form-data')) throw new BadRequestException('multipart/form-data required');
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const bodyBuf = Buffer.concat(chunks);
    const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
    if (!boundaryMatch) throw new BadRequestException('Missing boundary');
    const boundary = boundaryMatch[1] || boundaryMatch[2];
    const parts = bodyBuf.toString('binary').split(`--${boundary}`);
    let fileBuf: Buffer | null = null;
    let originalName = 'upload';
    let customerId = '';
    for (const part of parts) {
      if (!part || part === '--\r\n' || part === '--') continue;
      const [rawHeaders, ...rest] = part.split('\r\n\r\n');
      if (!rawHeaders || rest.length === 0) continue;
      const content = rest.join('\r\n\r\n');
      const trimmed = content.endsWith('\r\n') ? content.slice(0, -2) : content;
      const nameMatch = /name="([^"]+)"/.exec(rawHeaders);
      const filenameMatch = /filename="([^"]*)"/.exec(rawHeaders);
      const field = nameMatch?.[1];
      if (filenameMatch && field === 'file') {
        originalName = filenameMatch[1] || 'upload';
        fileBuf = Buffer.from(trimmed, 'binary');
      } else if (field === 'customerId') {
        customerId = Buffer.from(trimmed, 'binary').toString('utf8').trim();
      }
    }
    if (!fileBuf) throw new BadRequestException('file is required');
    if (!customerId) throw new BadRequestException('customerId is required');
    const ext = (originalName.split('.').pop() || '').toLowerCase();
    if (!ALLOWED.includes(ext)) throw new BadRequestException('Unsupported file format');
    const max = Number(process.env.MAX_UPLOAD_BYTES || 50 * 1024 * 1024);
    if (fileBuf.length > max) throw new BadRequestException('File too large');
    const sha256 = createHash('sha256').update(fileBuf).digest('hex');
    const saved = await this.storage.saveBuffer(originalName, fileBuf);
    return this.service.registerUpload({ customerId, originalName, storageKey: saved.storageKey, format: ext.toUpperCase(), sizeBytes: fileBuf.length, sha256 });
  }

  @Post() register(@Body() body: any) { return this.service.registerUpload(body); }
  @Get() list(@Query('customerId') customerId?: string) { return this.service.list(customerId); }
  @Get(':id') get(@Param('id') id: string) { return this.service.get(id); }
}
