import { jest } from '@jest/globals';
import ProductService from '../../src/services/ProductService.js';
import { fakeDb, fakeLogger, fakeOutboxModel, product, SELLER, OTHER_SELLER, ADMIN } from './fakes.js';

function build({ existing = product() } = {}) {
    const productModel = {
        findAll: jest.fn(async () => ({ items: [existing], total: 1 })),
        findById: jest.fn(async (id) => (existing && id === existing.id ? existing : null)),
        create: jest.fn(async (data) => product(data)),
        update: jest.fn(async (id, data) => product({ ...data, id })),
        softDelete: jest.fn(async () => true),
    };
    const categoryModel = { findById: jest.fn(async (id) => (id.startsWith('cat_') ? { id } : null)) };
    const productViewModel = { add: jest.fn(async () => {}) };
    const outboxModel = fakeOutboxModel();
    const service = new ProductService(
        fakeDb(),
        productModel,
        categoryModel,
        productViewModel,
        outboxModel,
        fakeLogger(),
    );
    return { service, productModel, categoryModel, productViewModel, outboxModel };
}

describe('ProductService.list', () => {
    test('aplica paginação com limites e filtra só ativos por padrão', async () => {
        const { service, productModel } = build();
        const result = await service.list({ page: '0', perPage: '500', q: ' fone ' });
        expect(productModel.findAll).toHaveBeenCalledWith(
            expect.objectContaining({ page: 1, perPage: 100, q: 'fone', active: true }),
        );
        expect(result).toEqual({ items: [product()], page: 1, perPage: 100, total: 1 });
    });

    test('active=false lista os removidos', async () => {
        const { service, productModel } = build();
        await service.list({ active: 'false' });
        expect(productModel.findAll.mock.calls[0][0].active).toBe(false);
    });
});

describe('ProductService.get', () => {
    test('lança product.not_found 404 quando não existe', async () => {
        const { service } = build();
        await expect(service.get('prd_nada')).rejects.toMatchObject({ code: 'product.not_found', status: 404 });
    });
});

describe('ProductService.create', () => {
    test('grava o produto com o seller do token e o product.created no outbox na mesma transação', async () => {
        const { service, productModel, outboxModel } = build();
        const created = await service.create(
            { name: 'Teclado Mecânico', categoryId: 'cat_01JTEST0000000000000000001', priceCents: 34990 },
            SELLER,
        );

        expect(productModel.create).toHaveBeenCalledWith(
            expect.objectContaining({ sellerId: SELLER.sub, slug: 'teclado-mecanico', stock: 0, active: true }),
            'conn',
        );
        expect(created.id).toMatch(/^prd_[0-9A-Z]{26}$/);
        expect(outboxModel.add).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'product.created', aggregateId: created.id }),
            'conn',
        );
        expect(outboxModel.add.mock.calls[0][0].payload.data).toMatchObject({
            productId: created.id,
            sellerId: SELLER.sub,
        });
    });

    test('rejeita categoria inexistente com 422', async () => {
        const { service, outboxModel } = build();
        await expect(service.create({ name: 'X', categoryId: 'xxx', priceCents: 1 }, SELLER)).rejects.toMatchObject({
            code: 'product.category_not_found',
            status: 422,
        });
        expect(outboxModel.add).not.toHaveBeenCalled();
    });
});

describe('ProductService.update', () => {
    test('mescla com o atual, recalcula o slug e emite product.updated', async () => {
        const { service, productModel, outboxModel } = build();
        const updated = await service.update(product().id, { name: 'Fone Novo', stock: 3 }, SELLER);

        expect(productModel.update).toHaveBeenCalledWith(
            product().id,
            expect.objectContaining({ name: 'Fone Novo', slug: 'fone-novo', stock: 3, priceCents: 19990 }),
            'conn',
        );
        expect(updated.name).toBe('Fone Novo');
        expect(outboxModel.add.mock.calls[0][0].type).toBe('product.updated');
    });

    test('outro vendedor recebe 403 e admin passa', async () => {
        const { service } = build();
        await expect(service.update(product().id, { name: 'Y' }, OTHER_SELLER)).rejects.toMatchObject({
            code: 'product.forbidden',
            status: 403,
        });
        await expect(service.update(product().id, { name: 'Y' }, ADMIN)).resolves.toBeDefined();
    });
});

describe('ProductService.delete', () => {
    test('faz soft delete e emite product.deleted', async () => {
        const { service, productModel, outboxModel } = build();
        await service.delete(product().id, SELLER);
        expect(productModel.softDelete).toHaveBeenCalledWith(product().id, 'conn');
        expect(outboxModel.add.mock.calls[0][0]).toMatchObject({
            type: 'product.deleted',
            payload: { data: { productId: product().id, sellerId: SELLER.sub } },
        });
    });

    test('produto já inativo responde 409', async () => {
        const { service } = build({ existing: product({ active: false }) });
        await expect(service.delete(product().id, SELLER)).rejects.toMatchObject({
            code: 'product.already_deleted',
            status: 409,
        });
    });
});

describe('ProductService.registerView', () => {
    test('grava a visualização e o product.viewed com userId nulo para anônimo', async () => {
        const { service, productViewModel, outboxModel } = build();
        await service.registerView(product().id);
        expect(productViewModel.add).toHaveBeenCalledWith(product().id, null, 'conn');
        expect(outboxModel.add.mock.calls[0][0].payload.data).toEqual({ productId: product().id, userId: null });
    });
});
