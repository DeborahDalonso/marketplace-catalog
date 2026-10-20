export default class HealthService {
    constructor(db, kafka, config, logger) {
        this.db = db;
        this.kafka = kafka;
        this.config = config;
        this.logger = logger;
    }

    /**
     * @returns {{ healthy: boolean, report: { service, version, mysql, kafka } }}
     */
    async check() {
        const [mysql, kafka] = await Promise.all([this.#checkMysql(), this.#checkKafka()]);
        return {
            healthy: mysql === 'ok' && kafka === 'ok',
            report: { service: this.config.serviceName, version: this.config.version, mysql, kafka },
        };
    }

    async #checkMysql() {
        try {
            await this.db.query('SELECT 1');
            return 'ok';
        } catch (err) {
            this.logger.warn(`mysql fora: ${err.message}`);
            return 'error';
        }
    }

    async #checkKafka() {
        const admin = this.kafka.admin();
        try {
            await admin.connect();
            await admin.listTopics();
            return 'ok';
        } catch (err) {
            this.logger.warn(`kafka fora: ${err.message}`);
            return 'error';
        } finally {
            await admin.disconnect().catch(() => {});
        }
    }
}
