// backend/src/modules/sequences/sequence.service.ts
import { prisma } from '../../lib/db';
import { SalesDocumentType } from '../../generated/enums';
import { Prisma } from '../../generated/client';

const DOCUMENT_PREFIX_MAP: Record<SalesDocumentType, string> = {
  DRAFT: 'DRF',
  QUOTE: 'QTN',
  INVOICE: 'INV',
  CREDIT_NOTE: 'CRN',
};

const PADDING_LENGTH = 4;

export class SequenceService {
  static async getNextNumber(
    type: SalesDocumentType,
    branchId: string
  ): Promise<string> {
    const prefix = DOCUMENT_PREFIX_MAP[type];
    if (!prefix) {
      throw new Error(`Invalid document type: ${type}`);
    }

    // Using a serializable transaction is crucial to prevent race conditions.
    // This ensures that the read and update operations are treated as a single,
    // atomic unit, preventing other transactions from reading the same `nextNumber`
    // before it has been incremented.
    const sequence = await prisma.$transaction(
      async (tx) => {
        // 1. Find the sequence record for the given branch and type, and lock it.
        const currentSequence = await tx.documentSequence.findUnique({
          where: { branchId_type: { branchId, type } },
        });

        let nextNumber: number;

        if (currentSequence) {
          // 2a. If it exists, use its number and increment for the next call.
          nextNumber = currentSequence.nextNumber;
          await tx.documentSequence.update({
            where: { id: currentSequence.id },
            data: { nextNumber: { increment: 1 } },
          });
        } else {
          // 2b. If it's the first time, create the sequence record starting at 1.
          nextNumber = 1;
          await tx.documentSequence.create({
            data: {
              branchId,
              type,
              prefix,
              nextNumber: 2, // The next one to be generated will be 2
            },
          });
        }

        return { nextNumber };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }
    );

    // 3. Format the number with prefix and zero-padding.
    const paddedNumber = String(sequence.nextNumber).padStart(PADDING_LENGTH, '0');
    return `${prefix}-${paddedNumber}`;
  }
}
