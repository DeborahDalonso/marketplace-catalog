import { slugify } from '../../src/helpers/slugHelper.js';

describe('slugify', () => {
    test('remove acento, baixa a caixa e troca o resto por hífen', () => {
        expect(slugify('Eletrônicos e Áudio')).toBe('eletronicos-e-audio');
        expect(slugify('  Fone   Bluetooth!! ')).toBe('fone-bluetooth');
        expect(slugify('Ç ã Õ')).toBe('c-a-o');
    });

    test('não deixa hífen nas pontas', () => {
        expect(slugify('--a--')).toBe('a');
    });
});
