/**
 * Test file to verify financial calculations are rounded to whole numbers
 * to prevent floating-point precision errors
 */

import { describe, it, expect } from '@jest/globals';
import {
  calculateItemTotals,
  calculateDocumentTotals,
  calculateSubtotal,
  calculateTax,
} from '../../src/lib/sales-calculator';

describe('Sales Calculator - Rounding Tests', () => {
  describe('calculateItemTotals', () => {
    it('should round all amounts to whole numbers', () => {
      const item = {
        quantity: 2,
        unitPrice: 15.99,
        taxRate: 0.16,
        discount: 2.50,
      };

      const result = calculateItemTotals(item);

      expect(result.subtotal).toBe(32); // 2 * 15.99 = 31.98, rounded to 32
      expect(result.taxAmount).toBe(5); // 32 * 0.16 = 5.12, rounded to 5
      expect(result.discount).toBe(3); // 2.50, rounded to 3
      expect(result.total).toBe(34); // 32 + 5 - 3 = 34
    });

    it('should handle zero tax rate', () => {
      const item = {
        quantity: 3,
        unitPrice: 10.50,
        taxRate: 0,
        discount: 0,
      };

      const result = calculateItemTotals(item);

      expect(result.subtotal).toBe(32); // 3 * 10.50 = 31.5, rounded to 32
      expect(result.taxAmount).toBe(0);
      expect(result.discount).toBe(0);
      expect(result.total).toBe(32);
    });

    it('should handle floating-point precision issues', () => {
      const item = {
        quantity: 7,
        unitPrice: 3.14,
        taxRate: 0.16,
        discount: 1.99,
      };

      const result = calculateItemTotals(item);

      expect(result.subtotal).toBe(22); // 7 * 3.14 = 21.98, rounded to 22
      expect(result.taxAmount).toBe(4); // 22 * 0.16 = 3.52, rounded to 4
      expect(result.discount).toBe(2); // 1.99, rounded to 2
      expect(result.total).toBe(24); // 22 + 4 - 2 = 24
    });
  });

  describe('calculateDocumentTotals', () => {
    it('should round total to whole number', () => {
      const lines = [
        { subtotal: 100.50, taxAmount: 16.08, discount: 5.99 },
        { subtotal: 200.75, taxAmount: 32.12, discount: 10.50 },
      ];

      const result = calculateDocumentTotals(lines);

      expect(result.subtotal).toBe(301); // 100.50 + 200.75 = 301.25, not rounded in subtotal
      expect(result.tax).toBe(48); // 16.08 + 32.12 = 48.20, not rounded in tax
      expect(result.discount).toBe(16); // 5.99 + 10.50 = 16.49, not rounded in discount
      expect(result.total).toBe(333); // 301 + 48 - 16 = 333, rounded
    });

    it('should handle single line', () => {
      const lines = [
        { subtotal: 50.25, taxAmount: 8.04, discount: 2.50 },
      ];

      const result = calculateDocumentTotals(lines);

      expect(result.subtotal).toBe(50);
      expect(result.tax).toBe(8);
      expect(result.discount).toBe(3);
      expect(result.total).toBe(55); // 50 + 8 - 3 = 55
    });
  });

  describe('calculateSubtotal', () => {
    it('should round subtotal to whole number', () => {
      const items = [
        { quantity: 2, unitPrice: 15.99 },
        { quantity: 3, unitPrice: 10.50 },
      ];

      const result = calculateSubtotal(items);

      expect(result).toBe(64); // (2 * 15.99) + (3 * 10.50) = 31.98 + 31.50 = 63.48, rounded to 64
    });
  });

  describe('calculateTax', () => {
    it('should round tax to whole number', () => {
      const items = [
        { quantity: 2, unitPrice: 15.99, taxRate: 0.16, discount: 2.50 },
        { quantity: 3, unitPrice: 10.50, taxRate: 0.16, discount: 1.00 },
      ];

      const result = calculateTax(items);

      // First item: (31.98 - 2.50) * 0.16 = 4.7168
      // Second item: (31.50 - 1.00) * 0.16 = 4.88
      // Total: 9.5968, rounded to 10
      expect(result).toBe(10);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small decimal amounts', () => {
      const item = {
        quantity: 1,
        unitPrice: 0.01,
        taxRate: 0.16,
        discount: 0.01,
      };

      const result = calculateItemTotals(item);

      expect(result.subtotal).toBe(0); // 0.01, rounded to 0
      expect(result.taxAmount).toBe(0); // 0 * 0.16 = 0
      expect(result.discount).toBe(0); // 0.01, rounded to 0
      expect(result.total).toBe(0);
    });

    it('should handle large amounts', () => {
      const item = {
        quantity: 1000,
        unitPrice: 99.99,
        taxRate: 0.16,
        discount: 1000.50,
      };

      const result = calculateItemTotals(item);

      expect(result.subtotal).toBe(99990); // 1000 * 99.99 = 99990, rounded
      expect(result.taxAmount).toBe(15998); // 99990 * 0.16 = 15998.4, rounded to 15998
      expect(result.discount).toBe(1001); // 1000.50, rounded to 1001
      expect(result.total).toBe(114987); // 99990 + 15998 - 1001 = 114987
    });
  });
});
