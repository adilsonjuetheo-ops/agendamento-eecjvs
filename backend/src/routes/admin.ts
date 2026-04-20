import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { and, eq, gte, lte, isNull, count, sql, like } from "drizzle-orm";
import { db } from "../db";
import { reservations, teachers, specialDates, SPECIAL_DATE_TYPES } from "../db/schema";
import { adminAuthMiddleware, AdminRequest } from "../middleware/adminAuth";

const router = Router();

// POST /api/admin/login
router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "Email e senha são obrigatórios" });
    return;
  }

  const admin1Email = process.env.ADMIN_1_EMAIL!;
  const admin2Email = process.env.ADMIN_2_EMAIL!;
  const admin1Hash = process.env.ADMIN_1_PASSWORD_HASH!;
  const admin2Hash = process.env.ADMIN_2_PASSWORD_HASH!;

  let hash: string | null = null;
  if (email === admin1Email) hash = admin1Hash;
  else if (email === admin2Email) hash = admin2Hash;

  if (!hash) {
    res.status(401).json({ error: "Credenciais inválidas" });
    return;
  }

  const valid = await bcrypt.compare(password, hash);
  if (!valid) {
    res.status(401).json({ error: "Credenciais inválidas" });
    return;
  }

  const token = jwt.sign(
    { email, role: "admin" },
    process.env.JWT_SECRET!,
    { expiresIn: "8h" }
  );

  res.json({ token, email });
});

// GET /api/admin/stats
router.get("/stats", adminAuthMiddleware, async (_req: AdminRequest, res: Response) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86400000);

  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [todayCount] = await db
    .select({ count: count() })
    .from(reservations)
    .where(
      and(
        isNull(reservations.status),
        gte(reservations.startTime, todayStart),
        lte(reservations.startTime, todayEnd)
      )
    );

  const [weekCount] = await db
    .select({ count: count() })
    .from(reservations)
    .where(
      and(
        isNull(reservations.status),
        gte(reservations.startTime, weekStart),
        lte(reservations.startTime, weekEnd)
      )
    );

  const [monthCount] = await db
    .select({ count: count() })
    .from(reservations)
    .where(
      and(
        isNull(reservations.status),
        gte(reservations.startTime, monthStart),
        lte(reservations.startTime, monthEnd)
      )
    );

  const [totalCount] = await db
    .select({ count: count() })
    .from(reservations)
    .where(isNull(reservations.status));

  res.json({
    today: todayCount.count,
    week: weekCount.count,
    month: monthCount.count,
    total: totalCount.count,
  });
});

// GET /api/admin/reservations
router.get("/reservations", adminAuthMiddleware, async (req: AdminRequest, res: Response) => {
  const { room, startDate, endDate, status } = req.query;

  const conditions = [];

  if (room) conditions.push(eq(reservations.room, room as string));
  if (startDate) conditions.push(gte(reservations.startTime, new Date(startDate as string)));
  if (endDate) conditions.push(lte(reservations.startTime, new Date(endDate as string)));
  if (status === "cancelado") conditions.push(eq(reservations.status, "cancelado"));
  else if (status === "ativo") conditions.push(isNull(reservations.status));

  const all = await db
    .select()
    .from(reservations)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(reservations.startTime);

  res.json(all);
});

// PATCH /api/admin/reservations/:id
router.patch("/reservations/:id", adminAuthMiddleware, async (req: AdminRequest, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const { status } = req.body;
  if (status !== "cancelado" && status !== null) {
    res.status(400).json({ error: "Status deve ser 'cancelado' ou null" });
    return;
  }

  const [updated] = await db
    .update(reservations)
    .set({ status })
    .where(eq(reservations.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Reserva não encontrada" });
    return;
  }

  res.json(updated);
});

// DELETE /api/admin/reservations/:id
router.delete("/reservations/:id", adminAuthMiddleware, async (req: AdminRequest, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const [deleted] = await db
    .delete(reservations)
    .where(eq(reservations.id, id))
    .returning({ id: reservations.id });

  if (!deleted) {
    res.status(404).json({ error: "Reserva não encontrada" });
    return;
  }

  res.json({ message: "Reserva excluída", id: deleted.id });
});

// GET /api/admin/teachers
router.get("/teachers", adminAuthMiddleware, async (_req: AdminRequest, res: Response) => {
  const all = await db
    .select({
      id: teachers.id,
      name: teachers.name,
      email: teachers.email,
      matricula: teachers.matricula,
      subjects: teachers.subjects,
      createdAt: teachers.createdAt,
    })
    .from(teachers)
    .orderBy(teachers.name);

  res.json(all);
});

// GET /api/admin/reports/rooms
router.get("/reports/rooms", adminAuthMiddleware, async (_req: AdminRequest, res: Response) => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const result = await db
    .select({
      room: reservations.room,
      count: count(),
    })
    .from(reservations)
    .where(
      and(
        isNull(reservations.status),
        gte(reservations.startTime, monthStart),
        lte(reservations.startTime, monthEnd)
      )
    )
    .groupBy(reservations.room)
    .orderBy(sql`count(*) desc`);

  res.json(result);
});

