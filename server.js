import express from "express";
import mysql from "mysql2";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

// Permite uso de JSON e CORS
app.use(express.json());
app.use(cors());

// Configura caminhos absolutos
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Conexão MySQL (Freesqldatabase)
const db = mysql.createConnection({
  host: "sql10.freesqldatabase.com",
  user: "sql10802501",
  password: "Mmil3GwK8D",
  database: "sql10802501",
  port: 3306,
});

// Testa conexão com o banco
db.connect((err) => {
  if (err) {
    console.error("Erro ao conectar ao MySQL:", err);
  } else {
    console.log("✅ Conexão MySQL bem-sucedida!");
  }
});

/*
// Rota inicial (teste)
app.get("/", (req, res) => {
  res.send("Servidor 4Fun funcionando e conectado ao MySQL 🚗💦");
});
*/

// Redireciona a rota raiz para a página de agendamento
app.get("/", (req, res) => {
  res.redirect("/agendar");
});

// Serve arquivos estáticos
app.use(express.static(__dirname));

// Rota para página principal (formulário)
app.get("/agendar", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Rota para página de listagem
app.get("/lista", (req, res) => {
  res.sendFile(path.join(__dirname, "lista.html"));
});

// ========================
// ROTAS DA API
// ========================

// 🔹 Cadastro de agendamento
app.post("/api/agendar", (req, res) => {
  const { nome_cliente, modelo_carro, tipo_lavagem, data_agendada } = req.body;

  if (!nome_cliente || !modelo_carro || !tipo_lavagem || !data_agendada) {
    return res.status(400).json({ error: "Preencha todos os campos!" });
  }

  const sql =
    "INSERT INTO agendamentos (nome_cliente, modelo_carro, tipo_lavagem, data_agendada, data_registro) VALUES (?, ?, ?, ?, NOW())";
  const values = [nome_cliente, modelo_carro, tipo_lavagem, data_agendada];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("Erro ao inserir agendamento:", err);
      return res.status(500).json({ error: "Erro ao inserir agendamento" });
    }
    res.status(201).json({ message: "Agendamento realizado com sucesso!" });
  });
});

// 🔹 Listar todos os agendamentos
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

// 🔹 Excluir um agendamento
app.delete("/agendamentos/:id", (req, res) => {
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

// ========================
// INICIAR SERVIDOR
// ========================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🌐 http://localhost:${PORT}`);
});
