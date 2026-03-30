import { pgTable, serial, text, varchar, integer, timestamp } from 'drizzle-orm/pg-core';

export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  projectName: varchar('project_name', { length: 256 }),
  fileName: varchar('file_name', { length: 256 }).notNull(),
  blobUrl: varchar('blob_url', { length: 256 }).notNull(),
  userEmail: varchar('user_email', { length: 256 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull(),
});

export const testRuns = pgTable('test_runs', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').references(() => projects.id),
  userId: varchar('user_id', { length: 256 }).notNull(),
  ranAt: timestamp('ran_at').defaultNow(),
  totalTests: integer('total_tests'),
  passed: integer('passed'),
  failed: integer('failed'),
  results: text('results'), // JSON stringified full results
});

// export const apiUsage = pgTable('api_usage', {
//     id: serial('id').primaryKey(),
//     model: varchar('model', { length: 256 }),
//     tokens: integer('tokens'),
//     createdAt: timestamp('created_at').defaultNow(),
//     userEmail: varchar('user_email', { length: 256 }),
// });