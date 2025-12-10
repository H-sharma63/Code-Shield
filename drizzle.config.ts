import 'dotenv/config'; // Keep this for consistency if present, or just dotenv.config()
import type { Config } from 'drizzle-kit'; // Use 'Config' type from 'drizzle-kit'

export default {
  schema: './app/lib/schema.ts', 
  out: './drizzle', 
  dialect: 'postgresql',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!, 
  },
} satisfies Config; 
