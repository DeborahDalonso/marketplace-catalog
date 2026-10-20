export async function up(db) {
    await db.query(`
        CREATE TABLE IF NOT EXISTS stock_reservations (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            order_id CHAR(30) NOT NULL,
            product_id CHAR(30) NOT NULL,
            quantity INT UNSIGNED NOT NULL,
            released TINYINT(1) NOT NULL DEFAULT 0,
            created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            INDEX idx_stock_reservations_order (order_id, released),
            CONSTRAINT fk_stock_reservations_product FOREIGN KEY (product_id) REFERENCES products (id)
        )
    `);
}
