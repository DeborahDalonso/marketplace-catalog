import BaseController from './BaseController.js';

export default class HealthController extends BaseController {
    constructor(healthService) {
        super();
        this.healthService = healthService;
    }

    async show(req, res) {
        const { healthy, report } = await this.healthService.check();
        return this.success(res, report, null, healthy ? 200 : 503);
    }
}
