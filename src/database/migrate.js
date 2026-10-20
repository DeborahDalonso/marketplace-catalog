import { readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'migrations');

export async function migrate(db, logger) {
    await db.query(`
        CREATE TABLE IF NOT EXISTS migrations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(120) NOT NULL UNIQUE,
            ran_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `);

    const [rows] = await db.query('SELECT name FROM migrations');
    const done = new Set(rows.map((row) => row.name));
    const files = (await readdir(MIGRATIONS_DIR)).filter((file) => file.endsWith('.js')).sort();
    let ran = 0;

    for (const file of files) {
        const name = file.replace(/\.js$/, '');
        if (done.has(name)) continue;

        const { up } = await import(pathToFileURL(join(MIGRATIONS_DIR, file)).href);
        await up(db);
        await db.query('INSERT INTO migrations (name) VALUES (?)', [name]);
        logger?.info(`migration aplicada: ${name}`);
        ran++;
    }

    return ran;
}
