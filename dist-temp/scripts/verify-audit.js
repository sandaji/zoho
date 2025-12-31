"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const async_context_1 = require("../src/lib/async-context");
const db_1 = require("../src/lib/db"); // Use the custom instance
async function main() {
    console.log('Starting Audit Log verification...');
    // 1. Find a user to act as the actor
    const actor = await db_1.prisma.user.findFirst();
    if (!actor) {
        console.error('No user found to act as operator');
        return;
    }
    console.log(`Using actor: ${actor.id} (${actor.email})`);
    // 2. Perform actions within context
    await async_context_1.asyncContext.run({ userId: actor.id, ipAddress: '127.0.0.1', userAgent: 'test-script' }, async () => {
        console.log('Context set. Creating a test product...');
        // Create - Product (using arbitrary unique name)
        const uniqueName = `TestProduct-${Date.now()}`;
        const product = await db_1.prisma.product.create({
            data: {
                name: uniqueName,
                sku: `SKU-${Date.now()}`,
                unit_price: 100,
                description: 'Audit Test Product',
                quantity: 10,
                cost_price: 50 // Required field generally
            }
        });
        console.log(`Product created: ${product.id}`);
        // Verify Audit Log for CREATE
        const createLog = await db_1.prisma.auditLog.findFirst({
            where: {
                entityType: 'Product',
                entityId: product.id,
                action: 'CREATE'
            }
        });
        if (createLog) {
            console.log('✅ Audit Log for CREATE found:', createLog.id);
            console.log('   UserId:', createLog.userId);
            if (createLog.userId === actor.id)
                console.log('   ✅ Actor correct');
            else
                console.error('   ❌ Actor mismatch');
        }
        else {
            console.error('❌ Audit Log for CREATE NOT found');
        }
        // Update
        console.log('Updating product...');
        await db_1.prisma.product.update({
            where: { id: product.id },
            data: { unit_price: 150 }
        });
        // Verify Audit Log for UPDATE
        const updateLog = await db_1.prisma.auditLog.findFirst({
            where: {
                entityType: 'Product',
                entityId: product.id,
                action: 'UPDATE'
            }
        });
        if (updateLog) {
            console.log('✅ Audit Log for UPDATE found:', updateLog.id);
            const changes = updateLog.changes;
            console.log('   Changes:', JSON.stringify(changes));
            if (changes.before?.unit_price === 100 && changes.after?.unit_price === 150) {
                console.log('   ✅ Changes captured correctly');
            }
            else {
                console.error('   ❌ Changes mismatch');
            }
        }
        else {
            console.error('❌ Audit Log for UPDATE NOT found');
        }
        // Delete
        console.log('Deleting product...');
        await db_1.prisma.product.delete({
            where: { id: product.id }
        });
        // Verify Audit Log for DELETE
        const deleteLog = await db_1.prisma.auditLog.findFirst({
            where: {
                entityType: 'Product',
                entityId: product.id,
                action: 'DELETE'
            }
        });
        if (deleteLog) {
            console.log('✅ Audit Log for DELETE found:', deleteLog.id);
        }
        else {
            console.error('❌ Audit Log for DELETE NOT found');
        }
    });
    console.log('Verification finished.');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await db_1.prisma.$disconnect();
});
