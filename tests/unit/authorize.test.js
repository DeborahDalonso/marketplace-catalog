import { jest } from '@jest/globals';
import { authorize } from '../../src/middlewares/authorize.js';

function run(middleware, user) {
    const next = jest.fn();
    middleware({ user }, {}, next);
    return next.mock.calls[0][0];
}

describe('authorize', () => {
    test('sem usuário responde 401', () => {
        expect(run(authorize('admin'), null)).toMatchObject({ code: 'auth.required', status: 401 });
    });

    test('role fora da lista responde 403', () => {
        expect(run(authorize('admin'), { role: 'seller' })).toMatchObject({ code: 'auth.forbidden', status: 403 });
    });

    test('role na lista segue sem erro', () => {
        expect(run(authorize('seller', 'admin'), { role: 'seller' })).toBeUndefined();
        expect(run(authorize('seller', 'admin'), { role: 'admin' })).toBeUndefined();
    });
});
