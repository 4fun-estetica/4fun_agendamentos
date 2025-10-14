import express from "express";
import mysql from "mysql2";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

// ================== CONFIGURAÇÕES INICIAIS ==================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, "public")));

// ================== CONEXÃO COM O BANCO ==================
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

// Teste de conexão
db.getConnection((err, connection) => {
  if (err) {
    console.error("❌ Erro ao conectar ao banco:", err);
  } else {
    console.log("✅ Conexão MySQL bem-sucedida!");
    connection.release();
  }
});

// ================== ROTAS DE API ==================

// Criar novo agendamento
app.post("/api/agendar", (req, res) => {
  const { name, carModel, washType, appointmentDate } = req.body;

  if (!name || !carModel || !washType || !appointmentDate) {
    return res.status(400).json({ error: "Todos os campos são obrigatórios" });
  }

  const sql =
    "INSERT INTO agendamentos (nome_cliente, modelo_carro, tipo_lavagem, data_agendada) VALUES (?, ?, ?, ?)";
  db.query(sql, [name, carModel, washType, appointmentDate], (err) => {
    if (err) {
      console.error("Erro ao salvar agendamento:", err);
      return res.status(500).json({ error: "Erro ao salvar agendamento" });
    }
    res.json({ message: "Agendamento realizado com sucesso!" });
  });
});

// Listar agendamentos
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

// Excluir agendamento
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

// Cadastrar carro
app.post("/api/carro", (req, res) => {
  const { placa, marca, modelo, ano, cor, nome_cliente } = req.body;

  if (!placa || !marca || !modelo || !ano) {
    return res.status(400).json({ error: "Campos obrigatórios não preenchidos" });
  }

  const sql =
    "INSERT INTO carros (placa, marca, modelo, ano, cor, nome_cliente) VALUES (?, ?, ?, ?, ?, ?)";
  db.query(sql, [placa, marca, modelo, ano, cor, nome_cliente], (err) => {
    if (err) {
      console.error("Erro ao cadastrar carro:", err);
      return res.status(500).json({ error: "Erro ao cadastrar carro" });
    }
    res.json({ message: "Carro cadastrado com sucesso!" });
  });
});

// Buscar carro
app.get("/api/carro/:placa", (req, res) => {
  const { placa } = req.params;
  const sql = "SELECT * FROM carros WHERE placa = ?";

  db.query(sql, [placa], (err, results) => {
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

// ================== ROTAS HTML ==================
app.get("/", (req, res) => {
  res.redirect("/agendar");
});

app.get("/agendar", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/lista", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "lista.html"));
});

app.get("/cadastra_carro.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "cadastra_carro.html"));
});

// ================== INICIAR SERVIDOR ==================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🌐 http://localhost:${PORT}`);
});
