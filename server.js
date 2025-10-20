// ====== Imports ======
import express from "express";
import { Pool } from "pg";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// ====== Configuração ambiente ======
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ====== Banco de Dados ======
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.on("connect", () => console.log("✅ Conectado ao banco PostgreSQL (Neon)."));
pool.on("error", (err) => console.error("❌ Erro no pool de conexões:", err));

async function query(sql, params = []) {
  const client = await pool.connect();
  try {
    const res = await client.query(sql, params);
    return res;
  } finally {
    client.release();
  }
}

// Teste de conexão inicial
(async () => {
  try {
    await pool.query("SELECT 1");
    console.log("✅ Conexão com PostgreSQL validada.");
  } catch (err) {
    console.error("❌ Falha ao conectar ao PostgreSQL:", err.message);
    process.exit(1);
  }
})();

// ====================================================
// ================== ROTAS CLIENTES ==================
app.get("/api/clientes", async (req, res) => {
  try {
    const { rows } = await query("SELECT * FROM cliente ORDER BY id_cliente DESC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar clientes", details: err.message });
  }
});

app.post("/api/clientes", async (req, res) => {
  const { nome_cliente, celular, cep, cidade, bairro, logradouro, numero, complemento } = req.body;
  if (!nome_cliente) return res.status(400).json({ error: "O nome do cliente é obrigatório." });

  try {
    const { rows } = await query(
      `INSERT INTO cliente (nome_cliente, celular, cep, cidade, bairro, logradouro, numero, complemento)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id_cliente`,
      [nome_cliente, celular, cep, cidade, bairro, logradouro, numero, complemento]
    );
    res.json({ message: "Cliente cadastrado com sucesso!", id: rows[0].id_cliente });
  } catch (err) {
    res.status(500).json({ error: "Erro ao cadastrar cliente", details: err.message });
  }
});

// ====================================================
// =================== ROTAS CARROS ===================
app.get("/api/carros", async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT c.*, cl.nome_cliente
      FROM carros c
      LEFT JOIN cliente cl ON c.id_cliente = cl.id_cliente
      ORDER BY c.id_carro DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar carros", details: err.message });
  }
});

app.get("/api/carros/:placa", async (req, res) => {
  const { placa } = req.params;
  if (!placa) return res.status(400).json({ error: "Placa não informada" });

  try {
    const { rows } = await query(`
      SELECT c.*, cl.nome_cliente
      FROM carros c
      LEFT JOIN cliente cl ON c.id_cliente = cl.id_cliente
      WHERE c.placa = $1
    `, [placa.toUpperCase()]);

    if (rows.length === 0) return res.status(404).json({ error: "Carro não encontrado" });

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar carro", details: err.message });
  }
});

app.post("/api/carros", async (req, res) => {
  const { placa, marca, modelo, ano, cor, id_cliente } = req.body;
  if (!placa) return res.status(400).json({ error: "A placa é obrigatória." });

  try {
    const { rows } = await query(`
      INSERT INTO carros (placa, marca, modelo, ano, cor, id_cliente)
      VALUES ($1,$2,$3,$4,$5,$6) RETURNING id_carro
    `, [placa.toUpperCase(), marca, modelo, ano, cor, id_cliente || null]);

    res.json({ message: "Carro cadastrado com sucesso!", id: rows[0].id_carro });
  } catch (err) {
    if (err.code === "23505") return res.status(400).json({ error: "Esta placa já está cadastrada." });
    res.status(500).json({ error: "Erro ao cadastrar carro", details: err.message });
  }
});

// ====================================================
// =================== ROTAS AGENDAMENTOS =============
app.get("/api/agendamentos/full", async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT a.id, a.id_carro, a.id_cliente, a.nome_cliente, a.tipo_lavagem, a.data_agendada, a.status,
             c.marca, c.modelo, c.ano, c.placa
      FROM agendamentos a
      LEFT JOIN carros c ON a.id_carro = c.id_carro
      ORDER BY a.data_agendada DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar agendamentos", details: err.message });
  }
});

app.post("/api/agendamentos", async (req, res) => {
  const { id_carro, id_cliente, tipo_lavagem, data_agendada, nome_cliente } = req.body;
  if (!id_carro || !data_agendada || !tipo_lavagem || !nome_cliente) {
    return res.status(400).json({ error: "Dados obrigatórios faltando." });
  }

  try {
    const { rows } = await query(`
      INSERT INTO agendamentos (id_carro, id_cliente, nome_cliente, tipo_lavagem, data_agendada)
      VALUES ($1,$2,$3,$4,$5) RETURNING id
    `, [id_carro, id_cliente || null, nome_cliente, tipo_lavagem, data_agendada]);

    res.json({ message: "Agendamento cadastrado com sucesso!", id: rows[0].id });
  } catch (err) {
    res.status(500).json({ error: "Erro ao cadastrar agendamento", details: err.message });
  }
});

app.put("/api/agendamentos/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    await query("UPDATE agendamentos SET status=$1 WHERE id=$2", [status, id]);
    res.json({ message: "Status atualizado com sucesso" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar status", details: err.message });
  }
});

app.put("/api/agendamentos/:id", async (req, res) => {
  const { id } = req.params;
  const { nome_cliente, tipo_lavagem, data_agendada } = req.body;
  try {
    await query(`
      UPDATE agendamentos
      SET nome_cliente=$1, tipo_lavagem=$2, data_agendada=$3
      WHERE id=$4
    `, [nome_cliente, tipo_lavagem, data_agendada, id]);
    res.json({ message: "Agendamento atualizado com sucesso" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar agendamento", details: err.message });
  }
});

app.delete("/api/agendamentos/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await query("DELETE FROM agendamentos WHERE id=$1", [id]);
    res.json({ message: "Agendamento excluído com sucesso" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao excluir agendamento", details: err.message });
  }
});

// ====================================================
// =================== PÁGINAS HTML ===================
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public/index.html")));
app.get("/lista_cadastro", (req, res) => res.sendFile(path.join(__dirname, "public/lista_cadastro.html")));
app.get("/cadastra_cliente", (req, res) => res.sendFile(path.join(__dirname, "public/cadastra_cliente.html")));
app.get("/cadastra_carro", (req, res) => res.sendFile(path.join(__dirname, "public/cadastra_carro.html")));
app.get("/lista", (req, res) => res.sendFile(path.join(__dirname, "public/lista.html")));

// ====================================================
// =================== SERVIDOR =======================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor rodando em http://localhost:${PORT}`));
