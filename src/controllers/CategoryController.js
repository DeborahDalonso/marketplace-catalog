import BaseController from './BaseController.js';
import StoreCategoryRequest from '../requests/StoreCategoryRequest.js';
import { message } from '../core/messages.js';

export default class CategoryController extends BaseController {
    static requests = {
        store: StoreCategoryRequest,
        update: StoreCategoryRequest,
    };

    constructor(categoryService) {
        super();
        this.categoryService = categoryService;
    }

    async index(req, res) {
        return this.success(res, await this.categoryService.list());
    }

    async store(request, res) {
        const category = await this.categoryService.create(request.validated());
        return this.success(res, category, message('category.created'), 201);
    }

    async update(request, res) {
        const category = await this.categoryService.update(request.params.id, request.validated());
        return this.success(res, category, message('category.updated'));
    }

    async destroy(req, res) {
        await this.categoryService.delete(req.params.id);
        return this.success(res, null, message('category.deleted'));
    }
}
