/**
 * Helper utilities for Express request type safety
 * Solves issues with req.params and req.query being typed as string | string[]
 */

import { Request } from 'express';

/**
 * Safely extract a string parameter from req.params
 * Cast to string, handling array case by taking first element
 */
export function getParamAsString(paramValue: string | string[] | undefined): string {
  if (Array.isArray(paramValue)) {
    return paramValue[0];
  }
  return paramValue || '';
}

/**
 * Safely extract a string query parameter
 * Returns undefined if not present or empty
 */
export function getQueryAsString(queryValue: any): string | undefined {
  if (Array.isArray(queryValue)) {
    return queryValue[0] || undefined;
  }
  return queryValue || undefined;
}

/**
 * Safely extract a number from query parameter
 */
export function getQueryAsNumber(queryValue: any): number | undefined {
  const str = getQueryAsString(queryValue);
  if (!str) return undefined;
  const num = parseInt(str);
  return isNaN(num) ? undefined : num;
}

