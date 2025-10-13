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
app.use(express.json()); // lê JSON enviado pelo frontend
app.use(express.urlencoded({ extended: true }));

// === Servir arquivos estáticos (HTML, CSS, JS) ===
app.use(express.static(path.join(__dirname, "public")));

// === Configuração do banco MySQL ===
const db = mysql.createConnection({
  host: "sql10.freesqldatabase.com",
  user: "sql10802501",
  password: "Mmil3GwK8D",
  database: "sql10802501",
  port: 3306,
});

// === Teste de conexão ===
db.connect((err) => {
  if (err) {
    console.error("Erro ao conectar ao banco:", err);
    return;
  }
  console.log("Conexão MySQL bem-sucedida!");
});

// === Rotas de API ===

// Criar novo agendamento
app.post("/api/agendar", (req, res) => {
  const { name, carModel, washType, appointmentDate } = req.body;

  if (!name || !carModel || !washType || !appointmentDate) {
    return res.status(400).json({ error: "Todos os campos são obrigatórios" });
  }

  const sql =
    "INSERT INTO agendamentos (nome_cliente, modelo_carro, tipo_lavagem, data_agendada) VALUES (?, ?, ?, ?)";
  db.query(sql, [name, carModel, washType, appointmentDate], (err, result) => {
    if (err) {
      console.error("Erro ao salvar agendamento:", err);
      return res.status(500).json({ error: "Erro ao salvar agendamento" });
    }
    res.json({ message: "Agendamento realizado com sucesso!" });
  });
});

// Listar todos os agendamentos
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
app.delete("/api/agendamentos/:id", (req, res) => {
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

// === Rotas de páginas HTML ===

// Redireciona a raiz para a página de agendamento
app.get("/", (req, res) => {
  res.redirect("/agendar");
});

// Página do formulário
app.get("/agendar", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Página da lista
app.get("/lista", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "lista.html"));
});

// === Inicialização do servidor ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
