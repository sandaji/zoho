"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const db_1 = require("../src/lib/db");
async function main() {
    console.log('Seeding Leave Types...');
    const types = [
        { name: 'Annual Leave', daysAllowed: 20, description: 'Paid vacation leave' },
        { name: 'Sick Leave', daysAllowed: 10, description: 'Medical leave' },
        { name: 'Unpaid Leave', daysAllowed: 365, description: 'Leave without pay' },
        { name: 'Casual Leave', daysAllowed: 5, description: 'Short duration emergency leave' },
    ];
    for (const t of types) {
        await db_1.prisma.leaveType.upsert({
            where: { name: t.name },
            update: {},
            create: t,
        });
    }
    console.log('Leave Types seeded!');
    // Also allocate annual leave to a specific user if userId is provided or found
    const user = await db_1.prisma.user.findFirst();
    if (user) {
        console.log(`Allocating leave for user: ${user.email}`);
        const annualType = await db_1.prisma.leaveType.findUnique({ where: { name: 'Annual Leave' } });
        if (annualType) {
            await db_1.prisma.leaveAllocation.upsert({
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
    await db_1.prisma.$disconnect();
}
main().catch(e => {
    console.error(e);
    process.exit(1);
});
