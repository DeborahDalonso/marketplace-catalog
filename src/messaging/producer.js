import { Partitioners } from 'kafkajs';

// Worker do Outbox: a cada intervalo publica, em ordem, o que ainda não tem
// published_at. Se o broker cair, a linha fica pendente e sai na próxima volta.
export default class OutboxWorker {
    #timer = null;
    #busy = false;

    constructor(kafka, outboxModel, logger, intervalMs) {
        this.producer = kafka.producer({ createPartitioner: Partitioners.DefaultPartitioner });
        this.outboxModel = outboxModel;
        this.logger = logger;
        this.intervalMs = intervalMs;
    }

    async start() {
        await this.producer.connect();
        this.#timer = setInterval(() => this.#tick(), this.intervalMs);
        this.logger.info(`outbox worker ativo a cada ${this.intervalMs}ms`);
    }

    async stop() {
        if (this.#timer) clearInterval(this.#timer);
        this.#timer = null;
        await this.producer.disconnect();
    }

    /**
     * Publica tudo que está pendente. Exposto para os testes e para o tick.
     * @returns {number} quantos eventos foram publicados
     */
    async publishPending() {
        const rows = await this.outboxModel.findPending();
        for (const row of rows) {
            await this.producer.send({
                topic: row.type,
                messages: [{ key: row.aggregateId, value: JSON.stringify(row.payload) }],
            });
            await this.outboxModel.markPublished(row.id);
            this.logger.debug(`publicado ${row.type} ${row.eventId}`);
        }
        return rows.length;
    }

    async #tick() {
        // uma volta lenta não pode se sobrepor à seguinte, senão o mesmo evento sai duas vezes
        if (this.#busy) return;
        this.#busy = true;
        try {
            await this.publishPending();
        } catch (err) {
            this.logger.error({ err }, 'falha ao publicar outbox');
        } finally {
            this.#busy = false;
        }
    }
}
