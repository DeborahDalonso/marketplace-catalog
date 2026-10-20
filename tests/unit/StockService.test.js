import { jest } from '@jest/globals';
import StockService from '../../src/services/StockService.js';
import { fakeLogger, fakeOutboxModel, product } from './fakes.js';

const P1 = product({ id: 'prd_01JTEST0000000000000000001', stock: 5, priceCents: 1000 });
const P2 = product({ id: 'prd_01JTEST0000000000000000002', stock: 1, priceCents: 2000 });

function orderCreated(items, eventId = 'evt_01JTEST0000000000000000001') {
    return { eventId, type: 'order.created', data: { orderId: 'ord_01JTEST0000000000000000001', items } };
}

function build({ claimed = true } = {}) {
    // estoque em memória para o UPDATE condicional ter efeito observável
    const stock = { [P1.id]: P1.stock, [P2.id]: P2.stock };
    const db = {
        transaction: jest.fn(async (work) => work('conn')),
    };
    const productModel = {
        reserveStock: jest.fn(async (id, qty) => {
            if (stock[id] === undefined || stock[id] < qty) return false;
            stock[id] -= qty;
            return true;
        }),
        releaseStock: jest.fn(async (id, qty) => {
            stock[id] += qty;
        }),
        findById: jest.fn(async (id) => {
            if (id === P1.id) return { ...P1, stock: stock[id] };
            if (id === P2.id) return { ...P2, stock: stock[id] };
            return null;
        }),
    };
    const stockReservationModel = {
        addMany: jest.fn(async () => {}),
        findOpenByOrder: jest.fn(async () => [{ productId: P1.id, quantity: 2 }]),
        release: jest.fn(async () => 1),
    };
    const processedEventModel = { claim: jest.fn(async () => claimed) };
    const outboxModel = fakeOutboxModel();
    const service = new StockService(
        db,
        productModel,
        stockReservationModel,
        processedEventModel,
        outboxModel,
        fakeLogger(),
    );
    return { service, stock, productModel, stockReservationModel, processedEventModel, outboxModel };
}

describe('StockService.reserve', () => {
    test('reserva todos os itens, grava a reserva e o stock.reserved com preço', async () => {
        const { service, stock, stockReservationModel, outboxModel } = build();
        const status = await service.reserve(
            orderCreated([
                { productId: P1.id, quantity: 2 },
                { productId: P2.id, quantity: 1 },
            ]),
        );

        expect(status).toBe('reserved');
        expect(stock).toEqual({ [P1.id]: 3, [P2.id]: 0 });
        expect(stockReservationModel.addMany).toHaveBeenCalledWith(
            'ord_01JTEST0000000000000000001',
            expect.arrayContaining([expect.objectContaining({ productId: P1.id, quantity: 2 })]),
            'conn',
        );
        expect(outboxModel.add.mock.calls[0][0]).toMatchObject({
            type: 'stock.reserved',
            aggregateId: 'ord_01JTEST0000000000000000001',
            payload: {
                data: {
                    items: [
                        { productId: P1.id, quantity: 2, priceCents: 1000 },
                        { productId: P2.id, quantity: 1, priceCents: 2000 },
                    ],
                },
            },
        });
    });

    test('um item sem estoque rejeita o pedido inteiro com requested e available', async () => {
        const { service, stockReservationModel, outboxModel } = build();
        const status = await service.reserve(
            orderCreated([
                { productId: P1.id, quantity: 2 },
                { productId: P2.id, quantity: 5 },
            ]),
        );

        expect(status).toBe('rejected');
        expect(stockReservationModel.addMany).not.toHaveBeenCalled();
        expect(outboxModel.add).toHaveBeenCalledTimes(1);
        expect(outboxModel.add.mock.calls[0][0]).toMatchObject({
            type: 'stock.rejected',
            payload: {
                data: { reason: 'insufficient_stock', items: [{ productId: P2.id, requested: 5, available: 1 }] },
            },
        });
    });

    test('produto desconhecido conta como available 0', async () => {
        const { service, outboxModel } = build();
        await service.reserve(orderCreated([{ productId: 'prd_nada', quantity: 1 }]));
        expect(outboxModel.add.mock.calls[0][0].payload.data.items).toEqual([
            { productId: 'prd_nada', requested: 1, available: 0 },
        ]);
    });

    test('evento repetido não mexe no estoque nem no outbox', async () => {
        const { service, productModel, outboxModel } = build({ claimed: false });
        const status = await service.reserve(orderCreated([{ productId: P1.id, quantity: 1 }]));
        expect(status).toBe('duplicate');
        expect(productModel.reserveStock).not.toHaveBeenCalled();
        expect(outboxModel.add).not.toHaveBeenCalled();
    });

    test('erro de banco sobe para o consumer tentar de novo', async () => {
        const { service, productModel } = build();
        productModel.reserveStock.mockRejectedValueOnce(new Error('ECONNRESET'));
        await expect(service.reserve(orderCreated([{ productId: P1.id, quantity: 1 }]))).rejects.toThrow('ECONNRESET');
    });
});

describe('StockService.release', () => {
    const cancelled = {
        eventId: 'evt_01JTEST0000000000000000009',
        type: 'order.cancelled',
        data: { orderId: 'ord_01JTEST0000000000000000001', reason: 'buyer_request' },
    };

    test('devolve ao estoque o que estava reservado e marca a reserva como liberada', async () => {
        const { service, stock, stockReservationModel } = build();
        const status = await service.release(cancelled);
        expect(status).toBe('released');
        expect(stock[P1.id]).toBe(7);
        expect(stockReservationModel.release).toHaveBeenCalledWith(cancelled.data.orderId, 'conn');
    });

    test('pedido sem reserva (rejeitado antes) não altera nada', async () => {
        const { service, stockReservationModel, productModel } = build();
        stockReservationModel.findOpenByOrder.mockResolvedValueOnce([]);
        expect(await service.release(cancelled)).toBe('nothing');
        expect(productModel.releaseStock).not.toHaveBeenCalled();
    });

    test('cancelamento repetido é ignorado', async () => {
        const { service, productModel } = build({ claimed: false });
        expect(await service.release(cancelled)).toBe('duplicate');
        expect(productModel.releaseStock).not.toHaveBeenCalled();
    });
});
