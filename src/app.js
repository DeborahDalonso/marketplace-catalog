import express from 'express';
import { productRoutes } from './routes/products.js';
import { categoryRoutes } from './routes/categories.js';
import { healthRoutes } from './routes/health.js';
import { requestLogger } from './middlewares/requestLogger.js';
import { notFound } from './middlewares/notFound.js';
import { errorHandler } from './middlewares/errorHandler.js';

// Monta o Express sem dar listen: o index.js sobe o servidor e os testes usam supertest
export function createApp(container) {
    const app = express();
    const logger = container.getLogger('Http');

    app.disable('x-powered-by');
    app.use(express.json({ limit: '100kb' }));
    app.use(requestLogger(logger));

    app.use('/health', healthRoutes(container));
    app.use('/products', productRoutes(container));
    app.use('/categories', categoryRoutes(container));

    app.use(notFound);
    app.use(errorHandler(logger));

    return app;
}
