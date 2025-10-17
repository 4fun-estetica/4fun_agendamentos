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
  if (isNaN(data)) return null;
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  const hora = String(data.getHours()).padStart(2, "0");
  const min = String(data.getMinutes()).padStart(2, "0");
  return `${ano}-${mes}-${dia} ${hora}:${min}:00`;
}

function ajustarParaHorarioDeBrasilia(dataInput) {
  if (!dataInput) return null;
  const data = new Date(dataInput);
  if (isNaN(data)) return null;
  const offset = -3 * 60;
  const localDate = new Date(data.getTime() + offset * 60 * 1000);
  return localDate.toISOString();
}

// ================= ROTAS DE CLIENTES =================
app.get("/api/clientes", (req, res) => {
  const sql = "SELECT * FROM cliente ORDER BY id_cliente DESC";
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: "Erro ao listar clientes" });
    res.json(results);
  });
});

app.post("/api/clientes", (req, res) => {
  const {
    nome_cliente,
    nome_completo,
    cpf,
    data_nascimento,
    email,
    celular,
    telefone,
    cep,
    cidade,
    bairro,
    logradouro,
    numero,
    complemento
  } = req.body;

  const nome = nome_cliente || nome_completo;
  const tel = celular || telefone || null;
  if (!nome) return res.status(400).json({ error: "Nome do cliente é obrigatório" });

  const sql = `
    INSERT INTO cliente
      (nome_cliente, cpf, data_nascimento, email, celular, cep, cidade, bairro, logradouro, numero, complemento)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  db.query(sql, [
    nome, cpf || null, data_nascimento || null, email || null, tel,
    cep || null, cidade || null, bairro || null, logradouro || null, numero || null, complemento || null
  ], (err, result) => {
    if (err) return res.status(500).json({ error: "Erro ao cadastrar cliente" });
    res.json({ message: "Cliente cadastrado com sucesso!", id_cliente: result.insertId });
  });
});

app.delete("/api/clientes/:id", (req, res) => {
  const { id } = req.params;
  const sql = "DELETE FROM cliente WHERE id_cliente = ?";
  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json({ error: "Erro ao excluir cliente" });
    if (result.affectedRows === 0) return res.status(404).json({ error: "Cliente não encontrado" });
    res.json({ message: "Cliente excluído com sucesso!" });
  });
});

// ================= ROTAS DE CARROS =================
app.post("/api/carro", (req, res) => {
  const { id_cliente, marca, modelo, ano, placa, cor } = req.body;
  if (!placa || !marca || !modelo) return res.status(400).json({ error: "placa, marca e modelo são obrigatórios" });

  const placaRegex = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/i;
  if (!placaRegex.test(placa)) return res.status(400).json({ error: "Placa inválida" });

  if (ano && !/^\d{4}$/.test(String(ano))) return res.status(400).json({ error: "Ano inválido" });

  const sql = `INSERT INTO carros (id_cliente, marca, modelo, ano, placa, cor) VALUES (?, ?, ?, ?, ?, ?)`;
  db.query(sql, [id_cliente || null, marca, modelo, ano || null, placa.toUpperCase(), cor || null], (err, result) => {
    if (err) {
      if (err.code === "ER_DUP_ENTRY") return res.status(400).json({ error: "Placa já cadastrada" });
      return res.status(500).json({ error: "Erro ao cadastrar carro" });
    }
    res.json({ message: "Carro cadastrado com sucesso!", id_carro: result.insertId });
  });
});

app.get("/api/carros", (req, res) => {
  const sql = `
    SELECT c.id_carro, c.placa, c.marca, c.modelo, c.ano, c.cor,
           cl.id_cliente, cl.nome_cliente
    FROM carros c
    LEFT JOIN cliente cl ON c.id_cliente = cl.id_cliente
    ORDER BY c.id_carro DESC
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: "Erro ao listar carros" });
    res.json(results);
  });
});

app.get("/api/carros/:placa", (req, res) => {
  const { placa } = req.params;
  const sql = `
    SELECT 
      c.id_carro, c.placa, c.marca, c.modelo, c.ano, c.cor,
      cl.id_cliente, cl.nome_cliente
    FROM carros c
    LEFT JOIN cliente cl ON c.id_cliente = cl.id_cliente
    WHERE c.placa = ? LIMIT 1
  `;
  db.query(sql, [placa.toUpperCase()], (err, results) => {
    if (err) return res.status(500).json({ error: "Erro ao buscar carro." });
    if (!results || results.length === 0) return res.status(404).json({ error: "Carro não encontrado." });
    res.json(results[0]);
  });
});

