import pino from 'pino';
import config from '../config.js';

// em teste o logger fica mudo; em dev usa pino-pretty; em produção, JSON puro
function createRoot() {
    if (config.nodeEnv === 'test') return pino({ level: 'silent' });
    if (config.nodeEnv === 'production') return pino({ level: config.logLevel });
    return pino({
        level: config.logLevel,
        transport: { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } },
    });
}

const root = createRoot();

export function createLogger(context) {
    return root.child({ context });
}

export default root;
