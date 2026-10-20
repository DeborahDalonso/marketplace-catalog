import { message } from '../core/messages.js';

export function notFound(req, res) {
    res.status(404).json({ success: false, message: message('route.not_found') });
}
