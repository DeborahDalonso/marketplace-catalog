import BaseController from './BaseController.js';
import StoreProductRequest from '../requests/StoreProductRequest.js';
import UpdateProductRequest from '../requests/UpdateProductRequest.js';
import { message } from '../core/messages.js';

export default class ProductController extends BaseController {
    static requests = {
        store: StoreProductRequest,
        update: UpdateProductRequest,
    };

    constructor(productService) {
        super();
        this.productService = productService;
    }

    async index(req, res) {
        return this.success(res, await this.productService.list(req.query));
    }

    async show(req, res) {
        return this.success(res, await this.productService.get(req.params.id));
    }

    async store(request, res) {
        const product = await this.productService.create(request.validated(), request.user);
        return this.success(res, product, message('product.created'), 201);
    }

    async update(request, res) {
        const product = await this.productService.update(request.params.id, request.validated(), request.user);
        return this.success(res, product, message('product.updated'));
    }

    async destroy(req, res) {
        await this.productService.delete(req.params.id, req.user);
        return this.success(res, null, message('product.deleted'));
    }

    async registerView(req, res) {
        await this.productService.registerView(req.params.id, req.user?.sub ?? null);
        return this.success(res, null, message('product.view_registered'), 201);
    }
}
