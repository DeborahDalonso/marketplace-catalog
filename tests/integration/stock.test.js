import { createTestContext, mysqlAvailable } from './helpers/testContext.js';
import { SEED_PRODUCTS } from '../../src/database/seeds/catalogSeeder.js';

const suite = (await mysqlAvailable()) ? describe : describe.skip;

// Jogo de panelas: estoque 6 no seed
const PRODUCT_ID = SEED_PRODUCTS[4][0];
let counter = 0;

function orderCreated(orderId, items) {
    counter++;
    return {
        eventId: `evt_${String(counter).padStart(26, '0')}`,
        type: 'order.created',
        version: 1,
        occurredAt: new Date().toISOString(),
        producer: 'marketplace-orders',
        data: { orderId, buyerId: 'usr_BUYER00000000000000000000', items, totalCents: 0 },
    };
}

function orderCancelled(orderId) {
    counter++;
    return {
        eventId: `evt_${String(counter).padStart(26, '0')}`,
        type: 'order.cancelled',
        version: 1,
        occurredAt: new Date().toISOString(),
        producer: 'marketplace-orders',
        data: { orderId, buyerId: 'usr_BUYER00000000000000000000', reason: 'buyer_request' },
    };
}

suite('reserva de estoque por evento', () => {
    let ctx;
    let stockService;
    let consumer;

    beforeAll(async () => {
        ctx = await createTestContext();
        stockService = ctx.container.getStockService();
        consumer = ctx.container.getEventConsumer();
    });

    afterAll(() => ctx.close());

    const stockOf = async (id) => {
        const [[row]] = await ctx.db.query('SELECT stock FROM products WHERE id = ?', [id]);
        return row.stock;
    };

    const outboxFor = async (orderId) => {
        const [rows] = await ctx.db.query('SELECT type, payload FROM outbox WHERE aggregate_id = ? ORDER BY id', [
            orderId,
        ]);
        return rows.map((row) => ({ type: row.type, data: row.payload.data }));
    };

    test('dois pedidos concorrentes pelo mesmo produto: só um reserva', async () => {
        const orderA = 'ord_A0000000000000000000000001';
        const orderB = 'ord_B0000000000000000000000001';
        const [a, b] = await Promise.all([
            stockService.reserve(orderCreated(orderA, [{ productId: PRODUCT_ID, quantity: 4 }])),
            stockService.reserve(orderCreated(orderB, [{ productId: PRODUCT_ID, quantity: 4 }])),
        ]);

        expect([a, b].sort()).toEqual(['rejected', 'reserved']);
        expect(await stockOf(PRODUCT_ID)).toBe(2);

        const [reservations] = await ctx.db.query('SELECT order_id, quantity, released FROM stock_reservations');
        expect(reservations).toHaveLength(1);
        expect(reservations[0]).toMatchObject({ quantity: 4, released: 0 });

        const winner = a === 'reserved' ? orderA : orderB;
        const loser = a === 'reserved' ? orderB : orderA;
        expect(await outboxFor(winner)).toEqual([
            {
                type: 'stock.reserved',
                data: { orderId: winner, items: [{ productId: PRODUCT_ID, quantity: 4, priceCents: 25900 }] },
            },
        ]);
        expect(await outboxFor(loser)).toEqual([
            {
                type: 'stock.rejected',
                data: {
                    orderId: loser,
                    reason: 'insufficient_stock',
                    items: [{ productId: PRODUCT_ID, requested: 4, available: 2 }],
                },
            },
        ]);
    });

    test('pedido com um item sem estoque não reserva nenhum dos outros', async () => {
        const otherId = SEED_PRODUCTS[0][0];
        const before = await stockOf(otherId);
        const status = await stockService.reserve(
            orderCreated('ord_C0000000000000000000000001', [
                { productId: otherId, quantity: 1 },
                { productId: PRODUCT_ID, quantity: 3 },
            ]),
        );
        expect(status).toBe('rejected');
        expect(await stockOf(otherId)).toBe(before);
    });

    test('mesmo eventId chegando de novo é ignorado', async () => {
        const event = orderCreated('ord_D0000000000000000000000001', [{ productId: PRODUCT_ID, quantity: 1 }]);
        expect(await stockService.reserve(event)).toBe('reserved');
        expect(await stockService.reserve(event)).toBe('duplicate');
        expect(await stockOf(PRODUCT_ID)).toBe(1);
    });

    test('order.cancelled pelo consumer devolve o que foi reservado', async () => {
        const raw = Buffer.from(JSON.stringify(orderCancelled('ord_D0000000000000000000000001')));
        await consumer.handle('order.cancelled', raw);
        expect(await stockOf(PRODUCT_ID)).toBe(2);

        const [[row]] = await ctx.db.query('SELECT released FROM stock_reservations WHERE order_id = ?', [
            'ord_D0000000000000000000000001',
        ]);
        expect(row.released).toBe(1);
    });

    test('consumer descarta mensagem que não é JSON sem lançar', async () => {
        await expect(consumer.handle('order.created', Buffer.from('{quebrado'))).resolves.toBeUndefined();
    });
});
