import DomainError from '../core/DomainError.js';
import { newId } from '../helpers/idHelper.js';
import { slugify } from '../helpers/slugHelper.js';

export default class CategoryService {
    constructor(categoryModel, productModel, logger) {
        this.categoryModel = categoryModel;
        this.productModel = productModel;
        this.logger = logger;
    }

    list() {
        return this.categoryModel.findAll();
    }

    async get(id) {
        const category = await this.categoryModel.findById(id);
        if (!category) throw new DomainError('category.not_found', 404);
        return category;
    }

    /**
     * Cria a categoria; o slug vem do nome e precisa ser único.
     */
    async create({ name }) {
        const slug = slugify(name);
        await this.#assertSlugFree(slug, name);

        const category = await this.categoryModel.create({ id: newId('cat'), name, slug });
        this.logger.info(`categoria criada: ${category.id} (${slug})`);
        return category;
    }

    async update(id, { name }) {
        const current = await this.get(id);
        const slug = slugify(name);
        if (slug !== current.slug) await this.#assertSlugFree(slug, name);

        const category = await this.categoryModel.update(id, { name, slug });
        this.logger.info(`categoria atualizada: ${id}`);
        return category;
    }

    /**
     * Remoção física: categoria com produto vinculado não sai (409).
     */
    async delete(id) {
        await this.get(id);
        const count = await this.productModel.countByCategory(id);
        if (count > 0) throw new DomainError('category.has_products', 409, { count });

        await this.categoryModel.delete(id);
        this.logger.info(`categoria removida: ${id}`);
    }

    async #assertSlugFree(slug, name) {
        const existing = await this.categoryModel.findBySlug(slug);
        if (existing) throw new DomainError('category.slug_exists', 409, { name });
    }
}
