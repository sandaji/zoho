/**
 * Validation schemas for Cashier Session operations
 *
 * Used to validate request payloads before processing.
 * Can be expanded with Zod, Joi, or any validation library.
 */

/**
 * Validate Open Session Request
 */
export function validateOpenSession(input: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!input.openingBalance) {
    errors.push('openingBalance is required');
  } else if (typeof input.openingBalance !== 'number' || input.openingBalance < 0) {
    errors.push('openingBalance must be a positive number');
  }

  if (input.openingBalance > 1000000) {
    errors.push('openingBalance seems unreasonably high (max 1,000,000)');
  }

  if (input.notes && typeof input.notes !== 'string') {
    errors.push('notes must be a string');
  }

  if (input.notes && input.notes.length > 500) {
    errors.push('notes must be less than 500 characters');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate Close Session Request
 */
export function validateCloseSession(input: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!input.actualCash && input.actualCash !== 0) {
    errors.push('actualCash is required');
  } else if (typeof input.actualCash !== 'number' || input.actualCash < 0) {
    errors.push('actualCash must be a positive number');
  }

  if (input.actualCash > 1000000) {
    errors.push('actualCash seems unreasonably high (max 1,000,000)');
  }

  if (input.notes && typeof input.notes !== 'string') {
    errors.push('notes must be a string');
  }

  if (input.notes && input.notes.length > 500) {
    errors.push('notes must be less than 500 characters');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate Reconcile Session Request
 */
export function validateReconcileSession(input: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (input.notes && typeof input.notes !== 'string') {
    errors.push('notes must be a string');
  }

  if (input.notes && input.notes.length > 1000) {
    errors.push('notes must be less than 1000 characters');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate Session List Query
 */
export function validateSessionListQuery(input: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const validStatuses = ['OPEN', 'CLOSED', 'DISCREPANCY', 'RECONCILED'];

  if (input.status && !validStatuses.includes(input.status)) {
    errors.push(`status must be one of: ${validStatuses.join(', ')}`);
  }

  if (input.page && (typeof input.page !== 'number' || input.page < 1)) {
    errors.push('page must be a positive number');
  }

  if (input.pageSize && (typeof input.pageSize !== 'number' || input.pageSize < 1 || input.pageSize > 100)) {
    errors.push('pageSize must be between 1 and 100');
  }

  if (input.fromDate && isNaN(Date.parse(input.fromDate))) {
    errors.push('fromDate must be a valid ISO date');
  }

  if (input.toDate && isNaN(Date.parse(input.toDate))) {
    errors.push('toDate must be a valid ISO date');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate Session ID (UUID)
 */
export function validateSessionId(sessionId: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!sessionId || typeof sessionId !== 'string') {
    errors.push('sessionId is required and must be a string');
  } else if (!/^[a-z0-9]+$/.test(sessionId)) {
    errors.push('sessionId format is invalid');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
