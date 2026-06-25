/**
 * VAT Service - Kenya VAT Compliance
 * Handles Input/Output VAT tracking, eTIMS integration, and VAT3 return generation
 */

import { prisma } from "../../../lib/db";
import { Decimal } from "@prisma/client/runtime/library";
import { VATType, Prisma } from "../../../generated";
import { logger } from "../../../lib/logger";

export interface VATTransactionInput {
  vatType: VATType;
  sourceType: string;
  sourceId: string;
  sourceLineId?: string;
  taxableAmount: Decimal;
  vatRate: Decimal;
  vatAmount: Decimal;
  isClaimable?: boolean;
  branchId: string;
  createdBy: string;
}

export interface VAT3ReturnData {
  period: string;
  outputVAT: {
    taxableSupplies: Decimal | null;
    vatAmount: Decimal | null;
  };
  inputVAT: {
    claimablePurchases: Decimal | null;
    vatAmount: Decimal | null;
  };
  vatPayable: Decimal;
}

export class VATService {
  /**
   * Generate unique VAT transaction number
   */
  private static async generateVTNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await prisma.vATTransaction.count({
      where: {
        created_at: {
          gte: new Date(year, 0, 1),
          lt: new Date(year + 1, 0, 1),
        },
      },
    });
    return `VT-${year}-${(count + 1).toString().padStart(6, "0")}`;
  }

  /**
   * Record a VAT transaction
   */
  static async recordVATTransaction(
    tx: Prisma.TransactionClient,
    data: VATTransactionInput
  ) {
    const transactionNo = await this.generateVTNumber();

    return await tx.vATTransaction.create({
      data: {
        transaction_no: transactionNo,
        vat_type: data.vatType,
        source_type: data.sourceType,
        source_id: data.sourceId,
        source_line_id: data.sourceLineId,
        taxable_amount: data.taxableAmount,
        vat_rate: data.vatRate,
        vat_amount: data.vatAmount,
        is_claimable: data.isClaimable ?? true,
        branch_id: data.branchId,
        created_by: data.createdBy,
      },
    });
  }

  /**
   * Record Output VAT from a sales invoice
   */
  static async recordOutputVAT(
    tx: Prisma.TransactionClient,
    data: {
      salesDocumentId: string;
      branchId: string;
      taxableAmount: Decimal;
      vatRate: Decimal;
      vatAmount: Decimal;
      userId: string;
    }
  ) {
    return await this.recordVATTransaction(tx, {
      vatType: VATType.OUTPUT,
      sourceType: "SALES_DOCUMENT",
      sourceId: data.salesDocumentId,
      taxableAmount: data.taxableAmount,
      vatRate: data.vatRate,
      vatAmount: data.vatAmount,
      isClaimable: false, // Output VAT is not claimable
      branchId: data.branchId,
      createdBy: data.userId,
    });
  }

  /**
   * Record Input VAT from a purchase
   */
  static async recordInputVAT(
    tx: Prisma.TransactionClient,
    data: {
      purchaseOrderId: string;
      branchId: string;
      taxableAmount: Decimal;
      vatRate: Decimal;
      vatAmount: Decimal;
      isClaimable?: boolean;
      userId: string;
    }
  ) {
    return await this.recordVATTransaction(tx, {
      vatType: VATType.INPUT,
      sourceType: "PURCHASE_ORDER",
      sourceId: data.purchaseOrderId,
      taxableAmount: data.taxableAmount,
      vatRate: data.vatRate,
      vatAmount: data.vatAmount,
      isClaimable: data.isClaimable ?? true,
      branchId: data.branchId,
      createdBy: data.userId,
    });
  }

  /**
   * Generate Kenya VAT3 Return
   */
  static async generateVAT3Return(period: string): Promise<VAT3ReturnData> {
    // Output VAT (Sales)
    const outputVAT = await prisma.vATTransaction.aggregate({
      where: {
        vat_type: VATType.OUTPUT,
        claim_period: period,
      },
      _sum: {
        taxable_amount: true,
        vat_amount: true,
      },
    });

    // Input VAT (Purchases) - claimable only
    const inputVAT = await prisma.vATTransaction.aggregate({
      where: {
        vat_type: VATType.INPUT,
        claim_period: period,
        is_claimable: true,
      },
      _sum: {
        taxable_amount: true,
        vat_amount: true,
      },
    });

    const vatPayable = (outputVAT._sum.vat_amount || new Decimal(0)).minus(
      inputVAT._sum.vat_amount || new Decimal(0)
    );

    return {
      period,
      outputVAT: {
        taxableSupplies: outputVAT._sum.taxable_amount,
        vatAmount: outputVAT._sum.vat_amount,
      },
      inputVAT: {
        claimablePurchases: inputVAT._sum.taxable_amount,
        vatAmount: inputVAT._sum.vat_amount,
      },
      vatPayable,
    };
  }

  /**
   * Mark Input VAT as claimed
   */
  static async claimInputVAT(
    transactionIds: string[],
    claimPeriod: string
  ) {
    return await prisma.vATTransaction.updateMany({
      where: {
        id: {
          in: transactionIds,
        },
        vat_type: VATType.INPUT,
        is_claimable: true,
      },
      data: {
        claimed_date: new Date(),
        claim_period: claimPeriod,
      },
    });
  }

  /**
   * Get pending eTIMS sync transactions
   */
  static async getPendingETIMSSync(limit: number = 100) {
    return await prisma.vATTransaction.findMany({
      where: {
        etims_synced: false,
        etims_error: null,
      },
      take: limit,
      orderBy: {
        created_at: "asc",
      },
    });
  }

  /**
   * Mark transaction as synced with eTIMS
   */
  static async markETIMSSynced(
    transactionId: string,
    data: {
      cuin: string;
      cusn: string;
      qrCode: string;
    }
  ) {
    return await prisma.vATTransaction.update({
      where: {
        id: transactionId,
      },
      data: {
        etims_synced: true,
        etims_synced_at: new Date(),
        etims_cuin: data.cuin,
        etims_cusn: data.cusn,
        etims_qr_code: data.qrCode,
      },
    });
  }

  /**
   * Record eTIMS sync error
   */
  static async recordETIMSError(
    transactionId: string,
    errorMessage: string
  ) {
    return await prisma.vATTransaction.update({
      where: {
        id: transactionId,
      },
      data: {
        etims_error: errorMessage,
      },
    });
  }
}
