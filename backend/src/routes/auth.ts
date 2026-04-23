import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { createPublicKey } from "crypto";
import { db } from "../db";
import { teachers } from "../db/schema";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();

type UserRole = "autorizado" | "visitante";

const AUTHORIZED_EMAIL_DOMAINS = (
  process.env.AUTHORIZED_EMAIL_DOMAINS || "@educacao.mg.gov.br,@escola.com"
)
  .split(",")
  .map((domain) => domain.trim().toLowerCase())
  .filter(Boolean)
  .map((domain) => (domain.startsWith("@") ? domain : `@${domain}`));

const registerSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
  matricula: z.string().trim().optional(),
  subjects: z.string().trim().optional(),
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

const appleLoginSchema = z.object({
  identityToken: z.string().min(10),
  authorizationCode: z.string().optional(),
  fullName: z.string().trim().optional(),
  email: z.string().email().optional(),
});

function normalizeEmail(email?: string | null): string {
  return (email || "").trim().toLowerCase();
}

function deriveUserRole(email?: string | null): UserRole {
  const normalized = normalizeEmail(email);
  if (!normalized) return "visitante";
  if (normalized.endsWith("privaterelay.appleid.com")) return "visitante";
  return AUTHORIZED_EMAIL_DOMAINS.some((domain) => normalized.endsWith(domain))
    ? "autorizado"
    : "visitante";
}

function buildToken(teacherId: number, email: string) {
  return jwt.sign(
    { teacherId, email, role: "teacher" },
    process.env.JWT_SECRET!,
    { expiresIn: "7d" }
  );
}

function serializeTeacher(teacher: {
  id: number;
  name: string;
  email: string;
  matricula: string;
  subjects: string;
  userRole?: string | null;
  createdAt?: Date;
}) {
  return {
    id: teacher.id,
    name: teacher.name,
    email: teacher.email,
    matricula: teacher.matricula,
    subjects: teacher.subjects,
    userRole: (teacher.userRole as UserRole) || deriveUserRole(teacher.email),
    createdAt: teacher.createdAt,
  };
}

