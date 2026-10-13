import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

let connectionState: "unknown" | "ok" | "fail" = "unknown";

export async function isDatabaseReachable(): Promise<boolean> {
  if (connectionState === "ok") return true;
  if (connectionState === "fail") return false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    connectionState = "ok";
    return true;
  } catch {
    connectionState = "fail";
    return false;
  }
}
