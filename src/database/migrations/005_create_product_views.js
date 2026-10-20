export async function up(db) {
    await db.query(`
        CREATE TABLE IF NOT EXISTS product_views (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            product_id CHAR(30) NOT NULL,
            user_id CHAR(30) NULL,
            viewed_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            INDEX idx_product_views_product (product_id, viewed_at),
            CONSTRAINT fk_product_views_product FOREIGN KEY (product_id) REFERENCES products (id)
        )
    `);
}
