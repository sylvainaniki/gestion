import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const organizations = sqliteTable('organizations', {
 id: text('id').primaryKey(),
 version: integer('version').notNull().default(1),
 data: text('data').notNull(),
 updatedAt: text('updated_at').notNull(),
});
