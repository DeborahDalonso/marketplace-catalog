import DomainError from '../core/DomainError.js';

// Lê o Bearer e põe o usuário em req.user. Com `optional`, a ausência do
// header passa com req.user = null (rota pública que aproveita o usuário se houver).
export function authenticate(tokenService, { optional = false } = {}) {
    return async (req, res, next) => {
        const [scheme, token] = String(req.headers.authorization || '').split(' ');
        if (scheme !== 'Bearer' || !token) {
            req.user = null;
            return next(optional ? undefined : new DomainError('auth.required', 401));
        }

        try {
            req.user = await tokenService.verify(token);
        } catch {
            return next(new DomainError('auth.invalid_token', 401));
        }
        return next();
    };
}
