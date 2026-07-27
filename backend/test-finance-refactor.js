import { JournalEntryService } from './src/modules/finance/services/journal-entry.service.ts';
import { AccountingService } from './src/modules/finance/services/accounting.service.ts';
import { GeneralLedgerService } from './src/modules/finance/services/gl.service.ts';
import { PayablesService } from './src/modules/finance/services/payables.service.ts';
import { ReceivablesService } from './src/modules/finance/services/receivables.service.ts';

console.log("JournalEntryService.createJournalEntry:", typeof JournalEntryService.createJournalEntry);
console.log("JournalEntryService.getBalanceSheet:", typeof JournalEntryService.getBalanceSheet);
console.log("JournalEntryService.getIncomeStatement:", typeof JournalEntryService.getIncomeStatement);
console.log("JournalEntryService.getCashFlow:", typeof JournalEntryService.getCashFlow);
console.log("JournalEntryService.getTrialBalance:", typeof JournalEntryService.getTrialBalance);

console.log("AccountingService.recordSaleTransaction:", typeof AccountingService.recordSaleTransaction);
console.log("AccountingService.getBalanceSheet:", typeof AccountingService.getBalanceSheet);

console.log("GeneralLedgerService.createManualEntry:", typeof GeneralLedgerService.createManualEntry);
console.log("GeneralLedgerService.getLedgerEntries:", typeof GeneralLedgerService.getLedgerEntries);

console.log("PayablesService.recordPayment:", typeof PayablesService.recordPayment);
console.log("ReceivablesService.recordPayment:", typeof ReceivablesService.recordPayment);

console.log("All finance refactor modules imported and verified successfully!");
