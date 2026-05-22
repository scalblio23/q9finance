import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Leads table — stores each completed survey submission
export const leads = mysqlTable("leads", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 64 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  hasSmsf: varchar("hasSmsf", { length: 8 }).notNull().default("yes"),
  ownsProperty: varchar("ownsProperty", { length: 8 }).notNull().default("yes"),
  bank: varchar("bank", { length: 64 }).notNull().default(""),
  bankName: varchar("bankName", { length: 128 }).notNull().default(""),
  loanSize: varchar("loanSize", { length: 128 }).notNull().default(""),
  interest: varchar("interest", { length: 64 }).notNull().default(""),
  timeline: varchar("timeline", { length: 128 }).notNull(),
  bookingDate: varchar("bookingDate", { length: 64 }),
  bookingTime: varchar("bookingTime", { length: 64 }),
  aiReport: json("aiReport"),
  reportStatus: mysqlEnum("reportStatus", ["pending", "generating", "ready", "failed"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

// Blocked slots table — stores admin-blocked time slots for the booking calendar
export const blockedSlots = mysqlTable("blocked_slots", {
  id: int("id").autoincrement().primaryKey(),
  // Format: "YYYY-MM-DD" for whole-day blocks, "YYYY-MM-DD-HH:MM" for specific slots
  slotKey: varchar("slotKey", { length: 32 }).notNull().unique(),
  isWholeDay: int("isWholeDay").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BlockedSlot = typeof blockedSlots.$inferSelect;
export type InsertBlockedSlot = typeof blockedSlots.$inferInsert;
