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
    const [rows] = await pool.query("SELECT 1");
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

  const sql = `
    INSERT INTO cliente (nome_cliente, celular, cep, cidade, bairro, logradouro, numero, complemento)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const values = [nome_cliente, celular, cep, cidade, bairro, logradouro, numero, complemento];

  try {
    const [result] = await pool.query(sql, values);
    res.json({ message: "Cliente cadastrado com sucesso!", id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: "Erro ao cadastrar cliente", details: err.message });
  }
});

app.patch("/api/clientes/:id", async (req, res) => {
  const { id } = req.params;
  const campos = req.body;
  if (Object.keys(campos).length === 0) return res.status(400).json({ error: "Nenhum dado enviado para atualização." });

  try {
    await pool.query("UPDATE cliente SET ? WHERE id_cliente = ?", [campos, id]);
    res.json({ message: "Cliente atualizado com sucesso!" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar cliente", details: err.message });
  }
});

app.delete("/api/clientes/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM cliente WHERE id_cliente = ?", [id]);
    res.json({ message: "Cliente excluído com sucesso!" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao excluir cliente", details: err.message });
  }
});

// ====================================================
// =================== ROTAS CARROS ===================
// ====================================================
app.get("/api/carros", async (req, res) => {
  try {
    const sql = `
      SELECT c.*, cl.nome_cliente, cl.id_cliente
      FROM carros c
      LEFT JOIN cliente cl ON c.id_cliente = cl.id_cliente
      ORDER BY c.id_carro DESC
    `;
    const [results] = await pool.query(sql);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar carros", details: err.message });
  }
});

app.post("/api/carros", async (req, res) => {
  const { placa, marca, modelo, ano, cor, id_cliente } = req.body;
  if (!placa) return res.status(400).json({ error: "A placa é obrigatória." });

  const sql = `
    INSERT INTO carros (placa, marca, modelo, ano, cor, id_cliente)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  const values = [placa.toUpperCase(), marca, modelo, ano, cor, id_cliente || null];

  try {
    const [result] = await pool.query(sql, values);
    res.json({ message: "Carro cadastrado com sucesso!", id: result.insertId });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") return res.status(400).json({ error: "Esta placa já está cadastrada." });
    res.status(500).json({ error: "Erro ao cadastrar carro", details: err.message });
  }
});

app.patch("/api/carros/:id", async (req, res) => {
  const { id } = req.params;
  const campos = req.body;
  if (Object.keys(campos).length === 0) return res.status(400).json({ error: "Nenhum dado enviado para atualização." });

  try {
    await pool.query("UPDATE carros SET ? WHERE id_carro = ?", [campos, id]);
    res.json({ message: "Carro atualizado com sucesso!" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar carro", details: err.message });
  }
});

app.delete("/api/carros/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM carros WHERE id_carro = ?", [id]);
    res.json({ message: "Carro excluído com sucesso!" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao excluir carro", details: err.message });
  }
});

app.get("/api/carros/:placa", async (req, res) => {
  const { placa } = req.params;
  if (!placa) return res.status(400).json({ error: "Placa não informada" });

  try {
    const sql = `
      SELECT c.id_carro, c.marca, c.modelo, c.ano, c.cor, c.placa,
             cl.id_cliente, cl.nome_cliente
      FROM carros c
      LEFT JOIN cliente cl ON c.id_cliente = cl.id_cliente
      WHERE c.placa = ?
    `;
    const [results] = await pool.query(sql, [placa.toUpperCase()]);
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
    console.error("❌ Erro SQL ao buscar carro:", err);
    res.status(500).json({ error: "Erro ao buscar carro", details: err.message });
  }
});

// ====================================================
// =================== ROTAS AGENDAMENTOS =============
// ====================================================
app.get("/api/agendamentos", async (req, res) => {
  try {
    const [results] = await pool.query("SELECT * FROM agendamentos ORDER BY data_agendada DESC");
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar agendamentos", details: err.message });
  }
});

app.post("/api/agendamentos", async (req, res) => {
  const { id_carro, id_cliente, tipo_lavagem, data_agendada } = req.body;
  if (!id_carro || !data_agendada || !tipo_lavagem) return res.status(400).json({ error: "Dados obrigatórios faltando." });

  const sql = `
    INSERT INTO agendamentos (id_carro, id_cliente, tipo_lavagem, data_agendada)
    VALUES (?, ?, ?, ?)
  `;
  const values = [id_carro, id_cliente || null, tipo_lavagem, data_agendada];

  try {
    const [result] = await pool.query(sql, values);
    res.json({ message: "Agendamento cadastrado com sucesso!", id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: "Erro ao cadastrar agendamento", details: err.message });
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
