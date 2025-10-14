import express from "express";
import mysql from "mysql2";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

// === Configuração de diretório base ===
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// === Configuração do banco MySQL ===
const db = mysql.createPool({
  host: "sql10.freesqldatabase.com",
  user: "sql10802501",
  password: "Mmil3GwK8D",
  database: "sql10802501",
  port: 3306,
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0
});

// ================= ROTAS DE CLIENTES =================

// Cadastrar novo cliente
app.post("/api/clientes", (req, res) => {
  const { nome_completo, telefone, cep, logradouro, bairro, cidade, uf } = req.body;

  if (!nome_completo || !telefone || !cep) {
    return res.status(400).json({ error: "Campos obrigatórios não preenchidos" });
  }

  const sql = `
    INSERT INTO clientes (nome_completo, telefone, logradouro, bairro, cidade, uf, cep)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(sql, [nome_completo, telefone, logradouro, bairro, cidade, uf, cep], (err, result) => {
    if (err) {
      console.error("Erro ao cadastrar cliente:", err);
      return res.status(500).json({ error: "Erro ao cadastrar cliente" });
    }
    res.json({ message: "Cliente cadastrado com sucesso!", id_cliente: result.insertId });
  });
});

// Listar clientes
app.get("/api/clientes", (req, res) => {
  const sql = "SELECT * FROM clientes ORDER BY id_cliente DESC";
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Erro ao listar clientes:", err);
      return res.status(500).json({ error: "Erro ao listar clientes" });
    }
    res.json(results);
  });
});

// ================= ROTAS DE CARROS =================

// Cadastrar carro vinculado a cliente
app.post("/api/carro", (req, res) => {
  const { placa, marca, modelo, ano, cor, id_cliente } = req.body;

  if (!placa || !marca || !modelo || !ano || !id_cliente) {
    return res.status(400).json({ error: "Campos obrigatórios não preenchidos" });
  }

  // Validação simples de placa e ano
  const placaRegex = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/i;
  if (!placaRegex.test(placa)) return res.status(400).json({ error: "Placa inválida" });
  if (!/^\d{4}$/.test(ano)) return res.status(400).json({ error: "Ano inválido" });

  const sql = `
    INSERT INTO carros (placa, marca, modelo, ano, cor, id_cliente)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.query(sql, [placa.toUpperCase(), marca, modelo, ano, cor, id_cliente], (err, result) => {
    if (err) {
      console.error("Erro ao cadastrar carro:", err);
      return res.status(500).json({ error: "Erro ao cadastrar carro" });
    }
    res.json({ message: "Carro cadastrado com sucesso!", id_carro: result.insertId });
  });
});

// Buscar carro por placa com dados do cliente
app.get("/api/carro/:placa", (req, res) => {
  const { placa } = req.params;
  const sql = `
    SELECT c.*, cl.nome_completo, cl.telefone, cl.logradouro, cl.bairro, cl.cidade, cl.uf, cl.cep
    FROM carros c
    JOIN clientes cl ON c.id_cliente = cl.id_cliente
    WHERE c.placa = ?
  `;

  db.query(sql, [placa.toUpperCase()], (err, results) => {
    if (err) {
      console.error("Erro ao buscar carro:", err);
      return res.status(500).json({ error: "Erro ao buscar carro" });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: "Carro não encontrado" });
    }
    res.json(results[0]);
  });
});

// ================= ROTAS DE AGENDAMENTOS =================
app.post("/api/agendar", (req, res) => {
  const { name, carModel, washType, appointmentDate } = req.body;

  if (!name || !carModel || !washType || !appointmentDate) {
    return res.status(400).json({ error: "Todos os campos são obrigatórios" });
  }

  const sql = `
    INSERT INTO agendamentos (nome_cliente, modelo_carro, tipo_lavagem, data_agendada)
    VALUES (?, ?, ?, ?)
  `;

  db.query(sql, [name, carModel, washType, appointmentDate], (err) => {
    if (err) {
      console.error("Erro ao salvar agendamento:", err);
      return res.status(500).json({ error: "Erro ao salvar agendamento" });
    }
    res.json({ message: "Agendamento realizado com sucesso!" });
  });
});

app.get("/api/listar", (req, res) => {
  const sql = "SELECT * FROM agendamentos ORDER BY id DESC";
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Erro ao listar agendamentos:", err);
      return res.status(500).json({ error: "Erro ao listar agendamentos" });
    }
    res.json(results);
  });
});

app.delete("/api/agendar/:id", (req, res) => {
  const { id } = req.params;
  const sql = "DELETE FROM agendamentos WHERE id = ?";

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error("Erro ao deletar agendamento:", err);
      return res.status(500).json({ error: "Erro ao deletar agendamento" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Agendamento não encontrado" });
    }
    res.json({ message: "Agendamento excluído com sucesso!" });
  });
});

// ================= ROTA PARA CONSULTAR CEP VIA VIACEP =================
app.get("/api/cep/:cep", async (req, res) => {
  const { cep } = req.params;
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (!response.ok) throw new Error("Erro ao consultar o CEP");

    const data = await response.json();
    if (data.erro) return res.status(404).json({ error: "CEP não encontrado" });

    res.json(data);
  } catch (error) {
    console.error("Erro ao consultar CEP:", error);
    res.status(500).json({ error: "Erro ao consultar CEP" });
  }
});

// ================= ROTAS DE PÁGINAS HTML =================
app.get("/", (req, res) => res.redirect("/agendar"));
app.get("/agendar", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.get("/lista", (req, res) => res.sendFile(path.join(__dirname, "public", "lista.html")));
app.get("/cadastra_carro.html", (req, res) => res.sendFile(path.join(__dirname, "public", "cadastra_carro.html")));
app.get("/cadastra_cliente.html", (req, res) => res.sendFile(path.join(__dirname, "public", "cadastra_cliente.html")));

// ================= Inicialização do servidor =================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
