
import { prisma } from "../../../lib/db";
import { logger } from "../../../lib/logger";

export class BenefitsService {
  /**
   * Benefit Management
   */
  async createBenefit(data: any) {
    try {
      const benefit = await prisma.benefit.create({
        data: {
          name: data.name,
          type: data.type,
          description: data.description,
          provider: data.provider,
        },
      });
      return benefit;
    } catch (error) {
      logger.error({ err: error }, "Failed to create benefit");
      throw error;
    }
  }

  async getBenefits() {
    try {
      return await prisma.benefit.findMany({
        orderBy: { name: 'asc' },
      });
    } catch (error) {
      logger.error({ err: error }, "Failed to fetch benefits");
      throw error;
    }
  }

  /**
   * Enrollment
   */
  async enrollUser(userId: string, benefitId: string) {
    try {
      const enrollment = await prisma.benefitEnrollment.create({
        data: {
          userId,
          benefitId,
          status: 'ACTIVE',
        },
      });
      return enrollment;
    } catch (error) {
      logger.error({ err: error }, `Failed to enroll user ${userId} in benefit ${benefitId}`);
      throw error;
    }
  }

  async getUserEnrollments(userId: string) {
    try {
      return await prisma.benefitEnrollment.findMany({
        where: { userId },
        include: {
          benefit: true
        },
      });
    } catch (error) {
      logger.error({ err: error }, `Failed to fetch enrollments for user ${userId}`);
      throw error;
    }
  }
}
