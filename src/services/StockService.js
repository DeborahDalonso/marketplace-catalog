import { createEvent } from '../messaging/events.js';

// Reserva e devolução de estoque disparadas por eventos do serviço de pedidos.
// Idempotência: processed_events.claim dentro da mesma transação da mudança;
// se a transação desfaz, o claim desfaz junto e a repetição do evento é tratada de novo.
export default class StockService {
    constructor(db, productModel, stockReservationModel, processedEventModel, outboxModel, logger) {
        this.db = db;
        this.productModel = productModel;
        this.stockReservationModel = stockReservationModel;
        this.processedEventModel = processedEventModel;
        this.outboxModel = outboxModel;
        this.logger = logger;
    }

    /**
     * order.created: tudo ou nada. Reserva cada item com UPDATE condicional;
     * se algum falhar, desfaz as reservas e grava stock.rejected.
     * @returns {'reserved'|'rejected'|'duplicate'}
     */
    async reserve(event) {
        const { orderId, items } = event.data;
        let status;

        try {
            status = await this.db.transaction((conn) => this.#reserveAll(event, orderId, items, conn));
        } catch (err) {
            if (!(err instanceof StockRejected)) throw err;
            // o throw desfez as reservas parciais; o stock.rejected vai numa transação própria
            await this.#reject(event, orderId, err.items);
            status = 'rejected';
        }

        this.logger.info(`pedido ${orderId}: ${status}`);
        return status;
    }

    async #reserveAll(event, orderId, items, conn) {
        const claimed = await this.processedEventModel.claim(event.eventId, event.type, conn);
        if (!claimed) return 'duplicate';

        const reserved = [];
        const rejected = [];
        for (const item of items) {
            const ok = await this.productModel.reserveStock(item.productId, item.quantity, conn);
            const product = await this.productModel.findById(item.productId, conn);
            if (ok) {
                reserved.push({ productId: item.productId, quantity: item.quantity, priceCents: product.priceCents });
            } else {
                const available = product && product.active ? product.stock : 0;
                rejected.push({ productId: item.productId, requested: item.quantity, available });
            }
        }
        if (rejected.length) throw new StockRejected(rejected);

        await this.stockReservationModel.addMany(orderId, reserved, conn);
        await this.outboxModel.add(createEvent('stock.reserved', orderId, { orderId, items: reserved }), conn);
        return 'reserved';
    }

    /**
     * order.cancelled: devolve ao estoque o que foi reservado para o pedido.
     * @returns {'released'|'nothing'|'duplicate'}
     */
    async release(event) {
        const { orderId } = event.data;

        const status = await this.db.transaction(async (conn) => {
            const claimed = await this.processedEventModel.claim(event.eventId, event.type, conn);
            if (!claimed) return 'duplicate';

            const reservations = await this.stockReservationModel.findOpenByOrder(orderId, conn);
            if (!reservations.length) return 'nothing';

            for (const item of reservations) {
                await this.productModel.releaseStock(item.productId, item.quantity, conn);
            }
            await this.stockReservationModel.release(orderId, conn);
            return 'released';
        });

        this.logger.info(`pedido ${orderId} cancelado: ${status}`);
        return status;
    }

    async #reject(event, orderId, items) {
        await this.db.transaction(async (conn) => {
            const claimed = await this.processedEventModel.claim(event.eventId, event.type, conn);
            if (!claimed) return;
            const data = { orderId, reason: 'insufficient_stock', items };
            await this.outboxModel.add(createEvent('stock.rejected', orderId, data), conn);
        });
    }
}

class StockRejected extends Error {
    constructor(items) {
        super('stock.rejected');
        this.items = items;
    }
}
