export default class StockReservationModel {
    constructor(db) {
        this.db = db;
    }

    async addMany(orderId, items, conn = this.db) {
        if (!items.length) return;
        await conn.query('INSERT INTO stock_reservations (order_id, product_id, quantity) VALUES ?', [
            items.map((item) => [orderId, item.productId, item.quantity]),
        ]);
    }

    async findOpenByOrder(orderId, conn = this.db) {
        const [rows] = await conn.query(
            'SELECT product_id, quantity FROM stock_reservations WHERE order_id = ? AND released = 0 FOR UPDATE',
            [orderId],
        );
        return rows.map((row) => ({ productId: row.product_id, quantity: row.quantity }));
    }

    async release(orderId, conn = this.db) {
        const [result] = await conn.query(
            'UPDATE stock_reservations SET released = 1 WHERE order_id = ? AND released = 0',
            [orderId],
        );
        return result.affectedRows;
    }
}
