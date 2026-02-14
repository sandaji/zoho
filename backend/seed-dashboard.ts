/**
 * Seed test data for finance dashboard
 */

import { prisma } from './src/lib/db';

async function main() {
  console.log('🌱 Seeding finance dashboard test data...');

  // Clear existing data
  await prisma.financeTransaction.deleteMany();
  await prisma.savingsGoal.deleteMany();
  await prisma.dailySpendingLimit.deleteMany();

  // Create test transactions
  const now = new Date();
  const transactions = [];

  // Create some expense transactions for the last 30 days
  for (let i = 0; i < 20; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - Math.floor(Math.random() * 30));

    const categories = [
      'food',
      'utilities',
      'shopping',
      'internet',
      'payroll',
      'rent',
      'supplies',
      'marketing',
    ];
    const amounts = [5000, 12500, 25000, 45000, 75000, 100000, 150000];

    transactions.push({
      type: 'expense' as const,
      reference_no: `EXP-${Date.now()}-${i}`,
      description: `Expense transaction ${i + 1}`,
      amount: amounts[Math.floor(Math.random() * amounts.length)],
      category: categories[Math.floor(Math.random() * categories.length)],
      transactionDate: date,
      payment_method: ['cash', 'card', 'transfer'][Math.floor(Math.random() * 3)],
      notes: `Test expense ${i + 1}`,
    });
  }

  // Create some income transactions
  for (let i = 0; i < 10; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - Math.floor(Math.random() * 30));

    transactions.push({
      type: 'income' as const,
      reference_no: `INC-${Date.now()}-${i}`,
      description: `Income transaction ${i + 1}`,
      amount: [50000, 100000, 150000, 200000][Math.floor(Math.random() * 4)],
      category: 'income',
      transactionDate: date,
      payment_method: 'bank_transfer',
      notes: `Test income ${i + 1}`,
    });
  }

  // Insert all transactions
  for (const txn of transactions) {
    await prisma.financeTransaction.create({
      data: txn,
    });
  }

  console.log(`✅ Created ${transactions.length} finance transactions`);

  // Create savings goals
  const goals = [
    {
      name: 'Emergency Fund',
      description: '6 months operating expenses',
      targetAmount: 1000000,
      currentAmount: 450000,
      deadline: new Date('2026-12-31'),
      status: 'active',
    },
    {
      name: 'Equipment Upgrade',
      description: 'New production equipment',
      targetAmount: 500000,
      currentAmount: 280000,
      deadline: new Date('2026-06-30'),
      status: 'active',
    },
    {
      name: 'Marketing Campaign',
      description: 'Q2 2026 marketing',
      targetAmount: 200000,
      currentAmount: 150000,
      deadline: new Date('2026-04-30'),
      status: 'active',
    },
  ];

  for (const goal of goals) {
    await prisma.savingsGoal.create({
      data: goal,
    });
  }

  console.log(`✅ Created ${goals.length} savings goals`);

  // Create or update daily spending limit for today
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  await prisma.dailySpendingLimit.upsert({
    where: { date: todayDate },
    update: { spent: 42000, limit: 50000 },
    create: {
      date: todayDate,
      spent: 42000,
      limit: 50000,
    },
  });

  console.log('✅ Created daily spending limit for today');

  console.log('🎉 Seed complete!');
}

main()
  .catch((e) => {
    console.error('🚨 Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
