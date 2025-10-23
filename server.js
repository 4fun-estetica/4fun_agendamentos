// ====== Imports ======
import express from "express";
import pkg from "pg";
const { Pool } = pkg;
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch"; // Certifique-se que node-fetch está instalado

// ====== Configuração inicial ======
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ====== Configuração do banco ======
const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://db_fourfun_agendametos_user:wNRa2qKfG6PvWNnCMYg7yE9zVVncupHH@dpg-d3r87e49c44c73d9687g-a.oregon-postgres.render.com/db_fourfun_agendametos";

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Força schema público
pool.on("connect", (client) => client.query("SET search_path TO public;"));

// Log de erro global
pool.on("error", (err) => console.error("Unexpected error on idle client", err));

// Verificação inicial
(async () => {
  try {
    const check = await pool.query("SELECT current_database() AS db, current_schema() AS schema");
    console.log(`✅ Conectado ao banco: ${check.rows[0].db}, schema: ${check.rows[0].schema}`);
  } catch (e) {
    console.error("❌ Falha ao verificar banco:", e.message);
  }
})();

// Função de query com retry
async function queryWithRetry(text, params = [], retries = 2, delayMs = 300) {
  let attempt = 0;
  while (true) {
    try {
      return await pool.query(text, params);
    } catch (err) {
      attempt++;
      console.error(`Erro na query (attempt ${attempt}):`, err.message || err);
      if (attempt > retries) throw err;
      await new Promise((r) => setTimeout(r, delayMs * attempt));
    }
  }
}

// ====================================================
// ================== ROTAS CLIENTES ==================
// ====================================================
app.get("/api/clientes", async (req, res) => {
  try {
    const result = await queryWithRetry("SELECT * FROM public.cliente ORDER BY id_cliente DESC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar clientes", details: err.message });
  }
});

app.post("/api/clientes", async (req, res) => {
  const { nome_cliente, celular, cep, cidade, bairro, logradouro, numero, complemento } = req.body;
  if (!nome_cliente) return res.status(400).json({ error: "O nome do cliente é obrigatório." });

  try {
    const result = await queryWithRetry(
      `INSERT INTO public.cliente (nome_cliente, celular, cep, cidade, bairro, logradouro, numero, complemento)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id_cliente`,
      [nome_cliente, celular, cep, cidade, bairro, logradouro, numero, complemento]
    );
    res.json({ message: "Cliente cadastrado com sucesso!", id: result.rows[0].id_cliente });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao cadastrar cliente", details: err.message });
  }
});

app.patch("/api/clientes/:id", async (req, res) => {
  const { id } = req.params;
  const { nome_cliente, celular, cep, cidade, bairro, logradouro, numero, complemento } = req.body;

  try {
    const result = await queryWithRetry(
      `UPDATE public.cliente
       SET nome_cliente=$1, celular=$2, cep=$3, cidade=$4, bairro=$5, logradouro=$6, numero=$7, complemento=$8
       WHERE id_cliente=$9`,
      [nome_cliente, celular, cep, cidade, bairro, logradouro, numero, complemento, id]
    );

    if (result.rowCount === 0) return res.status(404).json({ error: "Cliente não encontrado" });
    res.json({ message: "Cliente atualizado com sucesso!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao atualizar cliente", details: err.message });
  }
});

// ====================================================
// =================== ROTA CEP ======================
// ====================================================
app.get("/api/cep/:cep", async (req, res) => {
  const { cep } = req.params;
  if (!/^\d{8}$/.test(cep)) return res.status(400).json({ error: "CEP inválido" });

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (!response.ok) throw new Error("Erro ao consultar ViaCEP");
    const data = await response.json();
    if (data.erro) return res.status(404).json({ error: "CEP não encontrado" });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao consultar CEP", details: err.message });
  }
});

