
import 'dotenv/config';
import { prisma } from '../src/lib/db';

async function verify() {
    const roleCode = 'branch_manager';
    const role = await prisma.role.findUnique({
        where: { code: roleCode },
        include: {
            permissions: {
                include: {
                    permission: true,
                },
            },
        },
    });

    if (!role) {
        console.log(`Role ${roleCode} not found!`);
        return;
    }

    console.log(`\nPermissions for ${role.name}:`);
    role.permissions.forEach(rp => {
        console.log(`- ${rp.permission.code} [${rp.scope}]`);
    });
}

verify()
    .finally(async () => {
        await prisma.$disconnect();
    });
