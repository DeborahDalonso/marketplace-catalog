export function requestLogger(logger) {
    return (req, res, next) => {
        const started = process.hrtime.bigint();
        res.on('finish', () => {
            const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;
            logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${elapsedMs.toFixed(1)}ms`);
        });
        next();
    };
}
