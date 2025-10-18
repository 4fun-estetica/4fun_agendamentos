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

// ====== Servir arquivos estáticos da pasta public ======
app.use(express.static(path.join(__dirname, "public")));

// ====== Banco de Dados ======
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "4fun_estetica"
});

db.connect(err => {
  if (err) {
    console.error("❌ Erro ao conectar ao banco de dados:", err);
  } else {
    console.log("✅ Conectado ao banco de dados MySQL.");
  }
});

// ====================================================
// ================== ROTAS CLIENTES ==================
// ====================================================
app.get("/api/clientes", (req, res) => {
  db.query("SELECT * FROM cliente ORDER BY id_cliente DESC", (err, results) => {
    if (err) return res.status(500).json({ error: "Erro ao buscar clientes" });
    res.json(results);
  });
});

app.post("/api/clientes", (req, res) => {
  const { nome_cliente, celular, cep, cidade, bairro, logradouro, numero, complemento } = req.body;

  if (!nome_cliente)
    return res.status(400).json({ error: "O nome do cliente é obrigatório." });

  const sql = `
    INSERT INTO cliente (nome_cliente, celular, cep, cidade, bairro, logradouro, numero, complemento)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const values = [nome_cliente, celular, cep, cidade, bairro, logradouro, numero, complemento];

  db.query(sql, values, (err, result) => {
    if (err) return res.status(500).json({ error: "Erro ao cadastrar cliente." });
    res.json({ message: "Cliente cadastrado com sucesso!", id: result.insertId });
  });
});

app.patch("/api/clientes/:id", (req, res) => {
  const { id } = req.params;
  const campos = req.body;

  if (Object.keys(campos).length === 0)
    return res.status(400).json({ error: "Nenhum dado enviado para atualização." });

  const sql = `UPDATE cliente SET ? WHERE id_cliente = ?`;
  db.query(sql, [campos, id], err => {
    if (err) return res.status(500).json({ error: "Erro ao atualizar cliente." });
    res.json({ message: "Cliente atualizado com sucesso!" });
  });
});

app.delete("/api/clientes/:id", (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM cliente WHERE id_cliente = ?", [id], err => {
    if (err) return res.status(500).json({ error: "Erro ao excluir cliente." });
    res.json({ message: "Cliente excluído com sucesso!" });
  });
});

// ====================================================
// =================== ROTAS CARROS ===================
// ====================================================
app.get("/api/carros", (req, res) => {
  const sql = `
    SELECT c.*, cl.nome_cliente, cl.id_cliente
    FROM carros c
    LEFT JOIN cliente cl ON c.id_cliente = cl.id_cliente
    ORDER BY c.id_carro DESC
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: "Erro ao buscar carros" });
    res.json(results);
  });
});

app.post("/api/carros", (req, res) => {
  const { placa, marca, modelo, ano, cor, id_cliente } = req.body;
  if (!placa) return res.status(400).json({ error: "A placa é obrigatória." });

  const sql = `
    INSERT INTO carros (placa, marca, modelo, ano, cor, id_cliente)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  const values = [placa.toUpperCase(), marca, modelo, ano, cor, id_cliente || null];

  db.query(sql, values, (err, result) => {
    if (err) {
      if (err.code === "ER_DUP_ENTRY")
        return res.status(400).json({ error: "Esta placa já está cadastrada." });
      return res.status(500).json({ error: "Erro ao cadastrar carro." });
    }
    res.json({ message: "Carro cadastrado com sucesso!", id: result.insertId });
  });
});

app.patch("/api/carros/:id", (req, res) => {
  const { id } = req.params;
  const campos = req.body;

  if (Object.keys(campos).length === 0)
    return res.status(400).json({ error: "Nenhum dado enviado para atualização." });

  const sql = `UPDATE carros SET ? WHERE id_carro = ?`;
  db.query(sql, [campos, id], err => {
    if (err) return res.status(500).json({ error: "Erro ao atualizar carro." });
    res.json({ message: "Carro atualizado com sucesso!" });
  });
});

app.delete("/api/carros/:id", (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM carros WHERE id_carro = ?", [id], err => {
    if (err) return res.status(500).json({ error: "Erro ao excluir carro." });
    res.json({ message: "Carro excluído com sucesso!" });
  });
});

// Buscar carro por placa
app.get("/api/carros/:placa", (req, res) => {
  const { placa } = req.params;
  if (!placa) return res.status(400).json({ error: "Placa não informada" });

  const sql = `
    SELECT c.id_carro, c.marca, c.modelo, c.ano, c.cor, c.placa,
           cl.id_cliente, cl.nome_cliente
    FROM carros c
    LEFT JOIN cliente cl ON c.id_cliente = cl.id_cliente
    WHERE c.placa = ?
  `;

  db.query(sql, [placa.toUpperCase()], (err, results) => {
    if (err) return res.status(500).json({ error: "Erro ao buscar carro" });
    if (results.length === 0)
      return res.status(404).json({ error: "Carro não encontrado" });
    res.json(results[0]);
  });
});

// ====================================================
// =================== PÁGINAS HTML ===================
// ====================================================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});
app.get("/lista_cadastro", (req, res) => {
  res.sendFile(path.join(__dirname, "public/lista_cadastro.html"));
});
app.get("/cadastra_cliente", (req, res) => {
  res.sendFile(path.join(__dirname, "public/cadastra_cliente.html"));
});
app.get("/cadastra_carro", (req, res) => {
  res.sendFile(path.join(__dirname, "public/cadastra_carro.html"));
});
app.get("/lista", (req, res) => {
  res.sendFile(path.join(__dirname, "public/lista.html"));
});

// ====================================================
// =================== SERVIDOR =======================
// ====================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`)
);
