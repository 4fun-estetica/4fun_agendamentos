const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Configuração do MySQL
const db = mysql.createConnection({
    host: "localhost",
    user: "434992",
    password: "fourfun2025",
    database: "4fun-agendametnos_db"
});

// Teste de conexão
db.connect(err => {
    if (err) console.error("Erro ao conectar no MySQL:", err);
    else console.log("✅ Conectado ao MySQL!");
});

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
