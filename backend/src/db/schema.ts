import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const ROOMS = [
  "Sala de Informática",
  "Laboratório de Ciências",
  "Quadra Poliesportiva",
  "Biblioteca",
] as const;

export type Room = (typeof ROOMS)[number];

export const SPECIAL_DATE_TYPES = [
  "feriado",
  "recesso",
  "ferias",
  "sabado_letivo",
  "inicio_trimestre",
  "fim_trimestre",
] as const;

export type SpecialDateType = (typeof SPECIAL_DATE_TYPES)[number];

// Tipos que BLOQUEIAM reservas
export const BLOCKING_DATE_TYPES: SpecialDateType[] = ["feriado", "ferias"];

export const teachers = pgTable("teachers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  matricula: text("matricula").notNull().unique(),
  subjects: text("subjects").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const reservations = pgTable("reservations", {
  id: serial("id").primaryKey(),
  teacherId: integer("teacher_id")
    .notNull()
    .references(() => teachers.id),
  teacherName: text("teacher_name").notNull(),
  subject: text("subject").notNull(),
  room: text("room").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  status: text("status"), // null = ativo | "cancelado"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const specialDates = pgTable("special_dates", {
  id: serial("id").primaryKey(),
  date: text("date").notNull().unique(), // "YYYY-MM-DD"
  type: text("type").notNull(),
  label: text("label").notNull(),
});

export type Teacher = typeof teachers.$inferSelect;
export type NewTeacher = typeof teachers.$inferInsert;
export type Reservation = typeof reservations.$inferSelect;
export type NewReservation = typeof reservations.$inferInsert;
export type SpecialDate = typeof specialDates.$inferSelect;
export type NewSpecialDate = typeof specialDates.$inferInsert;
