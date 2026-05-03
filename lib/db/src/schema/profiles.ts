import { pgTable, serial, integer, text, jsonb, foreignKey } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const profilesTable = pgTable("profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .unique()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  headline: text("headline"),
  bio: text("bio"),
  location: text("location"),
  phone: text("phone"),
  skills: text("skills").array().notNull().default([]),
  experience: jsonb("experience").notNull().default([]),
  education: jsonb("education").notNull().default([]),
  resumeUrl: text("resume_url"),
  avatarUrl: text("avatar_url"),
});

export const insertProfileSchema = createInsertSchema(profilesTable).omit({ id: true });
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profilesTable.$inferSelect;
