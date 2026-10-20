import { message } from '../core/messages.js';

// Validação declarativa no estilo do FormRequest do Laravel: o filho declara
// rules() e, se precisar, authorize(); o BaseController chama os dois antes do handler.
export default class FormRequest {
    constructor(req) {
        this.req = req;
        this.body = req.body && typeof req.body === 'object' ? { ...req.body } : {};
        this.params = req.params || {};
        this.query = req.query || {};
        this.user = req.user || null;
    }

    rules() {
        return {};
    }

    authorize() {
        return true;
    }

    /**
     * @returns {Array<{ field: string, message: string }>}
     */
    validate() {
        const errors = [];
        for (const [field, rule] of Object.entries(this.rules())) {
            const error = this.#validateField(this.body[field], rule);
            if (error) errors.push({ field, message: error });
        }
        return errors;
    }

    /**
     * Só os campos declarados em rules(), nada que veio a mais no body.
     */
    validated() {
        const result = {};
        for (const field of Object.keys(this.rules())) {
            if (this.body[field] !== undefined) result[field] = this.body[field];
        }
        return result;
    }

    #validateField(value, rule) {
        const missing = value === undefined || value === null || value === '';
        if (missing) return rule.required ? message('validation.required') : null;

        if (rule.type === 'string') {
            if (typeof value !== 'string') return message('validation.string');
            const length = value.trim().length;
            if (rule.min !== undefined && length < rule.min) return message('validation.min_length', { min: rule.min });
            if (rule.max !== undefined && length > rule.max) return message('validation.max_length', { max: rule.max });
        }

        if (rule.type === 'integer') {
            if (!Number.isInteger(value)) return message('validation.integer');
            if (rule.min !== undefined && value < rule.min) return message('validation.min', { min: rule.min });
            if (rule.max !== undefined && value > rule.max) return message('validation.max', { max: rule.max });
        }

        if (rule.type === 'boolean' && typeof value !== 'boolean') return message('validation.boolean');

        if (Array.isArray(rule.in) && !rule.in.includes(value)) {
            return message('validation.in', { values: rule.in.join(', ') });
        }

        return null;
    }
}
