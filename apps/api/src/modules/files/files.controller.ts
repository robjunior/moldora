import { BadRequestException, Body, Controller, Get, Param, Post, Query, Req, Res, StreamableFile } from '@nestjs/common';
import { Response } from 'express';
import { FilesService } from './files.service';
import { StorageService } from '../storage/storage.service';
import { createHash } from 'crypto';

const ALLOWED = ['stl', '3mf', 'obj', 'vox'];

function validateFileContent(ext: string, buf: Buffer) {
  if (!buf.length) throw new BadRequestException('Uploaded file is empty');
  if (ext === '3mf') {
    if (!(buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04)) {
      throw new BadRequestException('Invalid 3MF content (expected ZIP container)');
    }
    return;
  }
  if (ext === 'vox') {
    const sig = buf.subarray(0, 4).toString('ascii');
    if (sig !== 'VOX ') throw new BadRequestException('Invalid VOX content (missing VOX signature)');
    return;
  }
  if (ext === 'stl') {
    const head = buf.subarray(0, Math.min(buf.length, 256)).toString('utf8');
    const asciiLike = /^\s*solid\b/i.test(head) && /\bfacet\b/i.test(head) && /\bendsolid\b/i.test(buf.subarray(Math.max(0, buf.length - 256)).toString('utf8'));
    if (asciiLike) return;
    if (buf.length >= 84) {
      const tri = buf.readUInt32LE(80);
      const expected = 84 + tri * 50;
      if (expected === buf.length || tri > 0) return;
    }
    if (/^\s*solid\b/i.test(head)) return; // permissive ASCII header
    throw new BadRequestException('Invalid STL content');
  }
  if (ext === 'obj') {
    const sample = buf.subarray(0, Math.min(buf.length, 512));
    if (sample.includes(0)) throw new BadRequestException('Invalid OBJ content (binary data detected)');
    return;
  }
}

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
      const sep = part.indexOf('\r\n\r\n');
      if (sep === -1) continue;
      const rawHeaders = part.slice(0, sep);
      const content = part.slice(sep + 4);
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
    validateFileContent(ext, fileBuf);
    const sha256 = createHash('sha256').update(fileBuf).digest('hex');
    const saved = await this.storage.saveBuffer(originalName, fileBuf);
    return this.service.registerUpload({ customerId, originalName, storageKey: saved.storageKey, format: ext.toUpperCase(), sizeBytes: fileBuf.length, sha256 });
  }

  @Post() register(@Body() body: any) { return this.service.registerUpload(body); }
  @Get() list(@Query('customerId') customerId?: string) { return this.service.list(customerId); }
  @Get(':id') get(@Param('id') id: string) { return this.service.get(id); }

  @Get(':id/content')
  async content(@Param('id') id: string, @Query('download') download: string, @Res({ passthrough: true }) res: Response) {
    const file = await this.service.get(id);
    const { stream } = await this.storage.openReadStream(file.storageKey);
    const mime: Record<string, string> = {
      STL: 'model/stl',
      OBJ: 'model/obj',
      '3MF': 'model/3mf',
      VOX: 'application/octet-stream',
    };
    const safeName = (file.originalName || 'file').replace(/[\r\n"]/g, '');
    const disposition = download === '1' || download === 'true' ? 'attachment' : 'inline';
    res.set({
      'Content-Type': mime[file.format] || 'application/octet-stream',
      'Content-Disposition': `${disposition}; filename="${safeName}"`,
    });
    return new StreamableFile(stream);
  }
}
