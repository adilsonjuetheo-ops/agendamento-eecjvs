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

// Política de privacidade
app.get("/privacy", (_req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Política de Privacidade — Agendamento EECJVS</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 0 auto; padding: 24px 16px; color: #1e293b; line-height: 1.7; }
    h1 { color: #1e3a6e; font-size: 1.6rem; margin-bottom: 4px; }
    h2 { color: #1e3a6e; font-size: 1.1rem; margin-top: 32px; }
    p, li { color: #475569; font-size: 0.95rem; }
    ul { padding-left: 20px; }
    .updated { color: #94a3b8; font-size: 0.85rem; margin-bottom: 32px; }
    footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 0.8rem; }
  </style>
</head>
<body>
  <h1>Política de Privacidade</h1>
  <p class="updated">Última atualização: abril de 2026</p>

  <p>Este aplicativo, <strong>Agendamento EECJVS</strong>, é desenvolvido e operado pela Escola Estadual Cel. José Venâncio de Souza (EECJVS), localizada em Minas Gerais, Brasil. Esta política descreve como coletamos, usamos e protegemos os dados dos usuários.</p>

  <h2>1. Dados coletados</h2>
  <p>Coletamos apenas os dados necessários para o funcionamento do aplicativo:</p>
  <ul>
    <li>Nome completo</li>
    <li>E-mail institucional (@educacao.mg.gov.br)</li>
    <li>Matrícula funcional (MASP)</li>
    <li>Disciplinas lecionadas</li>
    <li>Registros de agendamentos de espaços escolares</li>
  </ul>

  <h2>2. Finalidade do uso dos dados</h2>
  <p>Os dados coletados são utilizados exclusivamente para:</p>
  <ul>
    <li>Autenticação e identificação do professor no sistema</li>
    <li>Gerenciamento de reservas de espaços da escola (laboratório, biblioteca, quadra, etc.)</li>
    <li>Envio de notificações relacionadas aos agendamentos</li>
  </ul>

  <h2>3. Compartilhamento de dados</h2>
  <p>Não compartilhamos dados pessoais com terceiros. As informações são acessíveis apenas pelos gestores da escola para fins de administração interna.</p>

  <h2>4. Armazenamento e segurança</h2>
  <p>Os dados são armazenados em servidores seguros. O acesso é protegido por autenticação via token JWT. Senhas são armazenadas com criptografia bcrypt e nunca em texto puro.</p>

  <h2>5. Autenticação com Google</h2>
  <p>O aplicativo oferece a opção de login via conta Google institucional (@educacao.mg.gov.br). Neste caso, utilizamos apenas as informações básicas do perfil Google (nome e e-mail) para criar ou identificar a conta do professor. Não acessamos outros dados da conta Google.</p>

  <h2>6. Retenção de dados</h2>
  <p>Os dados são mantidos enquanto o professor estiver ativo na escola. Ao excluir a conta pelo aplicativo, todos os dados pessoais e agendamentos associados são removidos permanentemente.</p>

  <h2>7. Direitos do usuário</h2>
  <p>O usuário pode, a qualquer momento:</p>
  <ul>
    <li>Acessar seus dados pelo próprio aplicativo</li>
    <li>Excluir sua conta diretamente pelo aplicativo (opção disponível no perfil)</li>
    <li>Solicitar informações sobre seus dados pelo contato abaixo</li>
  </ul>

  <h2>8. Contato</h2>
  <p>Para dúvidas sobre esta política, entre em contato com a escola:</p>
  <p><strong>E.E. Cel. José Venâncio de Souza</strong><br>Minas Gerais, Brasil<br>E-mail: <a href="mailto:${process.env.CONTACT_EMAIL || 'secretaria@eecjvs.mg.gov.br'}">${process.env.CONTACT_EMAIL || 'secretaria@eecjvs.mg.gov.br'}</a></p>

  <footer>© ${new Date().getFullYear()} E.E. Cel. José Venâncio de Souza — Todos os direitos reservados</footer>
</body>
</html>`);
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