// GET /api/admin/reports/teachers
router.get("/reports/teachers", adminAuthMiddleware, async (_req: AdminRequest, res: Response) => {
  const result = await db
    .select({
      teacherName: reservations.teacherName,
      count: count(),
    })
    .from(reservations)
    .where(isNull(reservations.status))
    .groupBy(reservations.teacherName)
    .orderBy(sql`count(*) desc`)
    .limit(20);

  res.json(result);
});

// GET /api/admin/reports/export — CSV
router.get("/reports/export", adminAuthMiddleware, async (_req: AdminRequest, res: Response) => {
  const all = await db
    .select()
    .from(reservations)
    .orderBy(reservations.startTime);

  const header = "ID,Professor,Disciplina,Espaço,Início,Fim,Status,Criado em\n";
  const rows = all.map((r) =>
    [
      r.id,
      `"${r.teacherName}"`,
      `"${r.subject}"`,
      `"${r.room}"`,
      r.startTime.toISOString(),
      r.endTime.toISOString(),
      r.status || "ativo",
      r.createdAt.toISOString(),
    ].join(",")
  );

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="reservas_${new Date().toISOString().split("T")[0]}.csv"`
  );
  res.send(header + rows.join("\n"));
});

// GET /api/admin/special-dates (gestão do calendário)
router.get("/special-dates", adminAuthMiddleware, async (_req: AdminRequest, res: Response) => {
  const all = await db.select().from(specialDates).orderBy(specialDates.date);
  res.json(all);
});

// POST /api/admin/special-dates/import — importação em lote (JSON array)
router.post("/special-dates/import", adminAuthMiddleware, async (req: AdminRequest, res: Response) => {
  const itemSchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    type: z.enum(SPECIAL_DATE_TYPES),
    label: z.string().min(1),
  });
  const schema = z.array(itemSchema).min(1).max(500);

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Dados inválidos", details: parsed.error.errors });
    return;
  }

  const inserted = await db
    .insert(specialDates)
    .values(parsed.data)
    .onConflictDoUpdate({
      target: specialDates.date,
      set: { type: sql`excluded.type`, label: sql`excluded.label` },
    })
    .returning();

  res.json({ imported: inserted.length });
});

// DELETE /api/admin/special-dates/year/:year — remove todas as datas de um ano
router.delete("/special-dates/year/:year", adminAuthMiddleware, async (req: AdminRequest, res: Response) => {
  const year = parseInt(req.params.year);
  if (isNaN(year) || year < 2020 || year > 2100) {
    res.status(400).json({ error: "Ano inválido" });
    return;
  }

  const deleted = await db
    .delete(specialDates)
    .where(like(specialDates.date, `${year}-%`))
    .returning({ id: specialDates.id });

  res.json({ deleted: deleted.length });
});

// POST /api/admin/special-dates
router.post("/special-dates", adminAuthMiddleware, async (req: AdminRequest, res: Response) => {
  const schema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    type: z.enum(SPECIAL_DATE_TYPES),
    label: z.string().min(1),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }

  const [created] = await db
    .insert(specialDates)
    .values(parsed.data)
    .onConflictDoNothing()
    .returning();

  if (!created) {
    res.status(409).json({ error: "Data já cadastrada" });
    return;
  }

  res.status(201).json(created);
});

// DELETE /api/admin/special-dates/:id
router.delete("/special-dates/:id", adminAuthMiddleware, async (req: AdminRequest, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const [deleted] = await db
    .delete(specialDates)
    .where(eq(specialDates.id, id))
    .returning({ id: specialDates.id });

  if (!deleted) {
    res.status(404).json({ error: "Data não encontrada" });
    return;
  }

  res.json({ message: "Data excluída", id: deleted.id });
});

export default router;
