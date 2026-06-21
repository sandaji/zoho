/**
 * UserPrefixSequencer
 *
 * Generates sequential document numbers incorporating a salesman's personal
 * prefix. Output formats:
 *   Invoices:    INV-[PREFIX]-XXXX   e.g. INV-VIN-0042
 *   Quotations:  QTN-[PREFIX]-XXXX   e.g. QTN-JOH-0007
 *   Credit Notes: CRN-[PREFIX]-XXXX
 *   Drafts:      DRF-[PREFIX]-XXXX
 *
 * Uses the existing DocumentSequence table with a composite key of
 * (branchId, type) but adds the user prefix into the formatted string.
 * Sequencing is protected by a Serializable transaction to prevent
 * race conditions under concurrent cashier usage.
 *
 * Falls back to the standard SequenceService format when no prefix is set.
 */

import { prisma } from './db';
import { SalesDocumentType } from '../generated/enums.js';
import { Prisma } from '../generated/index.js';
import { AppError, ErrorCode } from './errors';
import { logger } from './logger';

// ── Constants ────────────────────────────────────────────────────────────────

const DOCUMENT_TYPE_PREFIX: Record<SalesDocumentType, string> = {
  DRAFT:       'DRF',
  QUOTE:       'QTN',
  INVOICE:     'INV',
  CREDIT_NOTE: 'CRN',
};

const PADDING_LENGTH = 4; // Zero-pad to 4 digits: 0001 … 9999

// ── Types ────────────────────────────────────────────────────────────────────

export interface SequenceResult {
  /** Full formatted document ID  e.g. "INV-VIN-0042" */
  documentId: string;
  /** The raw sequence number used (for logging/debugging) */
  sequenceNumber: number;
  /** The user prefix embedded in the ID (null if no prefix was set) */
  userPrefix: string | null;
}

// ── Service ──────────────────────────────────────────────────────────────────

export class UserPrefixSequencer {
  /**
   * Generate the next document number for a given user + branch + type.
   *
   * If the user has a `salesPrefix` set, the output is:
   *   `{TYPE_PREFIX}-{USER_PREFIX}-{NNNN}`
   * Otherwise falls back to the standard format:
   *   `{TYPE_PREFIX}-{NNNN}`
   *
   * @param userId   - ID of the salesperson creating the document
   * @param branchId - Branch the document belongs to
   * @param type     - SalesDocumentType (INVOICE | QUOTE | DRAFT | CREDIT_NOTE)
   * @returns SequenceResult with the formatted documentId
   */
  static async getNext(
    userId: string,
    branchId: string,
    type: SalesDocumentType,
  ): Promise<SequenceResult> {
    const typePrefix = DOCUMENT_TYPE_PREFIX[type];
    if (!typePrefix) {
      throw new AppError(
        ErrorCode.INVALID_INPUT,
        400,
        `Unsupported document type for sequencing: ${type}`,
      );
    }

    // Fetch the user's salesPrefix — do this OUTSIDE the transaction to keep
    // the critical section as short as possible.
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { salesPrefix: true, name: true },
    });

    if (!user) {
      throw new AppError(ErrorCode.NOT_FOUND, 404, `User ${userId} not found`);
    }

    const userPrefix = user.salesPrefix?.toUpperCase().trim() || null;

    // Validate prefix format: 2–5 uppercase alphanumeric characters
    if (userPrefix && !/^[A-Z0-9]{2,5}$/.test(userPrefix)) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        400,
        `Invalid salesPrefix "${userPrefix}" for user ${user.name}. Must be 2–5 uppercase alphanumeric characters.`,
      );
    }

    // Serializable transaction: read-increment-return atomically
    const { nextNumber } = await prisma.$transaction(
      async (tx) => {
        const existing = await tx.documentSequence.findUnique({
          where: { branchId_type: { branchId, type } },
        });

        let num: number;

        if (existing) {
          num = existing.nextNumber;
          await tx.documentSequence.update({
            where: { id: existing.id },
            data: { nextNumber: { increment: 1 } },
          });
        } else {
          num = 1;
          await tx.documentSequence.create({
            data: {
              branchId,
              type,
              prefix: userPrefix ?? typePrefix,
              nextNumber: 2,
            },
          });
        }

        await tx.user.update({
          where: { id: userId },
          data: { lastSequence: num },
        });

        return { nextNumber: num };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    // Format the document ID
    const paddedNum = String(nextNumber).padStart(PADDING_LENGTH, '0');
    const documentId = userPrefix
      ? `${typePrefix}-${userPrefix}-${paddedNum}`
      : `${typePrefix}-${paddedNum}`;

    logger.debug(
      { userId, branchId, type, documentId },
      'Sequencer: generated document ID',
    );

    return { documentId, sequenceNumber: nextNumber, userPrefix };
  }

  /**
   * Validate and normalise a candidate salesPrefix before persisting it.
   * Returns the cleaned prefix or throws AppError on invalid format.
   */
  static validatePrefix(raw: string): string {
    const clean = raw.trim().toUpperCase();
    if (!/^[A-Z0-9]{2,5}$/.test(clean)) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        400,
        `Sales prefix "${raw}" is invalid. Must be 2–5 uppercase letters or digits (e.g. "VIN", "JOH", "B01").`,
      );
    }
    return clean;
  }

  /**
   * Preview what the NEXT document ID will look like without consuming a
   * sequence number — useful for showing the user before they submit.
   */
  static async preview(
    userId: string,
    branchId: string,
    type: SalesDocumentType,
  ): Promise<string> {
    const typePrefix = DOCUMENT_TYPE_PREFIX[type];

    const [user, seq] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { salesPrefix: true },
      }),
      prisma.documentSequence.findUnique({
        where: { branchId_type: { branchId, type } },
        select: { nextNumber: true },
      }),
    ]);

    const userPrefix = user?.salesPrefix?.toUpperCase().trim() || null;
    const nextNum = seq?.nextNumber ?? 1;
    const padded = String(nextNum).padStart(PADDING_LENGTH, '0');

    return userPrefix
      ? `${typePrefix}-${userPrefix}-${padded}`
      : `${typePrefix}-${padded}`;
  }
}
