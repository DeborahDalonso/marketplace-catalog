import mysql from 'mysql2/promise';

// O serviço cria o próprio schema na primeira subida (CONTRATOS, seção 1)
export async function ensureDatabase({ database, ...options }) {
    const conn = await mysql.createConnection(options);
    try {
        await conn.query(
            `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
        );
    } finally {
        await conn.end();
    }
}

export function createPool(options) {
    const pool = mysql.createPool({
        ...options,
        waitForConnections: true,
        connectionLimit: 10,
        charset: 'utf8mb4_unicode_ci',
        // JSON vem como objeto, DATETIME vem como string ISO sem conversão de fuso
        dateStrings: true,
    });

    // Models recebem `conn` opcional: dentro de uma transação usam a conexão
    // dedicada, fora dela caem no pool. O helper garante commit/rollback/release.
    pool.transaction = async (work) => {
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();
            const result = await work(conn);
            await conn.commit();
            return result;
        } catch (err) {
            await conn.rollback();
            throw err;
        } finally {
            conn.release();
        }
    };

    return pool;
}
