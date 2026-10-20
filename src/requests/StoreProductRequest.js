import FormRequest from './FormRequest.js';

export default class StoreProductRequest extends FormRequest {
    authorize() {
        return ['seller', 'admin'].includes(this.user?.role);
    }

    rules() {
        return {
            name: { required: true, type: 'string', min: 2, max: 120 },
            categoryId: { required: true, type: 'string', min: 30, max: 30 },
            description: { type: 'string', max: 5000 },
            priceCents: { required: true, type: 'integer', min: 1 },
            stock: { type: 'integer', min: 0 },
            active: { type: 'boolean' },
        };
    }
}
