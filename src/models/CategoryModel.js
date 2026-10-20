export default class CategoryModel {
    constructor(db) {
        this.db = db;
    }

    async findAll(conn = this.db) {
        const [rows] = await conn.query('SELECT * FROM categories ORDER BY name');
        return rows.map(this.#toEntity);
    }

    async findById(id, conn = this.db) {
        const [rows] = await conn.query('SELECT * FROM categories WHERE id = ?', [id]);
        return rows.length ? this.#toEntity(rows[0]) : null;
    }

    async findBySlug(slug, conn = this.db) {
        const [rows] = await conn.query('SELECT * FROM categories WHERE slug = ?', [slug]);
        return rows.length ? this.#toEntity(rows[0]) : null;
    }

    async create({ id, name, slug }, conn = this.db) {
        await conn.query('INSERT INTO categories (id, name, slug) VALUES (?, ?, ?)', [id, name, slug]);
        return this.findById(id, conn);
    }

    async update(id, { name, slug }, conn = this.db) {
        await conn.query('UPDATE categories SET name = ?, slug = ? WHERE id = ?', [name, slug, id]);
        return this.findById(id, conn);
    }

    async delete(id, conn = this.db) {
        const [result] = await conn.query('DELETE FROM categories WHERE id = ?', [id]);
        return result.affectedRows > 0;
    }

    #toEntity(row) {
        return { id: row.id, name: row.name, slug: row.slug, createdAt: row.created_at };
    }
}
