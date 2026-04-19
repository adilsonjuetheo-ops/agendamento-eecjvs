import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AdminRequest extends Request {
  adminEmail?: string;
}

export function adminAuthMiddleware(
  req: AdminRequest,
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
      email: string;
      role: string;
    };

    if (payload.role !== "admin") {
      res.status(403).json({ error: "Acesso restrito a administradores" });
      return;
    }

    req.adminEmail = payload.email;
    next();
  } catch {
    res.status(401).json({ error: "Token inválido ou expirado" });
  }
}
