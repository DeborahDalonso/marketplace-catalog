import mysql from 'mysql2/promise';
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from 'jose';
import { createConfig } from '../../../src/config.js';
import Container from '../../../src/core/container.js';
import { createApp } from '../../../src/app.js';
import { ensureDatabase } from '../../../src/database/connection.js';
import { migrate } from '../../../src/database/migrate.js';
import { seed } from '../../../src/database/seeds/catalogSeeder.js';
import TokenService from '../../../src/services/TokenService.js';

const TEST_DATABASE = 'marketplace_catalog_test';
const TABLES = [
    'stock_reservations',
    'product_views',
    'outbox',
    'processed_events',
    'products',
    'categories',
    'migrations',
];

export const config = createConfig({ ...process.env, MYSQL_DATABASE: TEST_DATABASE });

/**
 * Sem MySQL os testes de integração são pulados com aviso, não falham.
 */
export async function mysqlAvailable() {
    try {
        const { host, port, user, password } = config.mysql;
        const conn = await mysql.createConnection({ host, port, user, password, connectTimeout: 2000 });
        await conn.end();
        return true;
    } catch (err) {
        console.warn(
            `\nMySQL indisponível em ${config.mysql.host}:${config.mysql.port} (${err.code || err.message}); testes de integração pulados.\n`,
        );
        return false;
    }
}

// Kafka de mentira: o outbox fica no banco e é verificado lá; o health enxerga o broker como ok
function fakeKafka() {
    const noop = async () => {};
    return {
        admin: () => ({ connect: noop, disconnect: noop, listTopics: async () => [] }),
        producer: () => ({ connect: noop, disconnect: noop, send: noop }),
        consumer: () => ({ connect: noop, disconnect: noop, subscribe: noop, run: noop }),
    };
}

export async function createTestContext() {
    await ensureDatabase(config.mysql);
    const container = new Container(config);
    const db = container.getDatabase();

    await db.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const table of TABLES) await db.query(`DROP TABLE IF EXISTS ${table}`);
    await db.query('SET FOREIGN_KEY_CHECKS = 1');
    await migrate(db);
    await seed(db);

    const { publicKey, privateKey } = await generateKeyPair('RS256');
    const jwk = { ...(await exportJWK(publicKey)), kid: 'test', alg: 'RS256', use: 'sig' };
    container.register('kafka', fakeKafka());
    container.register('tokenService', new TokenService(createLocalJWKSet({ keys: [jwk] }), config.jwtIssuer));

    const tokenFor = (role, sub = `usr_${role.toUpperCase().padEnd(26, '0')}`) =>
        new SignJWT({ email: `${role}@example.com`, name: role, role })
            .setProtectedHeader({ alg: 'RS256', kid: 'test' })
            .setIssuer(config.jwtIssuer)
            .setSubject(sub)
            .setIssuedAt()
            .setExpirationTime('1h')
            .sign(privateKey);

    const close = async () => {
        await db.query(`DROP DATABASE IF EXISTS ${TEST_DATABASE}`);
        await container.close();
    };

    return { app: createApp(container), container, db, tokenFor, close };
}
