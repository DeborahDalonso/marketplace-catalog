// Erro de regra de negócio: o service lança com código e status e o
// errorHandler responde o HTTP. Erro sem essa forma vira 500 genérico.
export default class DomainError extends Error {
    constructor(code, status = 400, params = {}) {
        super(code);
        this.name = 'DomainError';
        this.code = code;
        this.status = status;
        this.params = params;
    }
}
