import DomainError from '../core/DomainError.js';

// Todo controller herda daqui. O construtor embrulha cada método de protótipo:
// exceções vão para next(err) e o errorHandler responde; métodos listados em
// `static requests` recebem o FormRequest já autorizado e validado no lugar do req.
// Handlers precisam ser métodos de protótipo (arrow class field não passa aqui).
export default class BaseController {
    constructor() {
        this.#wrapHandlers();
    }

    success(res, data = null, message = null, status = 200) {
        return res.status(status).json({ success: true, message, data });
    }

    #wrapHandlers() {
        const requests = this.constructor.requests || {};
        const proto = Object.getPrototypeOf(this);
        const names = Object.getOwnPropertyNames(proto).filter(
            (name) => name !== 'constructor' && typeof proto[name] === 'function',
        );

        for (const name of names) {
            const original = proto[name].bind(this);
            const RequestClass = requests[name];
            this[name] = async (req, res, next) => {
                try {
                    const input = RequestClass ? this.#buildRequest(RequestClass, req) : req;
                    await original(input, res, next);
                } catch (err) {
                    next(err);
                }
            };
        }
    }

    #buildRequest(RequestClass, req) {
        const request = new RequestClass(req);
        if (!request.authorize()) throw new DomainError('auth.forbidden', 403);
        const errors = request.validate();
        if (errors.length) throw new DomainError('validation.failed', 422, { errors });
        return request;
    }
}
