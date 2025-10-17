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

  if (!nome_cliente) return res.status(400).json({ error: "Nome do cliente é obrigatório" });

  const sql = `
    INSERT INTO cliente
      (nome_cliente, cpf, data_nascimento, email, celular, telefone, cep, cidade, bairro, logradouro, numero, complemento)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  db.query(sql, [
    nome_cliente, cpf || null, data_nascimento || null, email || null, celular || telefone || null,
    cep || null, cidade || null, bairro || null, logradouro || null, numero || null, complemento || null
  ], (err, result) => {
    if (err) return res.status(500).json({ error: "Erro ao cadastrar cliente" });
    res.json({ message: "Cliente cadastrado com sucesso!", id_cliente: result.insertId });
  });
});

app.patch("/api/clientes/:id", (req, res) => {
  const { id } = req.params;
  const {
    nome_cliente,
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

  const campos = [];
  const valores = [];

  if (nome_cliente !== undefined) { campos.push("nome_cliente = ?"); valores.push(nome_cliente); }
  if (cpf !== undefined) { campos.push("cpf = ?"); valores.push(cpf); }
  if (data_nascimento !== undefined) { campos.push("data_nascimento = ?"); valores.push(data_nascimento); }
  if (email !== undefined) { campos.push("email = ?"); valores.push(email); }
  if (celular !== undefined) { campos.push("celular = ?"); valores.push(celular); }
  if (telefone !== undefined) { campos.push("telefone = ?"); valores.push(telefone); }
  if (cep !== undefined) { campos.push("cep = ?"); valores.push(cep); }
  if (cidade !== undefined) { campos.push("cidade = ?"); valores.push(cidade); }
  if (bairro !== undefined) { campos.push("bairro = ?"); valores.push(bairro); }
  if (logradouro !== undefined) { campos.push("logradouro = ?"); valores.push(logradouro); }
  if (numero !== undefined) { campos.push("numero = ?"); valores.push(numero); }
  if (complemento !== undefined) { campos.push("complemento = ?"); valores.push(complemento); }

  if (campos.length === 0) return res.status(400).json({ error: "Nenhum campo enviado" });

  const sql = `UPDATE cliente SET ${campos.join(", ")} WHERE id_cliente = ?`;
  valores.push(id);

  db.query(sql, valores, (err, result) => {
    if (err) return res.status(500).json({ error: "Erro ao atualizar cliente" });
    if (result.affectedRows === 0) return res.status(404).json({ error: "Cliente não encontrado" });
    res.json({ message: "Cliente atualizado com sucesso!" });
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

app.delete("/api/carros/:id", (req, res) => {
  const { id } = req.params;
  const sql = "DELETE FROM carros WHERE id_carro = ?";
  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json({ error: "Erro ao excluir carro" });
    if (result.affectedRows === 0) return res.status(404).json({ error: "Carro não encontrado" });
    res.json({ message: "Carro excluído com sucesso!" });
  });
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
