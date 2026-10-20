export default class ProcessedEventModel {
    constructor(db) {
        this.db = db;
    }

    // INSERT IGNORE: quem conseguir inserir é dono do evento; a repetição recebe false
    async claim(eventId, type, conn = this.db) {
        const [result] = await conn.query('INSERT IGNORE INTO processed_events (event_id, type) VALUES (?, ?)', [
            eventId,
            type,
        ]);
        return result.affectedRows > 0;
    }
}
