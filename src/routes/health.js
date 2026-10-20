import { Router } from 'express';

export function healthRoutes(container) {
    const router = Router();
    router.get('/', container.getHealthController().show);
    return router;
}
