/**
 * RBAC Configuration - Scalable Permission Packs & Role Blueprints
 */

/**
 * Permission Packs - Logical groupings of individual permission codes.
 * This prevents duplication and makes it easier to assign "bundles" of access.
 */
export const PERMISSION_PACKS = {
  HR_ADMIN: [
    'hr.employee.manage',
    'hr.employee.view',
    'hr.payroll.manage',
    'hr.payroll.view',
    'hr.recruitment.manage',
    'hr.recruitment.view',
  ],
  HR_VIEWER: [
    'hr.employee.view',
    'hr.payroll.view',
    'hr.recruitment.view',
  ],
  FINANCE_MANAGER: [
    'finance.invoice.create',
    'finance.invoice.view',
    'finance.invoice.approve',
    'finance.payment.create',
    'finance.payment.view',
    'finance.reports.view',
    'finance.gl.manage',
    'finance.gl.view',
  ],
  FINANCE_CLERK: [
    'finance.invoice.create',
    'finance.invoice.view',
    'finance.payment.create',
    'finance.payment.view',
  ],
  SALES_FULL: [
    'sales.order.create',
    'sales.order.view',
    'sales.order.view_all',
    'sales.order.manage',
    'sales.customer.manage',
    'sales.customer.view',
  ],
  INVENTORY_ADMIN: [
    'inventory.product.manage',
    'inventory.product.view',
    'inventory.stock.adjust',
    'inventory.stock.view',
    'inventory.warehouse.manage',
    'inventory.warehouse.view',
  ],
};

/**
 * Role Blueprints - Templates for system roles.
 * A blueprint can combine multiple packs and individual permissions.
 */
export const ROLE_BLUEPRINTS = {
  BRANCH_MANAGER: {
    description: 'Manages operations, HR, and sales at a branch level',
    packs: [
      PERMISSION_PACKS.SALES_FULL,
      PERMISSION_PACKS.HR_VIEWER,
    ],
    individual: [
      'inventory.stock.view',
      'finance.reports.view',
    ],
  },
  WAREHOUSE_MANAGER: {
    description: 'Manages stock and warehouse operations',
    packs: [
      PERMISSION_PACKS.INVENTORY_ADMIN,
    ],
    individual: [
      'sales.order.view_all',
    ],
  },
  ACCOUNTANT: {
    description: 'Handles financial recording and reporting',
    packs: [
      PERMISSION_PACKS.FINANCE_MANAGER,
    ],
    individual: [
      'sales.order.view_all',
    ],
  },
};
