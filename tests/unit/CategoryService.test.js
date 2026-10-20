import { jest } from '@jest/globals';
import CategoryService from '../../src/services/CategoryService.js';
import { fakeLogger } from './fakes.js';

const LIVROS = { id: 'cat_01JTEST0000000000000000003', name: 'Livros', slug: 'livros', createdAt: null };

function build({ productCount = 0 } = {}) {
    const categoryModel = {
        findAll: jest.fn(async () => [LIVROS]),
        findById: jest.fn(async (id) => (id === LIVROS.id ? LIVROS : null)),
        findBySlug: jest.fn(async (slug) => (slug === LIVROS.slug ? LIVROS : null)),
        create: jest.fn(async (data) => ({ ...data, createdAt: null })),
        update: jest.fn(async (id, data) => ({ id, ...data, createdAt: null })),
        delete: jest.fn(async () => true),
    };
    const productModel = { countByCategory: jest.fn(async () => productCount) };
    return { service: new CategoryService(categoryModel, productModel, fakeLogger()), categoryModel, productModel };
}

describe('CategoryService.create', () => {
    test('gera id com prefixo cat_ e slug sem acento', async () => {
        const { service, categoryModel } = build();
        const created = await service.create({ name: 'Eletrônicos e Áudio' });
        expect(created.id).toMatch(/^cat_[0-9A-Z]{26}$/);
        expect(created.slug).toBe('eletronicos-e-audio');
        expect(categoryModel.create).toHaveBeenCalledTimes(1);
    });

    test('nome que gera slug repetido responde 409 com o nome na mensagem', async () => {
        const { service } = build();
        await expect(service.create({ name: 'LIVROS' })).rejects.toMatchObject({
            code: 'category.slug_exists',
            status: 409,
            params: { name: 'LIVROS' },
        });
    });
});

describe('CategoryService.update', () => {
    test('renomear mantendo o mesmo slug não consulta duplicidade', async () => {
        const { service, categoryModel } = build();
        await service.update(LIVROS.id, { name: 'Livros' });
        expect(categoryModel.findBySlug).not.toHaveBeenCalled();
        expect(categoryModel.update).toHaveBeenCalledWith(LIVROS.id, { name: 'Livros', slug: 'livros' });
    });

    test('categoria inexistente responde 404', async () => {
        const { service } = build();
        await expect(service.update('cat_nada', { name: 'X' })).rejects.toMatchObject({
            code: 'category.not_found',
            status: 404,
        });
    });
});

describe('CategoryService.delete', () => {
    test('remove quando não há produto vinculado', async () => {
        const { service, categoryModel } = build();
        await service.delete(LIVROS.id);
        expect(categoryModel.delete).toHaveBeenCalledWith(LIVROS.id);
    });

    test('com produtos vinculados responde 409 informando a quantidade', async () => {
        const { service, categoryModel } = build({ productCount: 3 });
        await expect(service.delete(LIVROS.id)).rejects.toMatchObject({
            code: 'category.has_products',
            status: 409,
            params: { count: 3 },
        });
        expect(categoryModel.delete).not.toHaveBeenCalled();
    });
});
