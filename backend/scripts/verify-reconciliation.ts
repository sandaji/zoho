
// backend/scripts/verify-reconciliation.ts
import 'dotenv/config';
import { prisma } from '../src/lib/db';
import { BankService } from '../src/modules/finance/services/bank.service';
import { AccountingService } from '../src/modules/finance/services/accounting.service';

async function main() {
  console.log('--- Starting Bank Reconciliation Verification ---');

  const bankService = new BankService();
  const testId = `RECON-TEST-${Date.now()}`;
  let accountId = "";
  let journalEntryId = "";
  let bankLineId = "";

  try {
    // 1. Get or Create a Bank Account
    const accounts = await AccountingService.getBankAccounts();
    if (accounts.length === 0) {
        // Create a dummy bank account for test
        const acc = await prisma.chartOfAccount.create({
            data: {
                account_code: `BANK-${testId}`,
                account_name: 'Test Bank Account',
                account_type: 'asset',
                category: 'Asset',
                subcategory: 'Bank',
                current_balance: 1000
            }
        });
        accountId = acc.id;
    } else {
        accountId = accounts[0].id;
    }
    console.log('1. Using Account:', accountId);

    // 2. Create a System Transaction (POS Sale or Manual JE)
    const je = await prisma.journalEntry.create({
        data: {
            entry_no: `JE-${testId}`,
            account_id: accountId,
            debit: 500, // Debit Bank = Deposit
            credit: 0,
            description: `Sales Deposit ${testId}`,
            is_reconciled: false,
            created_by: 'verifier'
        }
    });
    journalEntryId = je.id;
    console.log('2. Created Journal Entry:', journalEntryId);

    // 3. Simulating CSV Upload
    const csvContent = `Date,Description,Amount\n${new Date().toISOString()},Deposit from Sales,500`;
    console.log('3. Importing CSV Statement...');
    await bankService.importStatement(accountId, csvContent, 'test-statement.csv', 'verifier');
    
    // 4. Fetch Reconciliation Data
    console.log('4. Fetching Reconciliation Data...');
    const reconData = await bankService.getReconciliationData(accountId);
    
    const matchedLine = reconData.bankLines.find(l => l.amount === 500);
    if (!matchedLine) throw new Error("Import failed or Line not found");
    bankLineId = matchedLine.id;
    console.log('   Found Bank Line:', bankLineId);
    
    const matchedJe = reconData.ledgerEntries.find(e => e.id === journalEntryId);
    if (!matchedJe) throw new Error("Journal Entry not found in reconciliation list");
    console.log('   Found Ledger Entry in list');

    // 5. Reconcile
    console.log('5. Reconciling Item...');
    await bankService.reconcileItems(bankLineId, journalEntryId);
    
    // 6. Verify result
    const checkLine = await prisma.bankStatementLine.findUnique({ where: { id: bankLineId } });
    const checkJe = await prisma.journalEntry.findUnique({ where: { id: journalEntryId } });
    
    if (checkLine?.is_reconciled && checkJe?.is_reconciled) {
        console.log('SUCCESS: Both records marked as reconciled.');
    } else {
        throw new Error('Verification Failed: Records not reconciled.');
    }

  } catch (error) {
      console.error('Verification Error:', error);
  } finally {
      // Cleanup
      console.log('Cleaning up...');
      if (bankLineId) {
          // Cascade delete from statement?
          // Find statement
          const line = await prisma.bankStatementLine.findUnique({ where: { id: bankLineId } });
          if (line) {
              await prisma.bankStatement.delete({ where: { id: line.statement_id } });
          }
      }
      if (journalEntryId) {
          await prisma.journalEntry.delete({ where: { id: journalEntryId } });
      }
      if (accountId && accountId.includes(testId)) { // Only delete if we created it
          await prisma.chartOfAccount.delete({ where: { id: accountId } });
      }
      console.log('Done.');
  }
}

main();
