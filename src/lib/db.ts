import { PrismaClient } from "@prisma/client";

// Reuse the client across hot reloads in dev.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/** The single store row — created on first access. */
export async function getBrand() {
  let brand = await prisma.brand.findFirst({ include: { template: { include: { options: true } } } });
  if (!brand) {
    brand = await prisma.brand.create({
      data: { name: "My Store" },
      include: { template: { include: { options: true } } },
    });
  }
  return brand;
}
