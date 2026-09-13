/**
 * Company Configuration
 *
 * Provides company-wide defaults loaded from environment variables.
 * These are used as fallbacks when a branch has no address/phone set.
 *
 * To override per-branch, set address/phone on the Branch record in the DB.
 * To override globally, update the COMPANY_* vars in your .env file.
 */

export interface BankDetails {
  bankName: string;
  accountName: string;
  accountNumber: string;
  bankCode: string;
  branchCode: string;
  paybillNo: string;
  paybillAccount: string;
}

export interface CompanyInfo {
  name: string;
  address: string;
  phone: string[];
  email: string;
  pin: string;
  bankDetails: BankDetails;
}

/**
 * Build company info for a given branch.
 * Branch DB fields take priority — env vars are the fallback.
 */
export function getCompanyInfo(branch?: {
  name?: string | null;
  address?: string | null;
  phone?: string | null;
}): CompanyInfo {
  const primaryPhone =
    branch?.phone ||
    process.env.COMPANY_PHONE_PRIMARY ||
    "+254 711 611 971";

  const secondaryPhone = process.env.COMPANY_PHONE_SECONDARY || "+254 738 382 930";

  return {
    name:
      branch?.name ||
      process.env.COMPANY_NAME ||
      "Zoho Corporation Ltd",

    address:
      branch?.address ||
      process.env.COMPANY_ADDRESS ||
      "Enterprise Road 32, Nairobi, Kenya",

    // Always include both phones; deduplicate if primary === secondary
    phone:
      primaryPhone === secondaryPhone
        ? [primaryPhone]
        : [primaryPhone, secondaryPhone],

    email: process.env.COMPANY_EMAIL || "info@zoho.co.ke",

    pin: process.env.COMPANY_PIN || "P123456789X",

    bankDetails: {
      bankName:
        process.env.COMPANY_BANK_NAME || "KENYA COMMERCIAL BANK",
      accountName:
        process.env.COMPANY_BANK_ACCOUNT_NAME || "ZOHO CORPORATION LTD",
      accountNumber:
        process.env.COMPANY_BANK_ACCOUNT_NUMBER || "00600877812636",
      bankCode: process.env.COMPANY_BANK_CODE || "57",
      branchCode: process.env.COMPANY_BANK_BRANCH_CODE || "057",
      paybillNo: process.env.COMPANY_BANK_PAYBILL || "542542",
      paybillAccount:
        process.env.COMPANY_BANK_PAYBILL_ACCOUNT || "999000",
    },
  };
}

/** Convenience export — company defaults with no branch override */
export const defaultCompanyInfo: CompanyInfo = getCompanyInfo();
