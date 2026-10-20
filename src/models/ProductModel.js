export default class ProductModel {
    constructor(db) {
        this.db = db;
    }

    async findAll({ q, categoryId, sellerId, active, page, perPage }, conn = this.db) {
        const where = [];
        const params = [];

        if (q) {
            where.push('(name LIKE ? OR description LIKE ?)');
            params.push(`%${q}%`, `%${q}%`);
        }
        if (categoryId) {
            where.push('category_id = ?');
            params.push(categoryId);
        }
        if (sellerId) {
            where.push('seller_id = ?');
            params.push(sellerId);
        }
        if (active !== undefined) {
            where.push('active = ?');
            params.push(active ? 1 : 0);
        }

        const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
        const [[{ total }]] = await conn.query(`SELECT COUNT(*) AS total FROM products ${clause}`, params);
        const [rows] = await conn.query(
            `SELECT * FROM products ${clause} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
            [...params, perPage, (page - 1) * perPage],
        );

        return { items: rows.map(this.#toEntity), total };
    }

    async findById(id, conn = this.db) {
        const [rows] = await conn.query('SELECT * FROM products WHERE id = ?', [id]);
        return rows.length ? this.#toEntity(rows[0]) : null;
    }

    async countByCategory(categoryId, conn = this.db) {
        const [[{ count }]] = await conn.query('SELECT COUNT(*) AS count FROM products WHERE category_id = ?', [
            categoryId,
        ]);
        return count;
    }

    async create(data, conn = this.db) {
        await conn.query(
            `INSERT INTO products (id, seller_id, category_id, name, slug, description, price_cents, stock, active)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                data.id,
                data.sellerId,
                data.categoryId,
                data.name,
                data.slug,
                data.description ?? null,
                data.priceCents,
                data.stock,
                data.active ? 1 : 0,
            ],
        );
        return this.findById(data.id, conn);
    }

    async update(id, data, conn = this.db) {
        await conn.query(
            `UPDATE products
             SET category_id = ?, name = ?, slug = ?, description = ?, price_cents = ?, stock = ?, active = ?
             WHERE id = ?`,
            [
                data.categoryId,
                data.name,
                data.slug,
                data.description ?? null,
                data.priceCents,
                data.stock,
                data.active ? 1 : 0,
                id,
            ],
        );
        return this.findById(id, conn);
    }

    async softDelete(id, conn = this.db) {
        const [result] = await conn.query('UPDATE products SET active = 0 WHERE id = ? AND active = 1', [id]);
        return result.affectedRows > 0;
    }

    // A condição stock >= qty no UPDATE é o que torna a reserva segura sob concorrência:
    // o InnoDB bloqueia a linha e reavalia o WHERE com o estoque já debitado pela outra transação.
    async reserveStock(id, quantity, conn = this.db) {
        const [result] = await conn.query(
            'UPDATE products SET stock = stock - ? WHERE id = ? AND active = 1 AND stock >= ?',
            [quantity, id, quantity],
        );
        return result.affectedRows > 0;
    }

    async releaseStock(id, quantity, conn = this.db) {
        await conn.query('UPDATE products SET stock = stock + ? WHERE id = ?', [quantity, id]);
    }

    #toEntity(row) {
        return {
            id: row.id,
            sellerId: row.seller_id,
            categoryId: row.category_id,
            name: row.name,
            slug: row.slug,
            description: row.description,
            priceCents: row.price_cents,
            stock: row.stock,
            active: row.active === 1,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }
}
