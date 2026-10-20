import FormRequest from '../../src/requests/FormRequest.js';
import StoreProductRequest from '../../src/requests/StoreProductRequest.js';
import StoreCategoryRequest from '../../src/requests/StoreCategoryRequest.js';

function make(rules, body, user = null) {
    class Request extends FormRequest {
        rules() {
            return rules;
        }
    }
    return new Request({ body, user });
}

describe('FormRequest.validate', () => {
    test('required acusa ausente, nulo e vazio', () => {
        const rules = { a: { required: true }, b: { required: true }, c: { required: true }, d: { required: true } };
        const errors = make(rules, { b: null, c: '', d: 'ok' }).validate();
        expect(errors).toEqual([
            { field: 'a', message: 'obrigatório' },
            { field: 'b', message: 'obrigatório' },
            { field: 'c', message: 'obrigatório' },
        ]);
    });

    test('campo opcional ausente passa sem checar tipo', () => {
        expect(make({ a: { type: 'integer', min: 10 } }, {}).validate()).toEqual([]);
    });

    test('string com min e max conta sem espaços nas pontas', () => {
        const rules = { name: { type: 'string', min: 2, max: 4 } };
        expect(make(rules, { name: ' a ' }).validate()[0].message).toBe('mínimo de 2 caracteres');
        expect(make(rules, { name: 'abcde' }).validate()[0].message).toBe('máximo de 4 caracteres');
        expect(make(rules, { name: 123 }).validate()[0].message).toBe('deve ser texto');
        expect(make(rules, { name: 'abc' }).validate()).toEqual([]);
    });

    test('integer recusa decimal e texto e respeita min e max', () => {
        const rules = { qty: { type: 'integer', min: 1, max: 10 } };
        expect(make(rules, { qty: 1.5 }).validate()[0].message).toBe('deve ser número inteiro');
        expect(make(rules, { qty: '3' }).validate()[0].message).toBe('deve ser número inteiro');
        expect(make(rules, { qty: 0 }).validate()[0].message).toBe('mínimo 1');
        expect(make(rules, { qty: 11 }).validate()[0].message).toBe('máximo 10');
        expect(make(rules, { qty: 10 }).validate()).toEqual([]);
    });

    test('boolean e in', () => {
        expect(make({ on: { type: 'boolean' } }, { on: 'true' }).validate()[0].message).toBe(
            'deve ser verdadeiro ou falso',
        );
        const errors = make({ role: { type: 'string', in: ['buyer', 'seller'] } }, { role: 'admin' }).validate();
        expect(errors[0].message).toBe('deve ser um de: buyer, seller');
    });
});

describe('FormRequest.validated', () => {
    test('devolve só os campos declarados nas regras', () => {
        const request = make({ a: {}, b: {} }, { a: 1, b: 2, c: 3 });
        expect(request.validated()).toEqual({ a: 1, b: 2 });
    });

    test('body que não é objeto vira vazio', () => {
        expect(make({ a: { required: true } }, 'texto').validate()).toHaveLength(1);
    });
});

describe('StoreProductRequest', () => {
    test('autoriza seller e admin, barra buyer e anônimo', () => {
        expect(new StoreProductRequest({ body: {}, user: { role: 'seller' } }).authorize()).toBe(true);
        expect(new StoreProductRequest({ body: {}, user: { role: 'admin' } }).authorize()).toBe(true);
        expect(new StoreProductRequest({ body: {}, user: { role: 'buyer' } }).authorize()).toBe(false);
        expect(new StoreProductRequest({ body: {} }).authorize()).toBe(false);
    });

    test('exige name, categoryId e priceCents', () => {
        const fields = new StoreProductRequest({ body: {} }).validate().map((e) => e.field);
        expect(fields).toEqual(['name', 'categoryId', 'priceCents']);
    });
});

describe('StoreCategoryRequest', () => {
    test('só admin autoriza', () => {
        expect(new StoreCategoryRequest({ body: {}, user: { role: 'admin' } }).authorize()).toBe(true);
        expect(new StoreCategoryRequest({ body: {}, user: { role: 'seller' } }).authorize()).toBe(false);
    });
});
