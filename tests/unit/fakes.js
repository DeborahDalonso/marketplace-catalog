import { jest } from '@jest/globals';
// Dublês compartilhados pelos testes unitários: objeto literal + jest.fn(), sem jest.mock de módulo

export function fakeDb() {
    // a transação só repassa um marcador de conexão; o que importa é que os models recebam o mesmo `conn`
    return { transaction: jest.fn(async (work) => work('conn')) };
}

export function fakeLogger() {
    return { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
}

export function fakeOutboxModel() {
    return { add: jest.fn(async () => {}) };
}

export function product(overrides = {}) {
    return {
        id: 'prd_01JTEST0000000000000000001',
        sellerId: 'usr_01JTEST0000000000000000001',
        categoryId: 'cat_01JTEST0000000000000000001',
        name: 'Fone Bluetooth',
        slug: 'fone-bluetooth',
        description: null,
        priceCents: 19990,
        stock: 12,
        active: true,
        createdAt: '2026-10-20 10:00:00',
        updatedAt: '2026-10-20 10:00:00',
        ...overrides,
    };
}

export const SELLER = { sub: 'usr_01JTEST0000000000000000001', role: 'seller' };
export const OTHER_SELLER = { sub: 'usr_01JTEST0000000000000000002', role: 'seller' };
export const ADMIN = { sub: 'usr_01JTEST00000000000000ADMIN', role: 'admin' };