app.patch("/api/carros/:id", (req, res) => {
  const { id } = req.params;
  const { placa, marca, modelo, ano, cor, id_cliente } = req.body;
  const campos = [], valores = [];

  if (placa) { 
    if (!/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/i.test(placa)) return res.status(400).json({ error: "Placa inválida" });
    campos.push("placa = ?"); valores.push(placa.toUpperCase()); 
  }
  if (marca) { campos.push("marca = ?"); valores.push(marca); }
  if (modelo) { campos.push("modelo = ?"); valores.push(modelo); }
  if (ano) { if (!/^\d{4}$/.test(String(ano))) return res.status(400).json({ error: "Ano inválido" }); campos.push("ano = ?"); valores.push(ano); }
  if (cor) { campos.push("cor = ?"); valores.push(cor); }
  if (id_cliente !== undefined) { campos.push("id_cliente = ?"); valores.push(id_cliente || null); }
  if (campos.length === 0) return res.status(400).json({ error: "Nenhum campo enviado" });

  const sql = `UPDATE carros SET ${campos.join(", ")} WHERE id_carro = ?`;
  valores.push(id);
  db.query(sql, valores, (err, result) => {
    if (err) return res.status(500).json({ error: "Erro ao atualizar carro" });
    if (result.affectedRows === 0) return res.status(404).json({ error: "Carro não encontrado" });
    res.json({ message: "Carro atualizado com sucesso!" });
  });
});

// ================= ROTAS DE AGENDAMENTOS =================
app.post("/api/agendar", (req, res) => {
  const { name, carModel, washType, appointmentDate, placa } = req.body;
  if (!name || !carModel || !washType || !appointmentDate) {
    return res.status(400).json({ error: "Todos os campos são obrigatórios" });
  }

  const dataFormatada = ajustarParaUTC(appointmentDate);
  if (!dataFormatada) return res.status(400).json({ error: "Data inválida" });

  (async function() {
    try {
      const q = (sql, params=[]) => new Promise((resolve, reject) => db.query(sql, params, (err, rows) => err ? reject(err) : resolve(rows)));
      let id_carro = null, id_cliente = null;

      if (placa) {
        const rows = await q(`SELECT id_carro, id_cliente FROM carros WHERE placa = ? LIMIT 1`, [placa.toUpperCase()]);
        if (rows && rows.length > 0) {
          id_carro = rows[0].id_carro;
          id_cliente = rows[0].id_cliente || null;
        }
      }

      const insertSql = `
        INSERT INTO agendamentos (id_cliente, id_carro, tipo_lavagem, data_agendada, nome_cliente)
        VALUES (?, ?, ?, ?, ?)
      `;
      await q(insertSql, [id_cliente, id_carro, washType, dataFormatada, name.trim()]);
      return res.json({ message: "Agendamento realizado com sucesso!" });
    } catch (err) {
      console.error("Erro ao salvar agendamento:", err);
      return res.status(500).json({ error: "Erro ao salvar agendamento" });
    }
  })();
});

app.get("/api/agendamentos", (req, res) => {
  const sql = `
    SELECT
      a.id,
      a.id_cliente,
      a.id_carro,
      a.tipo_lavagem,
      a.data_agendada,
      a.data_criacao,
      a.status,
      c.placa,
      c.marca,
      c.modelo,
      a.nome_cliente
    FROM agendamentos a
    LEFT JOIN carros c ON a.id_carro = c.id_carro
    ORDER BY a.id DESC
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: "Erro ao listar agendamentos" });
    const ajustado = results.map(a => ({
      ...a,
      data_agendada: a.data_agendada ? ajustarParaHorarioDeBrasilia(a.data_agendada) : null,
      data_criacao: a.data_criacao ? ajustarParaHorarioDeBrasilia(a.data_criacao) : null
    }));
    res.json(ajustado);
  });
});

app.delete("/api/agendar/:id", (req, res) => {
  const { id } = req.params;
  const sql = "DELETE FROM agendamentos WHERE id = ?";
  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json({ error: "Erro ao deletar agendamento" });
    if (result.affectedRows === 0) return res.status(404).json({ error: "Agendamento não encontrado" });
    res.json({ message: "Agendamento excluído com sucesso!" });
  });
});

app.put("/api/agendar/:id/status", (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!['Pendente','Feito','Cancelado'].includes(status)) return res.status(400).json({ error: "Status inválido" });
  const sql = "UPDATE agendamentos SET status = ? WHERE id = ?";
  db.query(sql, [status, id], (err, result) => {
    if (err) return res.status(500).json({ error: "Erro ao atualizar status" });
    if (result.affectedRows === 0) return res.status(404).json({ error: "Agendamento não encontrado" });
    res.json({ message: `Status atualizado para "${status}" com sucesso!` });
  });
});

// ================= ROTAS CEP =================
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
