export async function up(db) {
    await db.query(`
        CREATE TABLE IF NOT EXISTS categories (
            id CHAR(30) NOT NULL PRIMARY KEY,
            name VARCHAR(120) NOT NULL,
            slug VARCHAR(140) NOT NULL UNIQUE,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `);
}
