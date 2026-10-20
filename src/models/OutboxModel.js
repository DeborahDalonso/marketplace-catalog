export default class OutboxModel {
    constructor(db) {
        this.db = db;
    }

    async add({ eventId, type, aggregateId, payload }, conn = this.db) {
        await conn.query('INSERT INTO outbox (event_id, type, aggregate_id, payload) VALUES (?, ?, ?, ?)', [
            eventId,
            type,
            aggregateId,
            JSON.stringify(payload),
        ]);
    }

    async findPending(limit = 100, conn = this.db) {
        const [rows] = await conn.query(
            'SELECT id, event_id, type, aggregate_id, payload FROM outbox WHERE published_at IS NULL ORDER BY id LIMIT ?',
            [limit],
        );
        return rows.map((row) => ({
            id: row.id,
            eventId: row.event_id,
            type: row.type,
            aggregateId: row.aggregate_id,
            payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
        }));
    }

    async markPublished(id, conn = this.db) {
        await conn.query('UPDATE outbox SET published_at = CURRENT_TIMESTAMP(3) WHERE id = ?', [id]);
    }
}
