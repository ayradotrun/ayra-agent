import { PrismaClient } from "@prisma/client";
import { ALL_SKILL_DEFINITIONS } from "../src/lib/skills/catalog";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding skills...");

  for (const skill of ALL_SKILL_DEFINITIONS) {
    await prisma.skill.upsert({
      where: { slug: skill.slug },
      update: {
        name: skill.name,
        category: skill.category,
        description: skill.description,
        icon: skill.icon,
        isEnabled: skill.isEnabled,
      },
      create: {
        name: skill.name,
        slug: skill.slug,
        category: skill.category,
        description: skill.description,
        icon: skill.icon,
        isEnabled: skill.isEnabled,
        isBuiltIn: true,
        permission: "read",
      },
    });
  }

  console.log(`Seeded ${ALL_SKILL_DEFINITIONS.length} skills`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
