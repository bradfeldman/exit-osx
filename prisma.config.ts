import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Load .env.local for Next.js projects
config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Direct URL for migrations (port 5432)
    url: process.env["DIRECT_URL"],
  },
});
