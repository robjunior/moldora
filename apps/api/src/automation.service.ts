import { Injectable } from '@nestjs/common';

@Injectable()
export class AutomationService {
  async emit(type: string, payload: Record<string, unknown>): Promise<void> {
    const baseUrl = process.env.N8N_BASE_URL;
    if (!baseUrl) return;

    const path = process.env.N8N_EVENTS_WEBHOOK_PATH || '/webhook/print3d-events';
    const timeoutMs = Number(process.env.N8N_WEBHOOK_TIMEOUT_MS || 2000);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const url = new URL(path, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-print3d-webhook-secret': process.env.N8N_WEBHOOK_SECRET || '',
        },
        body: JSON.stringify({ type, occurredAt: new Date().toISOString(), payload }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`n8n webhook returned ${response.status}`);
    } catch (error) {
      console.error(`[automation] failed to emit ${type}:`, error instanceof Error ? error.message : error);
    } finally {
      clearTimeout(timeout);
    }
  }
}
