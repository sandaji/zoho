"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BenefitsService = void 0;
const db_1 = require("../../../lib/db");
const logger_1 = require("../../../lib/logger");
class BenefitsService {
    /**
     * Benefit Management
     */
    async createBenefit(data) {
        try {
            const benefit = await db_1.prisma.benefit.create({
                data: {
                    name: data.name,
                    type: data.type,
                    description: data.description,
                    provider: data.provider,
                },
            });
            return benefit;
        }
        catch (error) {
            logger_1.logger.error({ err: error }, "Failed to create benefit");
            throw error;
        }
    }
    async getBenefits() {
        try {
            return await db_1.prisma.benefit.findMany({
                orderBy: { name: 'asc' },
            });
        }
        catch (error) {
            logger_1.logger.error({ err: error }, "Failed to fetch benefits");
            throw error;
        }
    }
    /**
     * Enrollment
     */
    async enrollUser(userId, benefitId) {
        try {
            const enrollment = await db_1.prisma.benefitEnrollment.create({
                data: {
                    userId,
                    benefitId,
                    status: 'ACTIVE',
                },
            });
            return enrollment;
        }
        catch (error) {
            logger_1.logger.error({ err: error }, `Failed to enroll user ${userId} in benefit ${benefitId}`);
            throw error;
        }
    }
    async getUserEnrollments(userId) {
        try {
            return await db_1.prisma.benefitEnrollment.findMany({
                where: { userId },
                include: {
                    benefit: true
                },
            });
        }
        catch (error) {
            logger_1.logger.error({ err: error }, `Failed to fetch enrollments for user ${userId}`);
            throw error;
        }
    }
}
exports.BenefitsService = BenefitsService;
