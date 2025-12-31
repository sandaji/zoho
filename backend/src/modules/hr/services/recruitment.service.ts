
import { prisma } from "../../../lib/db";
import { logger } from "../../../lib/logger";
import { AppError, ErrorCode } from "../../../lib/errors";

export class RecruitmentService {
  /**
   * Create a new job posting
   */
  async createJobPosting(data: any) {
    try {
      const posting = await prisma.jobPosting.create({
        data: {
          title: data.title,
          description: data.description,
          department: data.department,
          location: data.location,
          type: data.type,
          status: data.status || 'DRAFT',
        },
      });
      return posting;
    } catch (error) {
      logger.error({ err: error }, "Failed to create job posting");
      throw error;
    }
  }

  /**
   * Get all job postings
   */
  async getJobPostings(filters: any = {}) {
    try {
      const where: any = {};
      if (filters.status) where.status = filters.status;
      if (filters.department) where.department = filters.department;

      const postings = await prisma.jobPosting.findMany({
        where,
        include: {
          _count: {
            select: { applicants: true }
          }
        },
        orderBy: { createdAt: 'desc' },
      });
      return postings;
    } catch (error) {
      logger.error({ err: error }, "Failed to fetch job postings");
      throw error;
    }
  }

  /**
   * Get job posting by ID with applicants
   */
  async getJobPostingById(id: string) {
    try {
      const posting = await prisma.jobPosting.findUnique({
        where: { id },
        include: {
          applicants: {
            include: {
              interviews: true
            }
          }
        },
      });
      if (!posting) {
        throw new AppError(ErrorCode.NOT_FOUND, 404, "Job posting not found");
      }
      return posting;
    } catch (error) {
      logger.error({ err: error }, `Failed to fetch job posting ${id}`);
      throw error;
    }
  }

  /**
   * Create an applicant for a job posting
   */
  async createApplicant(data: any) {
    try {
      const applicant = await prisma.applicant.create({
        data: {
          name: data.name,
          email: data.email,
          phone: data.phone,
          resumeUrl: data.resumeUrl,
          jobPostingId: data.jobPostingId,
          status: 'NEW',
        },
      });
      return applicant;
    } catch (error) {
      logger.error({ err: error }, "Failed to create applicant");
      throw error;
    }
  }

  /**
   * Update applicant status
   */
  async updateApplicantStatus(id: string, status: any) {
    try {
      const applicant = await prisma.applicant.update({
        where: { id },
        data: { status },
      });
      return applicant;
    } catch (error) {
      logger.error({ err: error }, `Failed to update applicant ${id}`);
      throw error;
    }
  }

  /**
   * Schedule an interview
   */
  async scheduleInterview(data: any) {
    try {
      const interview = await prisma.interview.create({
        data: {
          applicantId: data.applicantId,
          interviewerId: data.interviewerId,
          scheduledAt: new Date(data.scheduledAt),
          status: 'SCHEDULED',
        },
      });
      
      // Automatically update applicant status if it's currently NEW or REVIEWING
      await prisma.applicant.update({
        where: { id: data.applicantId },
        data: { status: 'INTERVIEWING' }
      });

      return interview;
    } catch (error) {
      logger.error({ err: error }, "Failed to schedule interview");
      throw error;
    }
  }

  /**
   * Update interview feedback
   */
  async updateInterview(id: string, data: any) {
    try {
      const interview = await prisma.interview.update({
        where: { id },
        data: {
          feedback: data.feedback,
          rating: data.rating,
          status: data.status,
        },
      });
      return interview;
    } catch (error) {
      logger.error({ err: error }, `Failed to update interview ${id}`);
      throw error;
    }
  }
}
