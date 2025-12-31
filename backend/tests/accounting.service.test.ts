// backend/tests/accounting.service.test.ts
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { AccountingService, DEFAULT_ACCOUNTS } from '../src/modules/finance/services/accounting.service';
import { prisma } from '../src/lib/db';
import { AccountType } from '../src/generated/enums';

// Mock Prisma
jest.mock('../src/lib/db', () => ({
  prisma: {
    chartOfAccount: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    journalEntry: {
      create: jest.fn(),
    },
  },
}));

describe('AccountingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getEnsureAccount', () => {
    it('should return existing account if found', async () => {
      const mockAccount = { id: 'acc-1', ...DEFAULT_ACCOUNTS.CASH_ON_HAND };
      (prisma.chartOfAccount.findUnique as jest.Mock).mockResolvedValue(mockAccount);

      const result = await AccountingService.getEnsureAccount(DEFAULT_ACCOUNTS.CASH_ON_HAND);

      expect(prisma.chartOfAccount.findUnique).toHaveBeenCalledWith({
        where: { account_code: DEFAULT_ACCOUNTS.CASH_ON_HAND.code },
      });
      expect(prisma.chartOfAccount.create).not.toHaveBeenCalled();
      expect(result).toEqual(mockAccount);
    });

    it('should create new account if not found', async () => {
      (prisma.chartOfAccount.findUnique as jest.Mock).mockResolvedValue(null);
      const mockCreatedAccount = { id: 'acc-new', ...DEFAULT_ACCOUNTS.CASH_ON_HAND };
      (prisma.chartOfAccount.create as jest.Mock).mockResolvedValue(mockCreatedAccount);

      const result = await AccountingService.getEnsureAccount(DEFAULT_ACCOUNTS.CASH_ON_HAND);

      expect(prisma.chartOfAccount.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          account_code: DEFAULT_ACCOUNTS.CASH_ON_HAND.code,
          account_name: DEFAULT_ACCOUNTS.CASH_ON_HAND.name,
        }),
      });
      expect(result).toEqual(mockCreatedAccount);
    });
  });

  describe('recordSaleTransaction', () => {
    it('should create balanced journal entries for a sale', async () => {
      // Mock accounts
      const mockAssetAccount = { id: 'asset-1' };
      const mockRevenueAccount = { id: 'rev-1' };
      const mockTaxAccount = { id: 'tax-1' };

      // Spy on getEnsureAccount (internal call)
      // Since it's a static method, we can mock the prisma calls it makes instead
      (prisma.chartOfAccount.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockRevenueAccount) // Revenue
        .mockResolvedValueOnce(mockTaxAccount) // Tax
        .mockResolvedValueOnce(mockAssetAccount); // Asset

      const mockTx = {
        journalEntry: { create: jest.fn().mockResolvedValue({ id: 'je-1' }) },
        chartOfAccount: { update: jest.fn() },
      };

      const saleData = {
        saleId: 'SALE-001',
        date: new Date('2025-01-01'),
        amountPaid: 1160,
        paymentMethod: 'cash',
        subtotal: 1000,
        tax: 160,
        total: 1160,
        userId: 'user-1',
        branchId: 'branch-1',
      };

      await AccountingService.recordSaleTransaction(mockTx, saleData);

      // Verify Journal Entries
      expect(mockTx.journalEntry.create).toHaveBeenCalledTimes(3);

      // 1. Debit Asset
      expect(mockTx.journalEntry.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          account_id: 'asset-1',
          debit: 1160,
          credit: 0,
          description: expect.stringContaining('POS Sale Collection'),
        }),
      }));

      // 2. Credit Revenue
      expect(mockTx.journalEntry.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          account_id: 'rev-1',
          credit: 1000, // 1160 - 160 tax
        }),
      }));

      // 3. Credit Tax
      expect(mockTx.journalEntry.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          account_id: 'tax-1',
          credit: 160,
        }),
      }));

      // Verify Balance Updates
      expect(mockTx.chartOfAccount.update).toHaveBeenCalledTimes(3);
    });
  });
});
