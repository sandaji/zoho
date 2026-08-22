// backend/src/modules/sequences/sequence.service.ts
import { prisma } from "../../lib/db";
import { SalesDocumentType } from "../../generated/enums.js";
import { Prisma } from "../../generated/index.js";

const DOCUMENT_PREFIX_MAP: Record<SalesDocumentType, string> = {
  DRAFT: "DRF",
  QUOTE: "QTN",
  INVOICE: "INV",
  OPEN_INVOICE: "INV",
  CLOSED_INVOICE: "INV",
  CREDIT_NOTE: "CRN",
};

const PADDING_LENGTH = 4;

export class SequenceService {
  static async getNextNumber(
    type: SalesDocumentType | "TRANSFER",
    branchId: string,
  ): Promise<string> {
    const normalizedType = type === "TRANSFER" ? "DRAFT" : type;
    const prefix = DOCUMENT_PREFIX_MAP[normalizedType];
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
        // Must use normalizedType here too — DocumentSequence.type is a
        // SalesDocumentType enum column with no "TRANSFER" value, so
        // passing the raw `type` ("TRANSFER") failed Prisma validation even
        // though the create() call below already normalized it correctly.
        const currentSequence = await tx.documentSequence.findUnique({
          where: { branchId_type: { branchId, type: normalizedType } },
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
              type: normalizedType,
              prefix,
              nextNumber: 2, // The next one to be generated will be 2
            },
          });
        }

        return { nextNumber };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        // Audit-logging middleware wraps every query (including those run
        // inside this tx), and Serializable isolation means concurrent
        // callers for the same branchId+type contend for one row. The
        // Prisma defaults (maxWait 2s, timeout 5s) are too tight for that
        // combination under load, so give this transaction more headroom.
        maxWait: 10000,
        timeout: 15000,
      },
    );

    // 3. Format the number with prefix and zero-padding.
    const paddedNumber = String(sequence.nextNumber).padStart(
      PADDING_LENGTH,
      "0",
    );
    return `${prefix}-${paddedNumber}`;
  }
}
