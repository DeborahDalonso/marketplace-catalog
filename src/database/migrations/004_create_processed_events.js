export async function up(db) {
    await db.query(`
        CREATE TABLE IF NOT EXISTS processed_events (
            event_id CHAR(30) NOT NULL PRIMARY KEY,
            type VARCHAR(60) NOT NULL,
            processed_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        )
    `);
}
