import { Kafka, logLevel } from 'kafkajs';
import { createLogger } from './logger.js';
import { createPool } from '../database/connection.js';
import CategoryModel from '../models/CategoryModel.js';
import ProductModel from '../models/ProductModel.js';
import ProductViewModel from '../models/ProductViewModel.js';
import OutboxModel from '../models/OutboxModel.js';
import ProcessedEventModel from '../models/ProcessedEventModel.js';
import StockReservationModel from '../models/StockReservationModel.js';
import CategoryService from '../services/CategoryService.js';
import ProductService from '../services/ProductService.js';
import StockService from '../services/StockService.js';
import TokenService from '../services/TokenService.js';
import HealthService from '../services/HealthService.js';
import CategoryController from '../controllers/CategoryController.js';
import ProductController from '../controllers/ProductController.js';
import HealthController from '../controllers/HealthController.js';
import OutboxWorker from '../messaging/producer.js';
import EventConsumer from '../messaging/consumer.js';

// Dono de todas as instâncias. Cada getter cria na primeira chamada e reutiliza.
// Os testes trocam peças com register() antes do primeiro getter (kafka falso, JWKS local).
export default class Container {
    #instances = new Map();

    constructor(config) {
        this.config = config;
    }

    register(key, instance) {
        this.#instances.set(key, instance);
    }

    #singleton(key, factory) {
        if (!this.#instances.has(key)) this.#instances.set(key, factory());
        return this.#instances.get(key);
    }

    getLogger(context) {
        return this.#singleton(`logger:${context}`, () => createLogger(context));
    }

    getDatabase() {
        return this.#singleton('db', () => createPool(this.config.mysql));
    }

    getKafka() {
        return this.#singleton(
            'kafka',
            () =>
                new Kafka({
                    clientId: this.config.serviceName,
                    brokers: this.config.kafka.brokers,
                    logLevel: logLevel.NOTHING,
                }),
        );
    }

    // ==== Models ====

    getCategoryModel() {
        return this.#singleton('categoryModel', () => new CategoryModel(this.getDatabase()));
    }

    getProductModel() {
        return this.#singleton('productModel', () => new ProductModel(this.getDatabase()));
    }

    getProductViewModel() {
        return this.#singleton('productViewModel', () => new ProductViewModel(this.getDatabase()));
    }

    getOutboxModel() {
        return this.#singleton('outboxModel', () => new OutboxModel(this.getDatabase()));
    }

    getProcessedEventModel() {
        return this.#singleton('processedEventModel', () => new ProcessedEventModel(this.getDatabase()));
    }

    getStockReservationModel() {
        return this.#singleton('stockReservationModel', () => new StockReservationModel(this.getDatabase()));
    }

    // ==== Services ====

    getCategoryService() {
        return this.#singleton(
            'categoryService',
            () =>
                new CategoryService(this.getCategoryModel(), this.getProductModel(), this.getLogger('CategoryService')),
        );
    }

    getProductService() {
        return this.#singleton(
            'productService',
            () =>
                new ProductService(
                    this.getDatabase(),
                    this.getProductModel(),
                    this.getCategoryModel(),
                    this.getProductViewModel(),
                    this.getOutboxModel(),
                    this.getLogger('ProductService'),
                ),
        );
    }

    getStockService() {
        return this.#singleton(
            'stockService',
            () =>
                new StockService(
                    this.getDatabase(),
                    this.getProductModel(),
                    this.getStockReservationModel(),
                    this.getProcessedEventModel(),
                    this.getOutboxModel(),
                    this.getLogger('StockService'),
                ),
        );
    }

    getTokenService() {
        return this.#singleton('tokenService', () => TokenService.remote(this.config));
    }

    getHealthService() {
        return this.#singleton(
            'healthService',
            () => new HealthService(this.getDatabase(), this.getKafka(), this.config, this.getLogger('HealthService')),
        );
    }

    // ==== Controllers ====

    getCategoryController() {
        return this.#singleton('categoryController', () => new CategoryController(this.getCategoryService()));
    }

    getProductController() {
        return this.#singleton('productController', () => new ProductController(this.getProductService()));
    }

    getHealthController() {
        return this.#singleton('healthController', () => new HealthController(this.getHealthService()));
    }

    // ==== Mensageria ====

    getOutboxWorker() {
        return this.#singleton(
            'outboxWorker',
            () =>
                new OutboxWorker(
                    this.getKafka(),
                    this.getOutboxModel(),
                    this.getLogger('OutboxWorker'),
                    this.config.outboxIntervalMs,
                ),
        );
    }

    getEventConsumer() {
        return this.#singleton(
            'eventConsumer',
            () =>
                new EventConsumer(
                    this.getKafka(),
                    this.getStockService(),
                    this.getLogger('EventConsumer'),
                    this.config.kafka.groupId,
                ),
        );
    }

    async close() {
        if (this.#instances.has('db')) await this.#instances.get('db').end();
        this.#instances.clear();
    }
}
