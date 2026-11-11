import { Injectable, NotFoundException } from '@nestjs/common';
import { promises as fs, createReadStream } from 'fs';
import { join, dirname } from 'path';
import { randomUUID } from 'crypto';

@Injectable()
export class StorageService {
  private baseDir = process.env.LOCAL_STORAGE_DIR || join(process.cwd(), '..', '..', 'storage', 'uploads');

  async saveBuffer(originalName: string, buffer: Buffer): Promise<{ storageKey: string; path: string }> {
    const safe = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `${new Date().toISOString().slice(0,10)}/${randomUUID()}-${safe}`;
    const full = join(this.baseDir, key);
    await fs.mkdir(dirname(full), { recursive: true });
    await fs.writeFile(full, buffer);
    return { storageKey: key, path: full };
  }

  getPath(storageKey: string) { return join(this.baseDir, storageKey); }

  async openReadStream(storageKey: string) {
    const path = this.getPath(storageKey);
    try { await fs.access(path); } catch { throw new NotFoundException('Stored file not found'); }
    return { path, stream: createReadStream(path) };
  }
}
