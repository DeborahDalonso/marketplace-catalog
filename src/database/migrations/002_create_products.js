export async function up(db) {
    await db.query(`
        CREATE TABLE IF NOT EXISTS products (
            id CHAR(30) NOT NULL PRIMARY KEY,
            seller_id CHAR(30) NOT NULL,
            category_id CHAR(30) NOT NULL,
            name VARCHAR(120) NOT NULL,
            slug VARCHAR(140) NOT NULL,
            description TEXT NULL,
            price_cents INT UNSIGNED NOT NULL,
            stock INT UNSIGNED NOT NULL DEFAULT 0,
            active TINYINT(1) NOT NULL DEFAULT 1,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_products_seller (seller_id),
            INDEX idx_products_category (category_id),
            INDEX idx_products_slug (slug),
            INDEX idx_products_active (active),
            CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories (id)
        )
    `);
}
