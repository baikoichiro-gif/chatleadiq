import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { env } from "../src/config/env.js";

const prisma = new PrismaClient();

async function main() {
  const email = env.ADMIN_EMAIL;
  const password = env.ADMIN_PASSWORD;
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.adminUser.upsert({
    where: { email },
    update: { passwordHash },
    create: {
      name: "ChatLeadIQ Admin",
      email,
      passwordHash,
      role: "ADMIN"
    }
  });

  await prisma.userSetting.upsert({
    where: { key: "safety" },
    update: {},
    create: {
      key: "safety",
      value: JSON.stringify({
        enableAutoSend: false,
        followupCooldownHours: env.FOLLOWUP_COOLDOWN_HOURS,
        onlyAnalyzeRecentChats: env.ONLY_ANALYZE_RECENT_CHATS
      })
    }
  });
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
