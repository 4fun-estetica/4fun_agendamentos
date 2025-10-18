// ====== Imports ======
import express from "express";
import mysql from "mysql2/promise";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

// ====== Configuração inicial ======
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ====== Banco de Dados ======
const dbConfig = {
  host: "sql10.freesqldatabase.com",
  user: "sql10802501",
  password: "Mmil3GwK8D",
  database: "sql10802501",
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

let pool;

async function initDB() {
  try {
    pool = mysql.createPool(dbConfig);
    await pool.query("SELECT 1");
    console.log("✅ Conectado ao banco remoto MySQL.");
  } catch (err) {
    console.error("❌ Erro ao conectar ao banco de dados:", err);
  }
}
await initDB();

// ====================================================
// ================== ROTAS CLIENTES ==================
// ====================================================
app.get("/api/clientes", async (req, res) => {
  try {
    const [results] = await pool.query("SELECT * FROM cliente ORDER BY id_cliente DESC");
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar clientes", details: err.message });
  }
});

app.post("/api/clientes", async (req, res) => {
  const { nome_cliente, celular, cep, cidade, bairro, logradouro, numero, complemento } = req.body;
  if (!nome_cliente) return res.status(400).json({ error: "O nome do cliente é obrigatório." });

  try {
    const [result] = await pool.query(
      `INSERT INTO cliente (nome_cliente, celular, cep, cidade, bairro, logradouro, numero, complemento)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [nome_cliente, celular, cep, cidade, bairro, logradouro, numero, complemento]
    );
    res.json({ message: "Cliente cadastrado com sucesso!", id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: "Erro ao cadastrar cliente", details: err.message });
  }
});

// ====================================================
// =================== ROTAS CARROS ===================
// ====================================================
app.get("/api/carros", async (req, res) => {
  try {
    const [results] = await pool.query(`
      SELECT c.*, cl.nome_cliente 
      FROM carros c
      LEFT JOIN cliente cl ON c.id_cliente = cl.id_cliente
      ORDER BY c.id_carro DESC
    `);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar carros", details: err.message });
  }
});

app.get("/api/carros/:placa", async (req, res) => {
  const { placa } = req.params;
  if (!placa) return res.status(400).json({ error: "Placa não informada" });

  try {
    const [results] = await pool.query(`
      SELECT c.*, cl.nome_cliente
      FROM carros c
      LEFT JOIN cliente cl ON c.id_cliente = cl.id_cliente
      WHERE c.placa = ?
    `, [placa.toUpperCase()]);

    if (results.length === 0) return res.status(404).json({ error: "Carro não encontrado" });

    const carro = results[0];
    res.json({
      id_carro: carro.id_carro,
      placa: carro.placa,
      marca: carro.marca,
      modelo: carro.modelo,
      ano: carro.ano,
      cor: carro.cor,
      id_cliente: carro.id_cliente || null,
      nome_cliente: carro.nome_cliente || ""
    });
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar carro", details: err.message });
  }
});

app.post("/api/carros", async (req, res) => {
  const { placa, marca, modelo, ano, cor, id_cliente } = req.body;
  if (!placa) return res.status(400).json({ error: "A placa é obrigatória." });

  try {
    const [result] = await pool.query(`
      INSERT INTO carros (placa, marca, modelo, ano, cor, id_cliente)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [placa.toUpperCase(), marca, modelo, ano, cor, id_cliente || null]);

    res.json({ message: "Carro cadastrado com sucesso!", id: result.insertId });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") return res.status(400).json({ error: "Esta placa já está cadastrada." });
    res.status(500).json({ error: "Erro ao cadastrar carro", details: err.message });
  }
});

// ====================================================
// =================== ROTAS AGENDAMENTOS =============
// ====================================================
app.get("/api/agendamentos/full", async (req, res) => {
  try {
    const [results] = await pool.query(`
      SELECT a.id_agendamento, a.id_carro, a.id_cliente, a.nome_cliente, a.tipo_lavagem, a.data_agendada, a.status,
             c.marca, c.modelo, c.ano, c.placa
      FROM agendamentos a
      LEFT JOIN carros c ON a.id_carro = c.id_carro
      ORDER BY a.data_agendada DESC
    `);
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar agendamentos", details: err.message });
  }
});

app.post("/api/agendamentos", async (req, res) => {
  const { id_carro, id_cliente, tipo_lavagem, data_agendada, nome_cliente } = req.body;
  if (!id_carro || !data_agendada || !tipo_lavagem || !nome_cliente) {
    return res.status(400).json({ error: "Dados obrigatórios faltando." });
  }

  try {
    const [result] = await pool.query(`
      INSERT INTO agendamentos (id_carro, id_cliente, nome_cliente, tipo_lavagem, data_agendada)
      VALUES (?, ?, ?, ?, ?)
    `, [id_carro, id_cliente || null, nome_cliente, tipo_lavagem, data_agendada]);

    res.json({ message: "Agendamento cadastrado com sucesso!", id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: "Erro ao cadastrar agendamento", details: err.message });
  }
});

// Atualizar status do agendamento
app.put("/api/agendamentos/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    await pool.query("UPDATE agendamentos SET status = ? WHERE id_agendamento = ?", [status, id]);
    res.json({ message: "Status atualizado com sucesso" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar status", details: err.message });
  }
});

// Editar agendamento
app.put("/api/agendamentos/:id", async (req, res) => {
  const { id } = req.params;
  const { nome_cliente, tipo_lavagem, data_agendada } = req.body;
  try {
    await pool.query(`
      UPDATE agendamentos
      SET nome_cliente = ?, tipo_lavagem = ?, data_agendada = ?
      WHERE id_agendamento = ?
    `, [nome_cliente, tipo_lavagem, data_agendada, id]);
    res.json({ message: "Agendamento atualizado com sucesso" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar agendamento", details: err.message });
  }
});

// Excluir agendamento
app.delete("/api/agendamentos/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM agendamentos WHERE id_agendamento = ?", [id]);
    res.json({ message: "Agendamento excluído com sucesso" });
  } catch (err) {
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
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor rodando em http://localhost:${PORT}`));
