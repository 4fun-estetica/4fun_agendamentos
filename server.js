import express from "express";
import mysql from "mysql2";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors());

// Conexão MySQL (AlwaysData)
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306
});

// Verificar conexão
db.connect(err => {
  if (err) {
    console.error("Erro na conexão com o MySQL:", err);
  } else {
    console.log("Conexão MySQL bem-sucedida!");
  }
});

// Exemplo de rota
app.get("/", (req, res) => {
  res.send("Servidor 4Fun funcionando 🚗💦");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));

// Rota para salvar agendamento
app.post("/api/agendar", (req, res) => {
    const { name, carModel, washType, appointmentDate } = req.body;

    const sql = `
        INSERT INTO agendamentos (nome_cliente, modelo_carro, tipo_lavagem, data_agendada)
        VALUES (?, ?, ?, ?)
    `;
    db.query(sql, [name, carModel, washType, appointmentDate], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ status: "ok", id: result.insertId });
    });
});

// Rota para listar agendamentos
app.get("/api/listar", (req, res) => {
    db.query("SELECT * FROM agendamentos ORDER BY id DESC", (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Iniciar servidor
const PORT = 3000;
app.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));
