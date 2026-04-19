import { Router, Request, Response } from "express";
import { db } from "../db";
import { specialDates } from "../db/schema";
import { authMiddleware } from "../middleware/auth";

const router = Router();

router.get("/", authMiddleware, async (_req: Request, res: Response) => {
  const all = await db.select().from(specialDates).orderBy(specialDates.date);
  res.json(all);
});

export default router;
