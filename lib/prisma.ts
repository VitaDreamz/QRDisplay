import { PrismaClient } from "@prisma/client";

declare global {
  // allow global `var` in development to prevent multiple instances
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const client = global.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== "production") global.prisma = client;

export default client;
