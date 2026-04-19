import { Router, Response } from "express";
import { z } from "zod";
import { and, eq, or, lt, gt, lte, gte, ne, isNull } from "drizzle-orm";
import { db } from "../db";
import { reservations, specialDates, teachers, BLOCKING_DATE_TYPES, ROOMS } from "../db/schema";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();

const createSchema = z.object({
  room: z.enum(ROOMS),
  subject: z.string().min(1),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
});

function hasOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date
): boolean {
  return aStart < bEnd && aEnd > bStart;
}

async function isDateBlocked(dateStr: string): Promise<boolean> {
  const [special] = await db
    .select()
    .from(specialDates)
    .where(eq(specialDates.date, dateStr))
    .limit(1);

  if (!special) return false;
  return BLOCKING_DATE_TYPES.includes(special.type as any);
}

// GET /api/reservations — todas as reservas ativas (para visualização de disponibilidade)
router.get("/", authMiddleware, async (_req: AuthRequest, res: Response) => {
  const all = await db
    .select()
    .from(reservations)
    .where(isNull(reservations.status));

  res.json(all);
});

// GET /api/reservations/my — reservas do professor logado
router.get("/my", authMiddleware, async (req: AuthRequest, res: Response) => {
  const myReservations = await db
    .select()
    .from(reservations)
    .where(eq(reservations.teacherId, req.teacherId!))
    .orderBy(reservations.startTime);

  res.json(myReservations);
});

// GET /api/reservations/check-availability
router.get(
  "/check-availability",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    const { startTime, endTime, room } = req.query;

    if (!startTime || !endTime || !room) {
      res.status(400).json({ error: "startTime, endTime e room são obrigatórios" });
      return;
    }

    const start = new Date(startTime as string);
    const end = new Date(endTime as string);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      res.status(400).json({ error: "Datas inválidas" });
      return;
    }

    if (start >= end) {
      res.status(400).json({ error: "Horário de início deve ser antes do fim" });
      return;
    }

    const dateStr = start.toISOString().split("T")[0];
    if (await isDateBlocked(dateStr)) {
      res.json({ available: false, reason: "Data bloqueada (feriado ou férias)" });
      return;
    }

    const conflicts = await db
      .select({ id: reservations.id })
      .from(reservations)
      .where(
        and(
          eq(reservations.room, room as string),
          isNull(reservations.status),
          lt(reservations.startTime, end),
          gt(reservations.endTime, start)
        )
      );

    res.json({ available: conflicts.length === 0 });
  }
);

// POST /api/reservations — criar reserva
router.post("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }

  const { room, subject, startTime: startStr, endTime: endStr } = parsed.data;
  const start = new Date(startStr);
  const end = new Date(endStr);

  if (start <= new Date()) {
    res.status(400).json({ error: "Não é possível agendar para data/hora no passado" });
    return;
  }

  if (start >= end) {
    res.status(400).json({ error: "Horário de início deve ser antes do fim" });
    return;
  }

  const dateStr = start.toISOString().split("T")[0];
  if (await isDateBlocked(dateStr)) {
    res.status(400).json({ error: "Esta data está bloqueada (feriado ou férias)" });
    return;
  }

  // Verificar conflito de sala
  const roomConflict = await db
    .select({ id: reservations.id })
    .from(reservations)
    .where(
      and(
        eq(reservations.room, room),
        isNull(reservations.status),
        lt(reservations.startTime, end),
        gt(reservations.endTime, start)
      )
    );

  if (roomConflict.length > 0) {
    res.status(409).json({ error: "Este espaço já está reservado neste horário" });
    return;
  }

  // Verificar conflito do professor
  const teacherConflict = await db
    .select({ id: reservations.id })
    .from(reservations)
    .where(
      and(
        eq(reservations.teacherId, req.teacherId!),
        isNull(reservations.status),
        lt(reservations.startTime, end),
        gt(reservations.endTime, start)
      )
    );

  if (teacherConflict.length > 0) {
    res.status(409).json({ error: "Você já possui uma reserva neste horário" });
    return;
  }

  const [teacher] = await db
    .select({ name: teachers.name })
    .from(teachers)
    .where(eq(teachers.id, req.teacherId!))
    .limit(1);

  const [newReservation] = await db
    .insert(reservations)
    .values({
      teacherId: req.teacherId!,
      teacherName: teacher.name,
      subject,
      room,
      startTime: start,
      endTime: end,
    })
    .returning();

  res.status(201).json(newReservation);
});

// DELETE /api/reservations/:id — cancelar reserva
router.delete("/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const [reservation] = await db
    .select()
    .from(reservations)
    .where(eq(reservations.id, id))
    .limit(1);

  if (!reservation) {
    res.status(404).json({ error: "Reserva não encontrada" });
    return;
  }

  if (reservation.teacherId !== req.teacherId) {
    res.status(403).json({ error: "Você não pode cancelar a reserva de outro professor" });
    return;
  }

  if (reservation.startTime <= new Date()) {
    res.status(400).json({ error: "Não é possível cancelar reservas passadas" });
    return;
  }

  const [updated] = await db
    .update(reservations)
    .set({ status: "cancelado" })
    .where(eq(reservations.id, id))
    .returning();

  res.json(updated);
});

export default router;
