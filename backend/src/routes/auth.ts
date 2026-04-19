import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { teachers } from "../db/schema";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();

const INSTITUTIONAL_EMAIL = /@educacao\.mg\.gov\.br$/;

const registerSchema = z.object({
  name: z.string().min(3),
  email: z.string().email().regex(INSTITUTIONAL_EMAIL, {
    message: "Apenas emails @educacao.mg.gov.br são aceitos",
  }),
  password: z.string().min(6),
  matricula: z.string().min(4),
  subjects: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const resetSchema = z.object({
  matricula: z.string().min(1),
  newPassword: z.string().min(6),
  confirmPassword: z.string().min(6),
});

router.post("/register", async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }

  const { name, email, password, matricula, subjects } = parsed.data;

  const existing = await db
    .select({ id: teachers.id })
    .from(teachers)
    .where(eq(teachers.email, email))
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({ error: "Email já cadastrado" });
    return;
  }

  const existingMatricula = await db
    .select({ id: teachers.id })
    .from(teachers)
    .where(eq(teachers.matricula, matricula))
    .limit(1);

  if (existingMatricula.length > 0) {
    res.status(409).json({ error: "MASP já cadastrado" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const [teacher] = await db
    .insert(teachers)
    .values({ name, email, passwordHash, matricula, subjects })
    .returning({ id: teachers.id, name: teachers.name, email: teachers.email });

  const token = jwt.sign(
    { teacherId: teacher.id, email: teacher.email, role: "teacher" },
    process.env.JWT_SECRET!,
    { expiresIn: "7d" }
  );

  res.status(201).json({ token, teacher });
});

router.post("/login", async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Dados inválidos" });
    return;
  }

  const { email, password } = parsed.data;

  const [teacher] = await db
    .select()
    .from(teachers)
    .where(eq(teachers.email, email))
    .limit(1);

  if (!teacher) {
    res.status(401).json({ error: "Email ou senha incorretos" });
    return;
  }

  const valid = await bcrypt.compare(password, teacher.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Email ou senha incorretos" });
    return;
  }

  const token = jwt.sign(
    { teacherId: teacher.id, email: teacher.email, role: "teacher" },
    process.env.JWT_SECRET!,
    { expiresIn: "7d" }
  );

  res.json({
    token,
    teacher: {
      id: teacher.id,
      name: teacher.name,
      email: teacher.email,
      matricula: teacher.matricula,
      subjects: teacher.subjects,
    },
  });
});

router.get("/me", authMiddleware, async (req: AuthRequest, res: Response) => {
  const [teacher] = await db
    .select({
      id: teachers.id,
      name: teachers.name,
      email: teachers.email,
      matricula: teachers.matricula,
      subjects: teachers.subjects,
      createdAt: teachers.createdAt,
    })
    .from(teachers)
    .where(eq(teachers.id, req.teacherId!))
    .limit(1);

  if (!teacher) {
    res.status(404).json({ error: "Professor não encontrado" });
    return;
  }

  res.json(teacher);
});

router.post("/logout", (_req: Request, res: Response) => {
  // JWT é stateless — cliente descarta o token
  res.json({ message: "Logout realizado com sucesso" });
});

router.post("/reset-password", async (req: Request, res: Response) => {
  const parsed = resetSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }

  const { matricula, newPassword, confirmPassword } = parsed.data;

  if (newPassword !== confirmPassword) {
    res.status(400).json({ error: "As senhas não coincidem" });
    return;
  }

  const [teacher] = await db
    .select({ id: teachers.id })
    .from(teachers)
    .where(eq(teachers.matricula, matricula))
    .limit(1);

  if (!teacher) {
    res.status(404).json({ error: "MASP não encontrado" });
    return;
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db
    .update(teachers)
    .set({ passwordHash })
    .where(eq(teachers.id, teacher.id));

  res.json({ message: "Senha redefinida com sucesso" });
});

export default router;
