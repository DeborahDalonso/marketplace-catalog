import { config as loadEnv } from 'dotenv';
import { createRequire } from 'node:module';

loadEnv({ quiet: true });

const pkg = createRequire(import.meta.url)('../package.json');

export function createConfig(env = process.env) {
    return {
        serviceName: pkg.name,
        version: pkg.version,
        nodeEnv: env.NODE_ENV || 'development',
        port: Number(env.PORT) || 3001,
        logLevel: env.LOG_LEVEL || 'info',
        authUrl: env.AUTH_URL || 'http://localhost:3003',
        jwtIssuer: 'marketplace-auth',
        jwksCacheMs: 10 * 60 * 1000,
        outboxIntervalMs: 1000,
        mysql: {
            host: env.MYSQL_HOST || 'localhost',
            port: Number(env.MYSQL_PORT) || 3306,
            user: env.MYSQL_USER || 'root',
            password: env.MYSQL_PASSWORD || 'root',
            database: env.MYSQL_DATABASE || 'marketplace_catalog',
        },
        kafka: {
            brokers: (env.KAFKA_BROKERS || 'localhost:19092').split(','),
            groupId: pkg.name,
        },
    };
}

export default createConfig();
