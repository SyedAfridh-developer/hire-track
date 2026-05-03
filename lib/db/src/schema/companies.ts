import { pgTable, serial, integer, text } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const companiesTable = pgTable("companies", {
  id: serial("id").primaryKey(),
  recruiterId: integer("recruiter_id")
    .notNull()
    .unique()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  website: text("website"),
  location: text("location"),
  industry: text("industry"),
  size: text("size"),
  logoUrl: text("logo_url"),
});

export const insertCompanySchema = createInsertSchema(companiesTable).omit({ id: true });
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companiesTable.$inferSelect;
