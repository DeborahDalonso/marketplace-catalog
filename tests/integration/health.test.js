import request from 'supertest';
import { createTestContext, mysqlAvailable } from './helpers/testContext.js';

const suite = (await mysqlAvailable()) ? describe : describe.skip;

suite('GET /health', () => {
    let ctx;

    beforeAll(async () => {
        ctx = await createTestContext();
    });

    afterAll(() => ctx.close());

    test('responde o relatório do CONTRATOS com mysql e kafka ok', async () => {
        const response = await request(ctx.app).get('/health');
        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            success: true,
            message: null,
            data: { service: 'marketplace-catalog', version: '1.0.0', mysql: 'ok', kafka: 'ok' },
        });
    });

    test('rota desconhecida responde 404 no envelope', async () => {
        const response = await request(ctx.app).get('/nada');
        expect(response.status).toBe(404);
        expect(response.body).toEqual({ success: false, message: 'Rota não encontrada' });
    });
});
