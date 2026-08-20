/**
 * One-off script: initialise a fiscal year in the database.
 * Usage:  npx tsx scripts/init-fiscal-year.ts [year]
 *   e.g.: npx tsx scripts/init-fiscal-year.ts 2026
 * Defaults to the current calendar year when no argument is given.
 */

import "dotenv/config";
import { prisma } from "../src/lib/db";
import { FiscalStatus } from "../src/generated";

async function main() {
  const year = parseInt(process.argv[2] ?? String(new Date().getFullYear()), 10);

  console.log(`Initialising fiscal year ${year}…`);

  // Check whether this year already exists to avoid duplicate creation.
  const existing = await prisma.fiscalYear.findFirst({
    where: { name: year.toString() },
  });

  if (existing) {
    console.log(`Fiscal year ${year} already exists (id: ${existing.id}, status: ${existing.status}).`);
    console.log("Checking for open periods…");

    const openPeriods = await prisma.fiscalPeriod.count({
      where: { fiscalYearId: existing.id, status: FiscalStatus.open },
    });
    console.log(`  ${openPeriods} open period(s) found.`);
    return;
  }

  const startDate = new Date(year, 0, 1);       // Jan 1
  const endDate   = new Date(year, 11, 31, 23, 59, 59); // Dec 31

  await prisma.$transaction(async (tx) => {
    const fiscalYear = await tx.fiscalYear.create({
      data: {
        name: year.toString(),
        startDate,
        endDate,
        status: FiscalStatus.open,
      },
    });

    const periods: {
      fiscalYearId: string;
      name: string;
      startDate: Date;
      endDate: Date;
      status: typeof FiscalStatus.open;
    }[] = [];

    for (let month = 0; month < 12; month++) {
      const pStart = new Date(year, month, 1);
      const pEnd   = new Date(year, month + 1, 0, 23, 59, 59);
      periods.push({
        fiscalYearId: fiscalYear.id,
        name: pStart.toLocaleString("en-US", { month: "short", year: "numeric" }),
        startDate: pStart,
        endDate: pEnd,
        status: FiscalStatus.open,
      });
    }

    await tx.fiscalPeriod.createMany({ data: periods });

    console.log(`✓ Fiscal year ${year} created (id: ${fiscalYear.id})`);
    console.log(`✓ ${periods.length} monthly periods created (all open)`);
  });
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
