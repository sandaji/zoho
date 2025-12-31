
import { PrismaClient } from '@prisma/client';
import { PeriodService } from '../src/modules/finance/services/period.service';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting verification...');

  // 1. Find or create a user for testing
  const user = await prisma.user.findFirst();
  if (!user) {
    console.error('No user found');
    return;
  }
  console.log(`Using user: ${user.id}`);

  // 2. Find or create an open fiscal period for today
  let period = await prisma.fiscalPeriod.findFirst({
    where: {
      startDate: { lte: new Date() },
      endDate: { gte: new Date() },
    }
  });

  if (!period) {
    console.log('No current period found, initializing year...');
    await PeriodService.initializeFiscalYear(new Date().getFullYear());
    period = await prisma.fiscalPeriod.findFirst({
        where: {
          startDate: { lte: new Date() },
          endDate: { gte: new Date() },
        }
      });
  }

  if (!period) {
      console.error('Could not find or create period');
      return;
  }
  
  console.log(`Using period: ${period.id} (${period.name})`);

  // 3. Lock the period
  console.log('Locking period...');
  await PeriodService.lock(period.id, user.id);

  // 4. Verify Audit Log for Lock
  const lockLog = await prisma.auditLog.findFirst({
    where: {
        entityType: 'FiscalPeriod',
        entityId: period.id,
        action: 'UPDATE',
        // changes contains action: LOCK is tricky to query in prisma JSON directly sometimes, but finding latest is enough
    },
    orderBy: { timestamp: 'desc' }
  });

  if (lockLog && (lockLog.changes as any).action === 'LOCK') {
      console.log('✅ Audit Log for LOCK created successfully');
  } else {
      console.error('❌ Failed to create Audit Log for LOCK', lockLog);
  }

  // 5. Unlock the period
  console.log('Unlocking period...');
  await PeriodService.unlock(period.id, user.id);

  // 6. Verify Audit Log for Unlock
  const unlockLog = await prisma.auditLog.findFirst({
    where: {
        entityType: 'FiscalPeriod',
        entityId: period.id,
        action: 'UPDATE',
    },
    orderBy: { timestamp: 'desc' }
  });

  if (unlockLog && (unlockLog.changes as any).action === 'UNLOCK') {
      console.log('✅ Audit Log for UNLOCK created successfully');
  } else {
      console.error('❌ Failed to create Audit Log for UNLOCK', unlockLog);
  }

  console.log('Verification finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
