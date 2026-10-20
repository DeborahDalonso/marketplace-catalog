import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';

export function productRoutes(container) {
    const router = Router();
    const controller = container.getProductController();
    const tokenService = container.getTokenService();
    const auth = authenticate(tokenService);
    const optionalAuth = authenticate(tokenService, { optional: true });

    router.get('/', controller.index);
    router.get('/:id', controller.show);
    router.post('/', auth, controller.store);
    router.put('/:id', auth, controller.update);
    router.delete('/:id', auth, authorize('seller', 'admin'), controller.destroy);
    router.post('/:id/views', optionalAuth, controller.registerView);

    return router;
}