// ====================================================
// =================== ROTAS CARROS ==================
// ====================================================
app.get("/api/carros", async (req, res) => {
  try {
    const result = await queryWithRetry(`
      SELECT c.*, cl.nome_cliente
      FROM public.carros c
      LEFT JOIN public.cliente cl ON c.id_cliente = cl.id_cliente
      ORDER BY c.id_carro DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar carros", details: err.message });
  }
});

app.get("/api/carros/:placa", async (req, res) => {
  const { placa } = req.params;
  if (!placa) return res.status(400).json({ error: "Placa não informada." });

  try {
    const result = await queryWithRetry(`
      SELECT c.*, cl.nome_cliente
      FROM public.carros c
      LEFT JOIN public.cliente cl ON c.id_cliente = cl.id_cliente
      WHERE UPPER(c.placa) = UPPER($1)
      LIMIT 1
    `, [placa]);

    if (result.rows.length === 0) return res.status(404).json({ error: "Carro não encontrado." });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar carro", details: err.message });
  }
});

app.post("/api/carros", async (req, res) => {
  let { placa, marca, modelo, ano, cor, id_cliente } = req.body;
  if (!placa) return res.status(400).json({ error: "A placa é obrigatória." });

  placa = String(placa).trim().toUpperCase();

  try {
    const result = await queryWithRetry(`
      INSERT INTO public.carros (placa, marca, modelo, ano, cor, id_cliente)
      VALUES ($1,$2,$3,$4,$5,$6) RETURNING id_carro
    `, [placa, marca, modelo, ano, cor, id_cliente || null]);

    res.json({ message: "Carro cadastrado com sucesso!", id: result.rows[0].id_carro });
  } catch (err) {
    console.error(err);
    if (err.code === "23505") return res.status(400).json({ error: "Esta placa já está cadastrada." });
    res.status(500).json({ error: "Erro ao cadastrar carro", details: err.message });
  }
});

app.patch("/api/carros/:id", async (req, res) => {
  const { id } = req.params;
  const { placa, marca, modelo, ano, cor, id_cliente } = req.body;

  try {
    const campos = [];
    const valores = [];
    let contador = 1;

    if (placa !== undefined) { campos.push(`placa=$${contador++}`); valores.push(placa.toUpperCase()); }
    if (marca !== undefined) { campos.push(`marca=$${contador++}`); valores.push(marca); }
    if (modelo !== undefined) { campos.push(`modelo=$${contador++}`); valores.push(modelo); }
    if (ano !== undefined) { campos.push(`ano=$${contador++}`); valores.push(ano); }
    if (cor !== undefined) { campos.push(`cor=$${contador++}`); valores.push(cor); }
    if (id_cliente !== undefined) { campos.push(`id_cliente=$${contador++}`); valores.push(id_cliente || null); }

    if (campos.length === 0) return res.status(400).json({ error: "Nenhum campo para atualizar" });

    const query = `
      UPDATE public.carros
      SET ${campos.join(", ")}
      WHERE id_carro=$${contador}
      RETURNING *;
    `;
    valores.push(id);

    const result = await queryWithRetry(query, valores);
    if (result.rowCount === 0) return res.status(404).json({ error: "Carro não encontrado" });
    res.json({ message: "Carro atualizado com sucesso!", carro: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao atualizar carro", details: err.message });
  }
});

app.delete("/api/carros/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const agendamentos = await queryWithRetry("SELECT * FROM public.agendamentos WHERE id_carro=$1", [id]);
    if (agendamentos.rowCount > 0) {
      return res.status(400).json({ error: "Não é possível excluir este carro. Há agendamentos vinculados a ele." });
    }
    const result = await queryWithRetry("DELETE FROM public.carros WHERE id_carro=$1 RETURNING *", [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: "Carro não encontrado." });
    res.json({ message: "Carro excluído com sucesso!", carro: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao excluir carro", details: err.message });
  }
});

// ====================================================
// =================== ROTAS AGENDAMENTOS =============
// ====================================================
app.get("/api/agendamentos/full", async (req, res) => {
  try {
    const result = await queryWithRetry(`
      SELECT a.id, a.id_carro, a.id_cliente, a.nome_cliente, a.tipo_lavagem, a.data_agendada, a.data_criacao, a.status,
             c.marca, c.modelo, c.ano, c.placa
      FROM public.agendamentos a
      LEFT JOIN public.carros c ON a.id_carro = c.id_carro
      ORDER BY a.data_agendada DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar agendamentos", details: err.message });
  }
});

app.post("/api/agendamentos", async (req, res) => {
  const { id_carro, id_cliente, tipo_lavagem, data_agendada, nome_cliente } = req.body;
  if (!id_carro || !data_agendada || !tipo_lavagem || !nome_cliente)
    return res.status(400).json({ error: "Dados obrigatórios faltando." });

  const dataAgendadaFormatada = new Date(data_agendada);
  dataAgendadaFormatada.setMinutes(0, 0, 0); // hora cheia

  try {
    const conflict = await queryWithRetry(
      "SELECT * FROM public.agendamentos WHERE data_agendada=$1",
      [dataAgendadaFormatada]
    );
    if (conflict.rows.length > 0)
      return res.status(400).json({ error: "Este horário já está ocupado." });

    const result = await queryWithRetry(`
      INSERT INTO public.agendamentos (id_carro, id_cliente, nome_cliente, tipo_lavagem, data_agendada)
      VALUES ($1,$2,$3,$4,$5) RETURNING id
    `, [id_carro, id_cliente || null, nome_cliente, tipo_lavagem, dataAgendadaFormatada]);

    res.json({ message: "Agendamento cadastrado com sucesso!", id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao cadastrar agendamento", details: err.message });
  }
});

app.put("/api/agendamentos/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    await queryWithRetry("UPDATE public.agendamentos SET status=$1 WHERE id=$2", [status, id]);
    res.json({ message: "Status atualizado com sucesso" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao atualizar status", details: err.message });
  }
});

app.put("/api/agendamentos/:id", async (req, res) => {
  const { id } = req.params;
  const { nome_cliente, tipo_lavagem, data_agendada } = req.body;
  try {
    const dataAgendadaFormatada = new Date(data_agendada);
    dataAgendadaFormatada.setMinutes(0, 0, 0);

    const conflict = await queryWithRetry(
      "SELECT * FROM public.agendamentos WHERE data_agendada=$1 AND id<>$2",
      [dataAgendadaFormatada, id]
    );
    if (conflict.rows.length > 0)
      return res.status(400).json({ error: "Este horário já está ocupado." });

    await queryWithRetry(`
      UPDATE public.agendamentos
      SET nome_cliente=$1, tipo_lavagem=$2, data_agendada=$3
      WHERE id=$4
    `, [nome_cliente, tipo_lavagem, dataAgendadaFormatada, id]);

    res.json({ message: "Agendamento atualizado com sucesso" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao atualizar agendamento", details: err.message });
  }
});

app.delete("/api/agendamentos/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await queryWithRetry("DELETE FROM public.agendamentos WHERE id=$1", [id]);
    res.json({ message: "Agendamento excluído com sucesso" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao excluir agendamento", details: err.message });
  }
});

// ====================================================
// =================== PÁGINAS HTML ===================
// ====================================================
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public/index.html")));
app.get("/lista_cadastro", (req, res) => res.sendFile(path.join(__dirname, "public/lista_cadastro.html")));
app.get("/cadastra_cliente", (req, res) => res.sendFile(path.join(__dirname, "public/cadastra_cliente.html")));
app.get("/cadastra_carro", (req, res) => res.sendFile(path.join(__dirname, "public/cadastra_carro.html")));
app.get("/lista", (req, res) => res.sendFile(path.join(__dirname, "public/lista.html")));

// ====================================================
// =================== SERVIDOR =======================
// ====================================================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
