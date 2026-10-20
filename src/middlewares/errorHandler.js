import DomainError from '../core/DomainError.js';
import { message } from '../core/messages.js';

// Único lugar que transforma exceção em resposta HTTP. Erro de domínio devolve
// o próprio status e mensagem; qualquer outro vira 500 genérico e vai para o log.
export function errorHandler(logger) {
    return (err, req, res, _next) => {
        if (err instanceof DomainError) {
            const body = { success: false, message: message(err.code, err.params) };
            if (err.params.errors) body.errors = err.params.errors;
            return res.status(err.status).json(body);
        }

        if (err.type === 'entity.parse.failed') {
            return res.status(400).json({ success: false, message: message('request.invalid_json') });
        }

        logger.error({ err }, `${req.method} ${req.originalUrl} falhou`);
        return res.status(500).json({ success: false, message: message('internal_error') });
    };
}
