import DomainError from '../core/DomainError.js';
import { newId } from '../helpers/idHelper.js';
import { slugify } from '../helpers/slugHelper.js';
import { createEvent, productEventData } from '../messaging/events.js';

const DEFAULT_PER_PAGE = 20;
const MAX_PER_PAGE = 100;

export default class ProductService {
    constructor(db, productModel, categoryModel, productViewModel, outboxModel, logger) {
        this.db = db;
        this.productModel = productModel;
        this.categoryModel = categoryModel;
        this.productViewModel = productViewModel;
        this.outboxModel = outboxModel;
        this.logger = logger;
    }

    /**
     * Lista paginada. Sem `active` na query só os ativos aparecem: a vitrine
     * não pode mostrar produto removido, e o vendedor pede `active=false` quando quiser.
     */
    async list(query = {}) {
        const page = Math.max(1, Number(query.page) || 1);
        const perPage = Math.min(MAX_PER_PAGE, Math.max(1, Number(query.perPage) || DEFAULT_PER_PAGE));
        const filters = {
            q: query.q ? String(query.q).trim() : undefined,
            categoryId: query.categoryId || undefined,
            sellerId: query.sellerId || undefined,
            active: query.active === undefined ? true : String(query.active) !== 'false',
            page,
            perPage,
        };

        const { items, total } = await this.productModel.findAll(filters);
        return { items, page, perPage, total };
    }

    async get(id) {
        const product = await this.productModel.findById(id);
        if (!product) throw new DomainError('product.not_found', 404);
        return product;
    }

    /**
     * Cria o produto para o vendedor do token. Produto e evento product.created
     * entram na mesma transação (Outbox).
     */
    async create(data, user) {
        await this.#assertCategory(data.categoryId);
        const id = newId('prd');

        const product = await this.db.transaction(async (conn) => {
            const created = await this.productModel.create(
                {
                    id,
                    sellerId: user.sub,
                    categoryId: data.categoryId,
                    name: data.name,
                    slug: slugify(data.name),
                    description: data.description,
                    priceCents: data.priceCents,
                    stock: data.stock ?? 0,
                    active: data.active ?? true,
                },
                conn,
            );
            await this.outboxModel.add(createEvent('product.created', id, productEventData(created)), conn);
            return created;
        });

        this.logger.info(`produto criado: ${id} por ${user.sub}`);
        return product;
    }

    async update(id, data, user) {
        const current = await this.get(id);
        this.#assertOwner(current, user);
        if (data.categoryId && data.categoryId !== current.categoryId) await this.#assertCategory(data.categoryId);

        const merged = { ...current, ...data };
        merged.slug = slugify(merged.name);

        const product = await this.db.transaction(async (conn) => {
            const updated = await this.productModel.update(id, merged, conn);
            await this.outboxModel.add(createEvent('product.updated', id, productEventData(updated)), conn);
            return updated;
        });

        this.logger.info(`produto atualizado: ${id} por ${user.sub}`);
        return product;
    }

    /**
     * Soft delete: active = 0. O produto some da vitrine mas pedidos antigos
     * continuam apontando para ele.
     */
    async delete(id, user) {
        const current = await this.get(id);
        this.#assertOwner(current, user);
        if (!current.active) throw new DomainError('product.already_deleted', 409);

        await this.db.transaction(async (conn) => {
            await this.productModel.softDelete(id, conn);
            const data = { productId: id, sellerId: current.sellerId };
            await this.outboxModel.add(createEvent('product.deleted', id, data), conn);
        });

        this.logger.info(`produto removido: ${id} por ${user.sub}`);
    }

    async registerView(id, userId = null) {
        await this.get(id);

        await this.db.transaction(async (conn) => {
            await this.productViewModel.add(id, userId, conn);
            await this.outboxModel.add(createEvent('product.viewed', id, { productId: id, userId }), conn);
        });
    }

    async #assertCategory(categoryId) {
        const category = await this.categoryModel.findById(categoryId);
        if (!category) throw new DomainError('product.category_not_found', 422);
    }

    #assertOwner(product, user) {
        if (user.role === 'admin') return;
        if (product.sellerId !== user.sub) throw new DomainError('product.forbidden', 403);
    }
}
