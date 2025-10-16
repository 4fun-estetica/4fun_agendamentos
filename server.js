import express from "express";
import mysql from "mysql2";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

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

// ==== Funções auxiliares de data/hora ====
function ajustarParaUTC(dataISO) {
  const data = new Date(dataISO);
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  const hora = String(data.getHours()).padStart(2, "0");
  const min = String(data.getMinutes()).padStart(2, "0");
  return `${ano}-${mes}-${dia} ${hora}:${min}:00`;
}

function ajustarParaHorarioDeBrasilia(dataString) {
  if (!dataString) return "";
  try {
    // Corrige formato vindo do MySQL ("YYYY-MM-DD HH:mm:ss")
    const dataUTC = new Date(dataString.replace(" ", "T") + "Z");
    if (isNaN(dataUTC)) return "Data inválida";

    // Ajusta para UTC−3 (horário de Brasília)
    const dataBrasilia = new Date(dataUTC.getTime() - 3 * 60 * 60 * 1000);

    const dia = String(dataBrasilia.getDate()).padStart(2, "0");
    const mes = String(dataBrasilia.getMonth() + 1).padStart(2, "0");
    const ano = dataBrasilia.getFullYear();
    const hora = String(dataBrasilia.getHours()).padStart(2, "0");
    const min = String(dataBrasilia.getMinutes()).padStart(2, "0");
    return `${dia}/${mes}/${ano}, ${hora}:${min}`;
  } catch {
    return "Data inválida";
  }
}

// ================= ROTAS DE CLIENTES =================
app.post("/api/clientes", (req, res) => {
  const { nome_completo, telefone, cep, logradouro, bairro, cidade, uf } = req.body;
  if (!nome_completo || !telefone || !cep)
    return res.status(400).json({ error: "Campos obrigatórios não preenchidos" });

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

app.get("/api/clientes", (req, res) => {
  db.query("SELECT * FROM clientes ORDER BY id_cliente DESC", (err, results) => {
    if (err) return res.status(500).json({ error: "Erro ao listar clientes" });
    res.json(results);
  });
});

app.delete("/api/clientes/:id", (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM clientes WHERE id_cliente = ?", [id], (err, result) => {
    if (err) return res.status(500).json({ error: "Erro ao excluir cliente" });
    if (result.affectedRows === 0) return res.status(404).json({ error: "Cliente não encontrado" });
    res.json({ message: "Cliente excluído com sucesso!" });
  });
});

// ================= ROTAS DE CARROS =================
app.post("/api/carro", (req, res) => {
  const { placa, marca, modelo, ano, cor } = req.body;
  if (!placa || !marca || !modelo || !ano || !cor)
    return res.status(400).json({ error: "Campos obrigatórios não preenchidos" });

  const placaRegex = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/i;
  if (!placaRegex.test(placa)) return res.status(400).json({ error: "Placa inválida" });
  if (!/^\d{4}$/.test(ano)) return res.status(400).json({ error: "Ano inválido" });

  const sql = `INSERT INTO carros (placa, marca, modelo, ano, cor) VALUES (?, ?, ?, ?, ?)`;
  db.query(sql, [placa.toUpperCase(), marca, modelo, ano, cor], (err, result) => {
    if (err) {
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(400).json({ error: "Erro: esta placa já está cadastrada." });
      }
      return res.status(500).json({ error: "Erro ao cadastrar carro" });
    }
    res.json({ message: "Carro cadastrado com sucesso!", id_carro: result.insertId });
  });
});

// ================= ROTAS DE AGENDAMENTO =================
app.post("/api/agendar", (req, res) => {
  const { name, carModel, washType, appointmentDate } = req.body;
  if (!name || !carModel || !washType || !appointmentDate)
    return res.status(400).json({ error: "Todos os campos são obrigatórios" });

  const dataFormatada = ajustarParaUTC(appointmentDate);
  const sql = `
    INSERT INTO agendamentos (nome_cliente, modelo_carro, tipo_lavagem, data_agendada, status)
    VALUES (?, ?, ?, ?, 'Pendente')
  `;
  db.query(sql, [name, carModel, washType, dataFormatada], (err) => {
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
    if (err) return res.status(500).json({ error: "Erro ao listar agendamentos" });

    const ajustado = results.map(a => ({
      ...a,
      data_agendada: ajustarParaHorarioDeBrasilia(a.data_agendada),
      data_registro: ajustarParaHorarioDeBrasilia(a.data_registro)
    }));

    res.json(ajustado);
  });
});

app.delete("/api/agendar/:id", (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM agendamentos WHERE id = ?", [id], (err, result) => {
    if (err) return res.status(500).json({ error: "Erro ao deletar agendamento" });
    if (result.affectedRows === 0) return res.status(404).json({ error: "Agendamento não encontrado" });
    res.json({ message: "Agendamento excluído com sucesso!" });
  });
});

app.put("/api/agendar/:id/status", (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!["Pendente", "Feito", "Cancelado"].includes(status))
    return res.status(400).json({ error: "Status inválido" });

  db.query("UPDATE agendamentos SET status = ? WHERE id = ?", [status, id], (err, result) => {
    if (err) return res.status(500).json({ error: "Erro ao atualizar status" });
    if (result.affectedRows === 0) return res.status(404).json({ error: "Agendamento não encontrado" });
    res.json({ message: `Status atualizado para "${status}" com sucesso!` });
  });
});

// ================= ROTA CEP =================
app.get("/api/cep/:cep", async (req, res) => {
  const { cep } = req.params;
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (!response.ok) throw new Error("Erro ao consultar CEP");
    const data = await response.json();
    if (data.erro) return res.status(404).json({ error: "CEP não encontrado" });
    res.json(data);
  } catch (error) {
    console.error("Erro ao consultar CEP:", error);
    res.status(500).json({ error: "Erro ao consultar CEP" });
  }
});

// ================= ROTAS HTML =================
app.get("/", (req, res) => res.redirect("/agendar"));
app.get("/agendar", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.get("/lista", (req, res) => res.sendFile(path.join(__dirname, "public", "lista.html")));
app.get("/cadastra_carro.html", (req, res) => res.sendFile(path.join(__dirname, "public", "cadastra_carro.html")));
app.get("/cadastra_cliente.html", (req, res) => res.sendFile(path.join(__dirname, "public", "cadastra_cliente.html")));

// ================= Inicialização =================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
