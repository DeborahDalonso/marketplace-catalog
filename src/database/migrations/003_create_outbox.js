export async function up(db) {
    await db.query(`
        CREATE TABLE IF NOT EXISTS outbox (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            event_id CHAR(30) NOT NULL UNIQUE,
            type VARCHAR(60) NOT NULL,
            aggregate_id CHAR(30) NOT NULL,
            payload JSON NOT NULL,
            created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            published_at DATETIME(3) NULL,
            INDEX idx_outbox_pending (published_at, id)
        )
    `);
}
