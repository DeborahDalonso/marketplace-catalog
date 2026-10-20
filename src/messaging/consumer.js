const TOPICS = ['order.created', 'order.cancelled'];

// Consome os eventos de pedido e delega ao StockService. Mensagem ilegível é
// descartada com aviso; erro de banco sobe para o kafkajs tentar de novo
// sem avançar o offset (o processo não cai: o kafkajs reinicia o consumer).
export default class EventConsumer {
    constructor(kafka, stockService, logger, groupId) {
        this.consumer = kafka.consumer({ groupId });
        this.stockService = stockService;
        this.logger = logger;
    }

    async start() {
        await this.consumer.connect();
        for (const topic of TOPICS) await this.consumer.subscribe({ topic });
        await this.consumer.run({ eachMessage: ({ topic, message }) => this.handle(topic, message.value) });
        this.logger.info(`consumindo ${TOPICS.join(', ')}`);
    }

    async stop() {
        await this.consumer.disconnect();
    }

    async handle(topic, rawValue) {
        let event;
        try {
            event = JSON.parse(rawValue.toString());
        } catch {
            this.logger.warn(`mensagem inválida em ${topic}, descartada`);
            return;
        }
        if (!event?.eventId || !event?.data?.orderId) {
            this.logger.warn(`evento sem eventId ou orderId em ${topic}, descartado`);
            return;
        }

        if (topic === 'order.created') await this.stockService.reserve(event);
        if (topic === 'order.cancelled') await this.stockService.release(event);
    }
}
