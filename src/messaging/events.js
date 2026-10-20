import { newId } from '../helpers/idHelper.js';

export const PRODUCER = 'marketplace-catalog';

// Envelope do CONTRATOS, seção 4.1. O retorno já tem a forma que o OutboxModel grava:
// o worker publica `payload` como está, com `aggregateId` de chave de partição.
export function createEvent(type, aggregateId, data) {
    const eventId = newId('evt');
    return {
        eventId,
        type,
        aggregateId,
        payload: {
            eventId,
            type,
            version: 1,
            occurredAt: new Date().toISOString(),
            producer: PRODUCER,
            data,
        },
    };
}

export function productEventData(product) {
    return {
        productId: product.id,
        sellerId: product.sellerId,
        categoryId: product.categoryId,
        name: product.name,
        priceCents: product.priceCents,
        stock: product.stock,
        active: product.active,
    };
}
