// server.js
import express from "express";
import mysql from "mysql2";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(express.json());
app.use(cors());

// Configuração para servir arquivos estáticos
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "public")));

// Conexão MySQL
const db = mysql.createConnection({
  host: process.env.DB_HOST || "sql10.freesqldatabase.com",
  user: process.env.DB_USER || "sql10802501",
  password: process.env.DB_PASSWORD || "Mmil3GwK8D",
  database: process.env.DB_NAME || "sql10802501",
  port: process.env.DB_PORT || 3306
});

// Teste de conexão
db.connect(err => {
  if (err) {
    console.error("Erro na conexão com MySQL:", err);
  } else {
    console.log("Conexão MySQL bem-sucedida!");
  }
});

// --- Rotas para páginas ---
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/lista", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "lista.html"));
});

// --- Rota POST para criar agendamento ---
app.post("/agendamentos", (req, res) => {
  const { nome_cliente, modelo_carro, tipo_lavagem, data_agendada } = req.body;

  const sql = `
    INSERT INTO agendamentos (nome_cliente, modelo_carro, tipo_lavagem, data_agendada)
    VALUES (?, ?, ?, ?)
  `;

  db.query(sql, [nome_cliente, modelo_carro, tipo_lavagem, data_agendada], (err, result) => {
    if (err) {
      console.error("Erro MySQL:", err);
      return res.status(500).json({ error: err.message });
    }
    res.status(200).json({ message: "Agendamento registrado com sucesso!" });
  });
});

// --- Rota GET para retornar todos agendamentos em JSON ---
app.get("/api/listar", (req, res) => {
  const sql = "SELECT * FROM agendamentos ORDER BY data_registro DESC";
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Erro ao buscar agendamentos:", err);
      return res.status(500).json({ error: "Erro ao buscar agendamentos" });
    }
    res.json(results);
  });
});

// --- Porta do servidor ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
