import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

function hashPassword(pw: string) {
  // Simple hash for seed/dev; replace with bcrypt in production auth flow
  return createHash('sha256').update(pw).digest('hex');
}

async function main() {
  const adminEmail = process.env.ADMIN_SEED_EMAIL || 'admin@example.com';
  const adminPassword = process.env.ADMIN_SEED_PASSWORD || 'change-me';
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: { email: adminEmail, name: 'Admin', role: 'ADMIN', passwordHash: hashPassword(adminPassword) },
  });

  const material = await prisma.material.upsert({
    where: { id: 'mat-standard-resin' },
    update: {},
    create: { id: 'mat-standard-resin', name: 'Standard Resin', type: 'RESIN', pricePerLiter: 150.0 as any, currency: 'BRL', active: true },
  });
  const printer = await prisma.printer.upsert({
    where: { id: 'printer-default' },
    update: {},
    create: { id: 'printer-default', name: 'Default MSLA Printer', model: 'Generic', active: true },
  });
  await prisma.printerProfile.upsert({
    where: { id: 'profile-default' },
    update: {},
    create: { id: 'profile-default', printerId: printer.id, name: 'Default 0.05mm', active: true, configJson: { layerHeightMm: 0.05 } },
  });
  console.log('Seed completed', { adminEmail, material: material.id, printer: printer.id });
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
