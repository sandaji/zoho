"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateFiscalPeriod = void 0;
const prisma_client_1 = require("../lib/prisma-client");
const validateFiscalPeriod = (dateFieldName) => {
    return async (req, res, next) => {
        let transactionDate;
        if (dateFieldName && req.body[dateFieldName]) {
            transactionDate = new Date(req.body[dateFieldName]);
        }
        else {
            transactionDate = new Date();
        }
        if (!transactionDate) {
            // Should not happen with the new logic, but as a safeguard.
            return next();
        }
        try {
            const fiscalPeriod = await prisma_client_1.prisma.fiscalPeriod.findFirst({
                where: {
                    startDate: { lte: transactionDate },
                    endDate: { gte: transactionDate },
                },
            });
            if (fiscalPeriod && fiscalPeriod.isLocked) {
                return res.status(403).json({ message: 'Cannot post to locked period' });
            }
            next();
        }
        catch (error) {
            console.error('Error validating fiscal period:', error);
            next(error);
        }
    };
};
exports.validateFiscalPeriod = validateFiscalPeriod;
