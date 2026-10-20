export default class ProductViewModel {
    constructor(db) {
        this.db = db;
    }

    async add(productId, userId, conn = this.db) {
        await conn.query('INSERT INTO product_views (product_id, user_id) VALUES (?, ?)', [productId, userId ?? null]);
    }
}
