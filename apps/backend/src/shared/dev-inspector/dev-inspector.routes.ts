import { Router, type Request, type Response } from 'express';
import { devInspectorHub } from '#shared/dev-inspector/dev-inspector.hub.js';
import { renderDevInspectorHtml } from '#shared/dev-inspector/dev-inspector.ui.js';

export const devInspectorRoutes = Router();

/**
 * GET /api/dev/inspector/logs
 * Bellekteki son HTTP trafik ve stream kayıtlarını JSON olarak döner.
 */
devInspectorRoutes.get('/logs', (_req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    logs: devInspectorHub.getHistory(),
    stats: devInspectorHub.getStats(),
  });
});

/**
 * DELETE /api/dev/inspector/logs
 * Bellekteki log geçmişini temizler.
 */
devInspectorRoutes.delete('/logs', (_req: Request, res: Response): void => {
  devInspectorHub.clearHistory();
  res.status(200).json({
    success: true,
    message: 'Trafik log geçmişi başarıyla temizlendi.',
  });
});

/**
 * GET /api/dev/inspector/events
 * Canlı HTTP istek/yanıt ve LLM stream akışını sağlayan SSE (Server-Sent Events) uç noktası.
 */
devInspectorRoutes.get('/events', (req: Request, res: Response): void => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  // İlk bağlantı onay olayı
  res.write(
    `event: connected\ndata: ${JSON.stringify({
      connected: true,
      timestamp: new Date().toISOString(),
      stats: devInspectorHub.getStats(),
    })}\n\n`,
  );

  devInspectorHub.addSseClient(res);

  // Bağlantıyı canlı tutmak için her 20 saniyede bir ping/heartbeat
  const heartbeatTimer = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch {
      clearInterval(heartbeatTimer);
    }
  }, 20000);

  req.on('close', () => {
    clearInterval(heartbeatTimer);
    devInspectorHub.removeSseClient(res);
  });
});

/**
 * GET /dev/inspector veya /api/dev/inspector/ui
 * Bağımsız test ve izleme web arayüzünü (SPA) sunar.
 */
devInspectorRoutes.get('/ui', (_req: Request, res: Response): void => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(renderDevInspectorHtml());
});

devInspectorRoutes.get('/', (_req: Request, res: Response): void => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(renderDevInspectorHtml());
});
