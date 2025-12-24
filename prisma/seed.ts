import 'dotenv/config';
import { prisma } from '../src/config/db';

async function main() {
  console.log('Seeding database...');

  const user = await prisma.user.upsert({
    where: { email: 'seed@zapnote.local' },
    update: { name: 'Seed User' },
    create: { email: 'seed@zapnote.local', name: 'Seed User' },
  });


  await prisma.workspace.deleteMany({ where: { name: 'Seed Workspace' } });

  const workspace = await prisma.workspace.create({
    data: {
      name: 'Seed Workspace',
      members: {
        create: {
          userId: user.id,
          role: 'OWNER',
        },
      },
    },
  });

  const knowledge = await prisma.knowledgeItem.create({
    data: {
      workspaceId: workspace.id,
      createdById: user.id,
      type: 'NOTE',
      title: 'Welcome to Zapnote',
      rawContent: 'This knowledge item was created by the seed script.',
      summary: 'Seeded knowledge item',
    },
  });

  console.log('Seed complete:', { userId: user.id, workspaceId: workspace.id, knowledgeItemId: knowledge.id });
}

main()
  .catch((err) => {
    console.error('Seed error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
