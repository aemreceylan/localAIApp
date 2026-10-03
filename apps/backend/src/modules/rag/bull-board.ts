/**
 * @file bull-board.ts
 * @description BullMQ Kuyruk Yönetim Paneli (Bull-Board Express Entegrasyonu).
 * Admin ve sistem yöneticilerinin kuyruktaki işleri canlı olarak izlemesini,
 * hatalı işleri yeniden denemesini (retry), temizlemesini ve kuyruk metriklerini
 * web arayüzünden görüntülemesini sağlar.
 *
 * Mimari Rol & Güvenlik:
 * - Enterprise RBAC: Bull-board router'ı doğrudan açık olamaz; `authenticate` ve
 *   `requireRole(['admin', 'superadmin'])` güvenlik katmanlarıyla korunur.
 * - Observable Queue: Geciken, bekleyen, aktif ve başarısız işlerin görselleştirilmesi.
 *
 * @example
 * ```typescript
 * import { bullBoardRouter } from '#modules/rag/bull-board.js';
 *
 * app.use('/admin/queues', authenticate, requireRole(['admin', 'superadmin']), bullBoardRouter);
 * ```
 */

import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { ragQueue } from './rag.queue.js';

export const bullBoardServerAdapter = new ExpressAdapter();
bullBoardServerAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [new BullMQAdapter(ragQueue.getQueue())],
  serverAdapter: bullBoardServerAdapter,
});

export const bullBoardRouter = bullBoardServerAdapter.getRouter();
