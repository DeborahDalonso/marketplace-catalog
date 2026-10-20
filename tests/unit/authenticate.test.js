import { jest } from '@jest/globals';
import { authenticate } from '../../src/middlewares/authenticate.js';

const USER = { sub: 'usr_01JTEST0000000000000000001', role: 'seller' };

function tokenService() {
    return {
        verify: jest.fn(async (token) => {
            if (token === 'valido') return USER;
            throw new Error('assinatura inválida');
        }),
    };
}

async function run(middleware, authorization) {
    const req = { headers: authorization ? { authorization } : {} };
    const next = jest.fn();
    await middleware(req, {}, next);
    return { req, error: next.mock.calls[0][0] };
}

describe('authenticate', () => {
    test('token válido coloca o usuário em req.user', async () => {
        const { req, error } = await run(authenticate(tokenService()), 'Bearer valido');
        expect(error).toBeUndefined();
        expect(req.user).toEqual(USER);
    });

    test('sem header responde 401', async () => {
        const { error } = await run(authenticate(tokenService()), undefined);
        expect(error).toMatchObject({ code: 'auth.required', status: 401 });
    });

    test('scheme diferente de Bearer responde 401', async () => {
        const { error } = await run(authenticate(tokenService()), 'Basic abc');
        expect(error).toMatchObject({ code: 'auth.required', status: 401 });
    });

    test('token inválido responde 401 sem vazar a causa', async () => {
        const { error } = await run(authenticate(tokenService()), 'Bearer podre');
        expect(error).toMatchObject({ code: 'auth.invalid_token', status: 401 });
        expect(error.message).not.toContain('assinatura');
    });

    test('opcional: sem header passa com req.user nulo, mas token inválido ainda barra', async () => {
        const middleware = authenticate(tokenService(), { optional: true });
        const anonymous = await run(middleware, undefined);
        expect(anonymous.error).toBeUndefined();
        expect(anonymous.req.user).toBeNull();

        const invalid = await run(middleware, 'Bearer podre');
        expect(invalid.error).toMatchObject({ code: 'auth.invalid_token' });
    });
});
