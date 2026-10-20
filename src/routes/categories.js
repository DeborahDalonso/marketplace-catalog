import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';

export function categoryRoutes(container) {
    const router = Router();
    const controller = container.getCategoryController();
    const auth = authenticate(container.getTokenService());

    router.get('/', controller.index);
    router.post('/', auth, controller.store);
    router.put('/:id', auth, controller.update);
    router.delete('/:id', auth, authorize('admin'), controller.destroy);

    return router;
}