function buildFallbackMatricula() {
  return `AUTO-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

async function ensureAvailableMatricula(preferred?: string) {
  const base = preferred && preferred.trim().length > 0 ? preferred.trim() : buildFallbackMatricula();
  let attempt = 0;
  let candidate = base;

  while (attempt < 10) {
    const existing = await db
      .select({ id: teachers.id })
      .from(teachers)
      .where(eq(teachers.matricula, candidate))
      .limit(1);
    if (existing.length === 0) return candidate;
    attempt += 1;
    candidate = `${base}-${attempt}`;
  }

  return `${base}-${Date.now()}`;
}

async function syncRoleByEmail(teacher: {
  id: number;
  email: string;
  userRole: string | null;
}) {
  const desiredRole = deriveUserRole(teacher.email);
  if (teacher.userRole === desiredRole) return desiredRole;
  await db
    .update(teachers)
    .set({ userRole: desiredRole })
    .where(eq(teachers.id, teacher.id));
  return desiredRole;
}

type AppleJwk = {
  kty: string;
  kid: string;
  use: string;
  alg: string;
  n: string;
  e: string;
};

type AppleIdentityTokenPayload = jwt.JwtPayload & {
  sub: string;
  email?: string;
};

let appleKeysCache: { expiresAt: number; keys: AppleJwk[] } | null = null;

async function getAppleKeys() {
  if (appleKeysCache && appleKeysCache.expiresAt > Date.now()) {
    return appleKeysCache.keys;
  }

  const resp = await fetch("https://appleid.apple.com/auth/keys");
  if (!resp.ok) throw new Error("Falha ao obter chaves públicas da Apple");
  const json = (await resp.json()) as { keys: AppleJwk[] };
  appleKeysCache = {
    keys: json.keys || [],
    expiresAt: Date.now() + 60 * 60 * 1000,
  };
  return appleKeysCache.keys;
}

function getAppleAudience() {
  return (
    process.env.APPLE_CLIENT_ID ||
    process.env.APPLE_BUNDLE_ID ||
    "br.edu.eecjvs.agendamento"
  );
}

async function verifyAppleIdentityToken(identityToken: string): Promise<AppleIdentityTokenPayload> {
  const decoded = jwt.decode(identityToken, { complete: true }) as
    | { header: { kid?: string; alg?: string } }
    | null;

  if (!decoded?.header?.kid) throw new Error("Token Apple inválido");

  const keys = await getAppleKeys();
  const key = keys.find((k) => k.kid === decoded.header.kid);
  if (!key) throw new Error("Chave Apple não encontrada");

  const publicKey = createPublicKey({ key, format: "jwk" });

  const payload = jwt.verify(identityToken, publicKey, {
    algorithms: ["RS256"],
    issuer: "https://appleid.apple.com",
    audience: getAppleAudience(),
  }) as AppleIdentityTokenPayload;

  if (!payload?.sub) throw new Error("Token Apple sem identificador do usuário");
  return payload;
}

router.post("/register", async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }

  const { name, password } = parsed.data;
  const email = normalizeEmail(parsed.data.email);
  const subjects = parsed.data.subjects?.trim() || "Não informado";
  const desiredRole = deriveUserRole(email);

  const existing = await db
    .select({ id: teachers.id })
    .from(teachers)
    .where(eq(teachers.email, email))
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({ error: "Email já cadastrado" });
    return;
  }

  const matricula = await ensureAvailableMatricula(parsed.data.matricula);
  const passwordHash = await bcrypt.hash(password, 10);

  const [teacher] = await db
    .insert(teachers)
    .values({
      name: name.trim(),
      email,
      passwordHash,
      matricula,
      subjects,
      userRole: desiredRole,
    })
    .returning();

  const token = buildToken(teacher.id, teacher.email);
  res.status(201).json({ token, teacher: serializeTeacher(teacher) });
});

router.post("/login", async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Dados inválidos" });
    return;
  }

  const email = normalizeEmail(parsed.data.email);
  const { password } = parsed.data;

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

  const userRole = await syncRoleByEmail(teacher);
  const token = buildToken(teacher.id, teacher.email);

  res.json({
    token,
    teacher: serializeTeacher({ ...teacher, userRole }),
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
      userRole: teachers.userRole,
      createdAt: teachers.createdAt,
    })
    .from(teachers)
    .where(eq(teachers.id, req.teacherId!))
    .limit(1);

  if (!teacher) {
    res.status(404).json({ error: "Usuário não encontrado" });
    return;
  }

  const userRole = await syncRoleByEmail(teacher);
  res.json(serializeTeacher({ ...teacher, userRole }));
});

router.post("/google", async (req: Request, res: Response) => {
  const { accessToken } = req.body;
  if (!accessToken) {
    res.status(400).json({ error: "Token Google não fornecido" });
    return;
  }

  let googleUser: { email?: string; name?: string };
  try {
    const resp = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!resp.ok) throw new Error("Token inválido");
    googleUser = (await resp.json()) as { email?: string; name?: string };
  } catch {
    res.status(401).json({ error: "Token Google inválido" });
    return;
  }

  const email = normalizeEmail(googleUser.email);
  if (!email) {
    res.status(400).json({ error: "Google não retornou email para esta conta" });
    return;
  }

  const [existingTeacher] = await db
    .select()
    .from(teachers)
    .where(eq(teachers.email, email))
    .limit(1);

  if (existingTeacher) {
    const userRole = await syncRoleByEmail(existingTeacher);
    const token = buildToken(existingTeacher.id, existingTeacher.email);
    res.json({
      token,
      teacher: serializeTeacher({ ...existingTeacher, userRole }),
    });
    return;
  }

  const matricula = await ensureAvailableMatricula();
  const name = googleUser.name?.trim() || "Usuário Google";
  const subjects = "Não informado";
  const userRole = deriveUserRole(email);

  const [teacher] = await db
    .insert(teachers)
    .values({
      name,
      email,
      passwordHash: "__GOOGLE_OAUTH__",
      matricula,
      subjects,
      userRole,
    })
    .returning();

  const token = buildToken(teacher.id, teacher.email);
  res.status(201).json({ token, teacher: serializeTeacher(teacher) });
});

router.post("/google/complete", async (req: Request, res: Response) => {
  const { accessToken, matricula, subjects } = req.body as {
    accessToken?: string;
    matricula?: string;
    subjects?: string;
  };

  if (!accessToken) {
    res.status(400).json({ error: "Token Google não fornecido" });
    return;
  }

  let googleUser: { email?: string; name?: string };
  try {
    const resp = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!resp.ok) throw new Error("Token inválido");
    googleUser = (await resp.json()) as { email?: string; name?: string };
  } catch {
    res.status(401).json({ error: "Token Google inválido" });
    return;
  }

  const email = normalizeEmail(googleUser.email);
  if (!email) {
    res.status(400).json({ error: "Google não retornou email para esta conta" });
    return;
  }

  const [existingTeacher] = await db
    .select()
    .from(teachers)
    .where(eq(teachers.email, email))
    .limit(1);

  if (existingTeacher) {
    const userRole = await syncRoleByEmail(existingTeacher);
    const token = buildToken(existingTeacher.id, existingTeacher.email);
    res.json({
      token,
      teacher: serializeTeacher({ ...existingTeacher, userRole }),
    });
    return;
  }

  const finalMatricula = await ensureAvailableMatricula(matricula);
  const finalSubjects = subjects?.trim() || "Não informado";
  const name = googleUser.name?.trim() || "Usuário Google";
  const userRole = deriveUserRole(email);

  const [teacher] = await db
    .insert(teachers)
    .values({
      name,
      email,
      passwordHash: "__GOOGLE_OAUTH__",
      matricula: finalMatricula,
      subjects: finalSubjects,
      userRole,
    })
    .returning();

  const token = buildToken(teacher.id, teacher.email);
  res.status(201).json({ token, teacher: serializeTeacher(teacher) });
});

router.post("/apple", async (req: Request, res: Response) => {
  const parsed = appleLoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }

  const { identityToken, fullName } = parsed.data;
  const requestEmail = normalizeEmail(parsed.data.email);

  let applePayload: AppleIdentityTokenPayload;
  try {
    applePayload = await verifyAppleIdentityToken(identityToken);
  } catch (error: any) {
    res.status(401).json({ error: error?.message || "Token Apple inválido" });
    return;
  }

  const appleSub = applePayload.sub;
  const appleEmail = normalizeEmail(applePayload.email);
  const resolvedEmail =
    requestEmail ||
    appleEmail ||
    `apple-${appleSub}@privaterelay.appleid.com`;

  const [existingBySub] = await db
    .select()
    .from(teachers)
    .where(eq(teachers.appleSub, appleSub))
    .limit(1);

  if (existingBySub) {
    const userRole = await syncRoleByEmail(existingBySub);
    const token = buildToken(existingBySub.id, existingBySub.email);
    res.json({
      token,
      teacher: serializeTeacher({ ...existingBySub, userRole }),
    });
    return;
  }

  const [existingByEmail] = await db
    .select()
    .from(teachers)
    .where(eq(teachers.email, resolvedEmail))
    .limit(1);

  if (existingByEmail) {
    await db
      .update(teachers)
      .set({ appleSub })
      .where(eq(teachers.id, existingByEmail.id));
    const userRole = await syncRoleByEmail(existingByEmail);
    const token = buildToken(existingByEmail.id, existingByEmail.email);
    res.json({
      token,
      teacher: serializeTeacher({ ...existingByEmail, userRole }),
    });
    return;
  }

  const name =
    fullName?.trim() ||
    (appleEmail ? appleEmail.split("@")[0] : "Usuário Apple");
  const matricula = await ensureAvailableMatricula();
  const subjects = "Não informado";
  const userRole = deriveUserRole(resolvedEmail);

  const [teacher] = await db
    .insert(teachers)
    .values({
      name,
      email: resolvedEmail,
      appleSub,
      passwordHash: "__APPLE_OAUTH__",
      matricula,
      subjects,
      userRole,
    })
    .returning();

  const token = buildToken(teacher.id, teacher.email);
  res.status(201).json({ token, teacher: serializeTeacher(teacher) });
});

router.delete("/account", authMiddleware, async (req: AuthRequest, res: Response) => {
  await db.delete(teachers).where(eq(teachers.id, req.teacherId!));
  res.json({ message: "Conta excluída com sucesso" });
});

router.post("/logout", (_req: Request, res: Response) => {
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
