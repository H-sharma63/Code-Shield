import { pgTable, serial, text, varchar, integer } from 'drizzle-orm/pg-core';

export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  fileName: varchar('file_name', { length: 256 }).notNull(),
  fileData: text('file_data').notNull(),
});