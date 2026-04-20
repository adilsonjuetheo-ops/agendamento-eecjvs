import "dotenv/config";
import path from "path";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth";
import reservationRoutes from "./routes/reservations";
import specialDateRoutes from "./routes/specialDates";
import adminRoutes from "./routes/admin";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Rotas
app.use("/api/auth", authRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/special-dates", specialDateRoutes);
app.use("/api/admin", adminRoutes);

// Painel web admin (servido em /admin)
const webDist = path.join(__dirname, "../../web/dist");
app.use("/admin", express.static(webDist));
app.get(["/admin", "/admin/*"], (_req, res) => {
  res.sendFile(path.join(webDist, "index.html"));
});

// 404 para rotas de API não encontradas
app.use((_req, res) => {
  res.status(404).json({ error: "Rota não encontrada" });
});

// Error handler global
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: "Erro interno do servidor" });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || "development"}`);
});
