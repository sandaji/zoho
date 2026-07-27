import { PrismaClient } from '../src/generated';
import { PeriodService } from '../src/modules/finance/services/period.service';

const prisma = new PrismaClient();

async function main() {
  console.log('Initializing fiscal year 2026...');
  try {
    const result = await PeriodService.initializeFiscalYear(2026);
    console.log('Fiscal year 2026 initialized successfully:', result);
  } catch (error) {
    console.error('Error initializing fiscal year:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
