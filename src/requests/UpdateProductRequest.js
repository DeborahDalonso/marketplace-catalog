import FormRequest from './FormRequest.js';

// Mesmos campos do store, nenhum obrigatório: o service mescla com o produto atual
export default class UpdateProductRequest extends FormRequest {
    authorize() {
        return ['seller', 'admin'].includes(this.user?.role);
    }

    rules() {
        return {
            name: { type: 'string', min: 2, max: 120 },
            categoryId: { type: 'string', min: 30, max: 30 },
            description: { type: 'string', max: 5000 },
            priceCents: { type: 'integer', min: 1 },
            stock: { type: 'integer', min: 0 },
            active: { type: 'boolean' },
        };
    }
}
