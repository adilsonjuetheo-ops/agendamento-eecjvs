import * as dotenv from "dotenv";
dotenv.config();

import { db, pool } from "./index";
import { specialDates } from "./schema";

async function seed() {
  console.log("Populando banco com datas especiais de 2025...");

  await db.insert(specialDates).values([
    { date: "2025-01-01", type: "feriado", label: "Confraternização Universal" },
    { date: "2025-03-03", type: "feriado", label: "Carnaval" },
    { date: "2025-03-04", type: "feriado", label: "Carnaval" },
    { date: "2025-04-18", type: "feriado", label: "Sexta-feira Santa" },
    { date: "2025-04-21", type: "feriado", label: "Tiradentes" },
    { date: "2025-05-01", type: "feriado", label: "Dia do Trabalho" },
    { date: "2025-06-19", type: "feriado", label: "Corpus Christi" },
    { date: "2025-07-09", type: "ferias", label: "Férias de Julho" },
    { date: "2025-07-10", type: "ferias", label: "Férias de Julho" },
    { date: "2025-07-11", type: "ferias", label: "Férias de Julho" },
    { date: "2025-07-14", type: "ferias", label: "Férias de Julho" },
    { date: "2025-07-15", type: "ferias", label: "Férias de Julho" },
    { date: "2025-07-16", type: "ferias", label: "Férias de Julho" },
    { date: "2025-07-17", type: "ferias", label: "Férias de Julho" },
    { date: "2025-07-18", type: "ferias", label: "Férias de Julho" },
    { date: "2025-09-07", type: "feriado", label: "Independência do Brasil" },
    { date: "2025-10-12", type: "feriado", label: "Nossa Senhora Aparecida" },
    { date: "2025-11-02", type: "feriado", label: "Finados" },
    { date: "2025-11-15", type: "feriado", label: "Proclamação da República" },
    { date: "2025-12-08", type: "feriado", label: "Imaculada Conceição" },
    { date: "2025-12-25", type: "feriado", label: "Natal" },
    { date: "2025-12-22", type: "ferias", label: "Recesso de Fim de Ano" },
    { date: "2025-12-23", type: "ferias", label: "Recesso de Fim de Ano" },
    { date: "2025-12-24", type: "ferias", label: "Recesso de Fim de Ano" },
    { date: "2025-12-26", type: "ferias", label: "Recesso de Fim de Ano" },
    { date: "2025-12-29", type: "ferias", label: "Recesso de Fim de Ano" },
    { date: "2025-12-30", type: "ferias", label: "Recesso de Fim de Ano" },
    { date: "2025-12-31", type: "ferias", label: "Recesso de Fim de Ano" },
  ]).onConflictDoNothing();

  console.log("Seed concluído!");
  await pool.end();
}

seed().catch((err) => {
  console.error("Erro no seed:", err);
  process.exit(1);
});
