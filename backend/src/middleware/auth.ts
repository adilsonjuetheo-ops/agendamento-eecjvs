import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  teacherId?: number;
  teacherEmail?: string;
}

export function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token não fornecido" });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
      teacherId: number;
      email: string;
      role: string;
    };

    if (payload.role !== "teacher") {
      res.status(403).json({ error: "Acesso negado" });
      return;
    }

    req.teacherId = payload.teacherId;
    req.teacherEmail = payload.email;
    next();
  } catch {
    res.status(401).json({ error: "Token inválido ou expirado" });
  }
}
