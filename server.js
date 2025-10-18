// ====== Imports ======
import express from "express";
import mysql from "mysql2";
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

// ====== Banco de Dados (POOL) ======
const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "4fun_estetica",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Promise API
const db = pool.promise();

// ====================================================
// ================== ROTAS CLIENTES ==================
app.get("/api/clientes", async (req, res) => {
  try {
    const [results] = await db.query("SELECT * FROM cliente ORDER BY id_cliente DESC");
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar clientes", details: err.message });
  }
});

app.post("/api/clientes", async (req, res) => {
  const { nome_cliente, celular, cep, cidade, bairro, logradouro, numero, complemento } = req.body;
  if (!nome_cliente) return res.status(400).json({ error: "O nome do cliente é obrigatório." });

  try {
    const [result] = await db.query(
      `INSERT INTO cliente (nome_cliente, celular, cep, cidade, bairro, logradouro, numero, complemento)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [nome_cliente, celular, cep, cidade, bairro, logradouro, numero, complemento]
    );
    res.json({ message: "Cliente cadastrado com sucesso!", id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: "Erro ao cadastrar cliente.", details: err.message });
  }
});

app.patch("/api/clientes/:id", async (req, res) => {
  const { id } = req.params;
  const campos = req.body;
  if (!Object.keys(campos).length) return res.status(400).json({ error: "Nenhum dado enviado para atualização." });

  try {
    await db.query("UPDATE cliente SET ? WHERE id_cliente = ?", [campos, id]);
    res.json({ message: "Cliente atualizado com sucesso!" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar cliente.", details: err.message });
  }
});

app.delete("/api/clientes/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("DELETE FROM cliente WHERE id_cliente = ?", [id]);
    res.json({ message: "Cliente excluído com sucesso!" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao excluir cliente.", details: err.message });
  }
});

// ====================================================
// =================== ROTAS CARROS ==================
app.get("/api/carros", async (req, res) => {
  try {
    const [results] = await db.query(`
      SELECT c.*, cl.nome_cliente, cl.id_cliente
      FROM carros c
      LEFT JOIN cliente cl ON c.id_cliente = cl.id_cliente
      ORDER BY c.id_carro DESC
    `);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar carros", details: err.message });
  }
});

app.post("/api/carros", async (req, res) => {
  const { placa, marca, modelo, ano, cor, id_cliente } = req.body;
  if (!placa) return res.status(400).json({ error: "A placa é obrigatória." });

  try {
    const [result] = await db.query(
      `INSERT INTO carros (placa, marca, modelo, ano, cor, id_cliente)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [placa.toUpperCase(), marca, modelo, ano, cor, id_cliente || null]
    );
    res.json({ message: "Carro cadastrado com sucesso!", id: result.insertId });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") return res.status(400).json({ error: "Esta placa já está cadastrada." });
    res.status(500).json({ error: "Erro ao cadastrar carro.", details: err.message });
  }
});

app.patch("/api/carros/:id", async (req, res) => {
  const { id } = req.params;
  const campos = req.body;
  if (!Object.keys(campos).length) return res.status(400).json({ error: "Nenhum dado enviado para atualização." });

  try {
    await db.query("UPDATE carros SET ? WHERE id_carro = ?", [campos, id]);
    res.json({ message: "Carro atualizado com sucesso!" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar carro.", details: err.message });
  }
});

app.delete("/api/carros/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("DELETE FROM carros WHERE id_carro = ?", [id]);
    res.json({ message: "Carro excluído com sucesso!" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao excluir carro.", details: err.message });
  }
});

app.get("/api/carros/:placa", async (req, res) => {
  const { placa } = req.params;
  if (!placa) return res.status(400).json({ error: "Placa não informada" });

  try {
    const [results] = await db.query(`
      SELECT c.id_carro, c.marca, c.modelo, c.ano, c.cor, c.placa,
             cl.id_cliente, cl.nome_cliente
      FROM carros c
      LEFT JOIN cliente cl ON c.id_cliente = cl.id_cliente
      WHERE c.placa = ?
    `, [placa.toUpperCase()]);

    if (!results.length) return res.status(404).json({ error: "Carro não encontrado" });

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
// =================== PÁGINAS HTML ==================
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public/index.html")));
app.get("/lista_cadastro", (req, res) => res.sendFile(path.join(__dirname, "public/lista_cadastro.html")));
app.get("/cadastra_cliente", (req, res) => res.sendFile(path.join(__dirname, "public/cadastra_cliente.html")));
app.get("/cadastra_carro", (req, res) => res.sendFile(path.join(__dirname, "public/cadastra_carro.html")));
app.get("/lista", (req, res) => res.sendFile(path.join(__dirname, "public/lista.html")));

// ====================================================
// =================== SERVIDOR ======================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`)
);
