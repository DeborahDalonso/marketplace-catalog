import FormRequest from './FormRequest.js';

// Serve para criar e para editar: categoria só tem nome
export default class StoreCategoryRequest extends FormRequest {
    authorize() {
        return this.user?.role === 'admin';
    }

    rules() {
        return {
            name: { required: true, type: 'string', min: 2, max: 120 },
        };
    }
}
