const fs = require("fs");
const path = require("path");
const dotenvPath = path.resolve(__dirname, ".env");
const env = fs.readFileSync(dotenvPath, "utf8");
for (const line of env.split(/\n/)) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (!match) continue;
  const key = match[1].trim();
  let value = match[2].trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  process.env[key] = value;
}
const { PrismaClient } = require("./src/generated");
const prisma = new PrismaClient();
(async () => {
  try {
    const users = await prisma.user.findMany({
      where: {
        email: {
          in: [
            "admin@zoho.co.ke",
            "manager@zoho.co.ke",
            "warehouse@zoho.co.ke",
            "cashier@zoho.co.ke",
          ],
        },
      },
      select: { id: true, email: true, role: true, passwordHash: true },
    });
    console.log(JSON.stringify(users, null, 2));
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
