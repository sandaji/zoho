// backend/src/types/sales.types.ts
import { z } from 'zod';
import { 
  createSalesDocumentSchema, 
  listDocumentsQuerySchema,
  createCreditNoteSchema,
  convertDocumentSchema
} from '../modules/pos/sales.validation';

export type CreateSalesDocumentInput = z.infer<typeof createSalesDocumentSchema>;
export type ListDocumentsQuery = z.infer<typeof listDocumentsQuerySchema>;
export type CreateCreditNoteInput = z.infer<typeof createCreditNoteSchema>;
export type ConvertDocumentInput = z.infer<typeof convertDocumentSchema>;
