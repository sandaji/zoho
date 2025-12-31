"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contextMiddleware = void 0;
const async_context_1 = require("../lib/async-context");
const contextMiddleware = (req, res, next) => {
    const context = {
        userId: req.user?.userId, // Assuming authMiddleware populates req.user
        ipAddress: req.headers['x-forwarded-for'] || req.ip,
        userAgent: req.headers['user-agent'],
    };
    async_context_1.asyncContext.run(context, () => {
        next();
    });
};
exports.contextMiddleware = contextMiddleware;
