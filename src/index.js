import config from './config.js';
import Container from './core/container.js';
import { createApp } from './app.js';
import { ensureDatabase } from './database/connection.js';
import { migrate } from './database/migrate.js';
import { seed } from './database/seeds/catalogSeeder.js';

const container = new Container(config);
const logger = container.getLogger('Boot');

// Zero-Crash: erro de aplicação vai para o log, o processo continua
process.on('uncaughtException', (err) => logger.error({ err }, 'exceção não tratada'));
process.on('unhandledRejection', (err) => logger.error({ err }, 'promise rejeitada sem tratamento'));

await ensureDatabase(config.mysql);
const db = container.getDatabase();
await migrate(db, logger);
await seed(db, logger);

const app = createApp(container);
const server = app.listen(config.port, () =>
    logger.info(`${config.serviceName} ${config.version} na porta ${config.port}`),
);

// Kafka fora não derruba o HTTP: o health acusa e o outbox guarda o que ficou para trás
try {
    await container.getOutboxWorker().start();
    await container.getEventConsumer().start();
} catch (err) {
    logger.error({ err }, 'kafka indisponível no boot');
}

async function shutdown(signal) {
    logger.info(`${signal} recebido, encerrando`);
    server.close();
    await stopQuietly(container.getOutboxWorker());
    await stopQuietly(container.getEventConsumer());
    await container.close();
    process.exit(0);
}

async function stopQuietly(worker) {
    try {
        await worker.stop();
    } catch (err) {
        logger.warn({ err }, 'falha ao encerrar mensageria');
    }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
