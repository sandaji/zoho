import 'dotenv/config';
import { prisma } from '../src/lib/db';
import { LeaveStatus } from '../src/generated/client';

async function main() {
  console.log('Seeding Leave Types...');

  const types = [
    { name: 'Annual Leave', daysAllowed: 20, description: 'Paid vacation leave' },
    { name: 'Sick Leave', daysAllowed: 10, description: 'Medical leave' },
    { name: 'Unpaid Leave', daysAllowed: 365, description: 'Leave without pay' },
    { name: 'Casual Leave', daysAllowed: 5, description: 'Short duration emergency leave' },
  ];

  for (const t of types) {
    await prisma.leaveType.upsert({
      where: { name: t.name },
      update: {},
      create: t,
    });
  }

  console.log('Leave Types seeded!');

  // Also allocate annual leave to a specific user if userId is provided or found
  const user = await prisma.user.findFirst();
  if (user) {
    console.log(`Allocating leave for user: ${user.email}`);
    const annualType = await prisma.leaveType.findUnique({ where: { name: 'Annual Leave' } });
    if (annualType) {
      await prisma.leaveAllocation.upsert({
        where: {
          userId_leaveTypeId_year: {
            userId: user.id,
            leaveTypeId: annualType.id,
            year: 2024
          }
        },
        update: {},
        create: {
          userId: user.id,
          leaveTypeId: annualType.id,
          year: 2024,
          allocated: 20
        }
      });
      console.log('Allocation created for 2024.');
    }
  }

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
