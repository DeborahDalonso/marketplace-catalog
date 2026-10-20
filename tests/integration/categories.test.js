import request from 'supertest';
import { createTestContext, mysqlAvailable } from './helpers/testContext.js';
import { SEED_CATEGORIES } from '../../src/database/seeds/catalogSeeder.js';

const suite = (await mysqlAvailable()) ? describe : describe.skip;

suite('rotas de categorias', () => {
    let ctx;
    let adminToken;
    let sellerToken;

    beforeAll(async () => {
        ctx = await createTestContext();
        adminToken = await ctx.tokenFor('admin');
        sellerToken = await ctx.tokenFor('seller');
    });

    afterAll(() => ctx.close());

    test('GET /categories é público e vem em ordem alfabética', async () => {
        const response = await request(ctx.app).get('/categories');
        expect(response.status).toBe(200);
        expect(response.body.data.map((c) => c.name)).toEqual([
            'Casa e Cozinha',
            'Eletrônicos',
            'Esporte e Lazer',
            'Livros',
        ]);
    });

    test('escrita é só de admin', async () => {
        const anonymous = await request(ctx.app).post('/categories').send({ name: 'Nova' });
        expect(anonymous.status).toBe(401);

        const seller = await request(ctx.app)
            .post('/categories')
            .set('Authorization', `Bearer ${sellerToken}`)
            .send({ name: 'Nova' });
        expect(seller.status).toBe(403);

        const sellerDelete = await request(ctx.app)
            .delete(`/categories/${SEED_CATEGORIES[0].id}`)
            .set('Authorization', `Bearer ${sellerToken}`);
        expect(sellerDelete.status).toBe(403);
    });

    test('admin cria, não repete slug, edita e remove quando vazia', async () => {
        const created = await request(ctx.app)
            .post('/categories')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ name: 'Jardinagem' });
        expect(created.status).toBe(201);
        expect(created.body.data).toMatchObject({ name: 'Jardinagem', slug: 'jardinagem' });

        const duplicate = await request(ctx.app)
            .post('/categories')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ name: 'JARDINAGEM' });
        expect(duplicate.status).toBe(409);
        expect(duplicate.body.message).toBe('Já existe uma categoria com o nome "JARDINAGEM"');

        const updated = await request(ctx.app)
            .put(`/categories/${created.body.data.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ name: 'Jardim e Piscina' });
        expect(updated.status).toBe(200);
        expect(updated.body.data.slug).toBe('jardim-e-piscina');

        const deleted = await request(ctx.app)
            .delete(`/categories/${created.body.data.id}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(deleted.status).toBe(200);
    });

    test('categoria com produtos não sai (409)', async () => {
        const response = await request(ctx.app)
            .delete(`/categories/${SEED_CATEGORIES[0].id}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(response.status).toBe(409);
        expect(response.body.message).toBe('Categoria tem 3 produto(s) e não pode ser removida');
    });
});
