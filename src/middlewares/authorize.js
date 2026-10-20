import DomainError from '../core/DomainError.js';

// Gate por role para rotas sem body (as com body fazem isso no FormRequest.authorize).
// A regra de dono fica no service, que é quem tem o produto em mãos.
export function authorize(...roles) {
    return (req, res, next) => {
        if (!req.user) return next(new DomainError('auth.required', 401));
        if (!roles.includes(req.user.role)) return next(new DomainError('auth.forbidden', 403));
        return next();
    };
}
