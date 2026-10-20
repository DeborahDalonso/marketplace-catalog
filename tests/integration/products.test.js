import request from 'supertest';
import { createTestContext, mysqlAvailable } from './helpers/testContext.js';
import { SEED_SELLER_ID, SEED_CATEGORIES, SEED_PRODUCTS } from '../../src/database/seeds/catalogSeeder.js';

const suite = (await mysqlAvailable()) ? describe : describe.skip;
const CATEGORY_ID = SEED_CATEGORIES[0].id;
const SEED_PRODUCT_ID = SEED_PRODUCTS[0][0];

suite('rotas de produtos', () => {
    let ctx;
    let sellerToken;
    let otherSellerToken;
    let adminToken;
    let buyerToken;

    beforeAll(async () => {
        ctx = await createTestContext();
        sellerToken = await ctx.tokenFor('seller', SEED_SELLER_ID);
        otherSellerToken = await ctx.tokenFor('seller');
        adminToken = await ctx.tokenFor('admin');
        buyerToken = await ctx.tokenFor('buyer');
    });

    afterAll(() => ctx.close());

    const outboxTypes = async () => {
        const [rows] = await ctx.db.query('SELECT type FROM outbox ORDER BY id');
        return rows.map((row) => row.type);
    };

    test('GET /products pagina e filtra por texto e categoria', async () => {
        const all = await request(ctx.app).get('/products?perPage=5&page=2');
        expect(all.status).toBe(200);
        expect(all.body.data).toMatchObject({ page: 2, perPage: 5, total: 12 });
        expect(all.body.data.items).toHaveLength(5);

        const search = await request(ctx.app).get(`/products?q=fone&categoryId=${CATEGORY_ID}`);
        expect(search.body.data.total).toBe(1);
        expect(search.body.data.items[0]).toMatchObject({ name: 'Fone Bluetooth', active: true });
    });

    test('GET /products/:id devolve o produto e 404 para id desconhecido', async () => {
        const found = await request(ctx.app).get(`/products/${SEED_PRODUCT_ID}`);
        expect(found.status).toBe(200);
        expect(found.body.data).toMatchObject({ id: SEED_PRODUCT_ID, priceCents: 19990, stock: 12 });

        const missing = await request(ctx.app).get('/products/prd_00000000000000000000000000');
        expect(missing.status).toBe(404);
        expect(missing.body).toEqual({ success: false, message: 'Produto não encontrado' });
    });

    test('POST /products exige token, barra buyer e valida o body com 422', async () => {
        expect((await request(ctx.app).post('/products').send({})).status).toBe(401);

        const buyer = await request(ctx.app).post('/products').set('Authorization', `Bearer ${buyerToken}`).send({});
        expect(buyer.status).toBe(403);

        const invalid = await request(ctx.app)
            .post('/products')
            .set('Authorization', `Bearer ${sellerToken}`)
            .send({ name: 'x', priceCents: '10' });
        expect(invalid.status).toBe(422);
        expect(invalid.body.success).toBe(false);
        expect(invalid.body.errors).toEqual([
            { field: 'name', message: 'mínimo de 2 caracteres' },
            { field: 'categoryId', message: 'obrigatório' },
            { field: 'priceCents', message: 'deve ser número inteiro' },
        ]);
    });

    test('ciclo do vendedor: cria, edita, outro vendedor não mexe, admin pode, remove', async () => {
        const created = await request(ctx.app)
            .post('/products')
            .set('Authorization', `Bearer ${sellerToken}`)
            .send({ name: 'Caixa de Som', categoryId: CATEGORY_ID, priceCents: 15000, stock: 4 });
        expect(created.status).toBe(201);
        expect(created.body.data).toMatchObject({ sellerId: SEED_SELLER_ID, slug: 'caixa-de-som', active: true });
        const id = created.body.data.id;

        const updated = await request(ctx.app)
            .put(`/products/${id}`)
            .set('Authorization', `Bearer ${sellerToken}`)
            .send({ priceCents: 14000 });
        expect(updated.status).toBe(200);
        expect(updated.body.data).toMatchObject({ priceCents: 14000, name: 'Caixa de Som', stock: 4 });

        const forbidden = await request(ctx.app)
            .put(`/products/${id}`)
            .set('Authorization', `Bearer ${otherSellerToken}`)
            .send({ priceCents: 1 });
        expect(forbidden.status).toBe(403);

        const byAdmin = await request(ctx.app)
            .put(`/products/${id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ stock: 9 });
        expect(byAdmin.status).toBe(200);

        const deleted = await request(ctx.app).delete(`/products/${id}`).set('Authorization', `Bearer ${sellerToken}`);
        expect(deleted.status).toBe(200);

        const hidden = await request(ctx.app).get('/products?q=caixa');
        expect(hidden.body.data.total).toBe(0);
        const inactive = await request(ctx.app).get('/products?q=caixa&active=false');
        expect(inactive.body.data.items[0]).toMatchObject({ id, active: false });

        const again = await request(ctx.app).delete(`/products/${id}`).set('Authorization', `Bearer ${sellerToken}`);
        expect(again.status).toBe(409);

        expect(await outboxTypes()).toEqual([
            'product.created',
            'product.updated',
            'product.updated',
            'product.deleted',
        ]);
    });

    test('POST /products/:id/views aceita anônimo e autenticado e emite product.viewed', async () => {
        const anonymous = await request(ctx.app).post(`/products/${SEED_PRODUCT_ID}/views`);
        expect(anonymous.status).toBe(201);

        const logged = await request(ctx.app)
            .post(`/products/${SEED_PRODUCT_ID}/views`)
            .set('Authorization', `Bearer ${buyerToken}`);
        expect(logged.status).toBe(201);

        const [views] = await ctx.db.query('SELECT user_id FROM product_views ORDER BY id');
        expect(views.map((row) => row.user_id)).toEqual([null, expect.stringMatching(/^usr_BUYER/)]);
        expect((await outboxTypes()).filter((type) => type === 'product.viewed')).toHaveLength(2);
    });

    test('token forjado com outra chave responde 401', async () => {
        const forged = `${sellerToken.slice(0, -5)}AAAAA`;
        const response = await request(ctx.app)
            .delete(`/products/${SEED_PRODUCT_ID}`)
            .set('Authorization', `Bearer ${forged}`);
        expect(response.status).toBe(401);
        expect(response.body.message).toBe('Token inválido ou expirado');
    });
});
