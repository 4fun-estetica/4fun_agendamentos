-- =======================================================
-- BANCO DE DADOS 4FUN - ESTRUTURA COMPLETA
-- Compatível com MySQL 5.7+ / phpMyAdmin
-- =======================================================

-- ⚠️ Exclui tabelas antigas se existirem
DROP TABLE IF EXISTS agendamentos;
DROP TABLE IF EXISTS carros;
DROP TABLE IF EXISTS cliente;

-- =======================================================
-- 🧍 TABELA CLIENTE
-- =======================================================
CREATE TABLE cliente (
  id_cliente INT AUTO_INCREMENT PRIMARY KEY,
  nome_cliente VARCHAR(100) NOT NULL,
  cpf CHAR(11),
  data_nascimento DATE,
  email VARCHAR(100),
  celular VARCHAR(15),
  cep VARCHAR(8),
  cidade VARCHAR(50),
  bairro VARCHAR(50),
  logradouro VARCHAR(100),
  numero VARCHAR(10),
  complemento VARCHAR(100)
);

-- =======================================================
-- 🚗 TABELA CARROS
-- =======================================================
CREATE TABLE carros (
  id_carro INT AUTO_INCREMENT PRIMARY KEY,
  id_cliente INT,
  marca VARCHAR(50) NOT NULL,
  modelo VARCHAR(50) NOT NULL,
  ano VARCHAR(10),
  placa VARCHAR(8) UNIQUE NOT NULL,
  cor VARCHAR(30),
  FOREIGN KEY (id_cliente) REFERENCES cliente(id_cliente)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

ALTER TABLE carros MODIFY id_cliente INT NULL;

-- =======================================================
-- 📅 TABELA AGENDAMENTOS
-- =======================================================
CREATE TABLE agendamentos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_cliente INT NOT NULL,
  id_carro INT NOT NULL,
  tipo_lavagem VARCHAR(100) NOT NULL,
  data_agendada DATETIME NOT NULL,
  data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('Pendente', 'Feito', 'Cancelado') DEFAULT 'Pendente',
  FOREIGN KEY (id_cliente) REFERENCES cliente(id_cliente)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  FOREIGN KEY (id_carro) REFERENCES carros(id_carro)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

ALTER TABLE agendamentos MODIFY id_cliente INT NULL;
ALTER TABLE agendamentos ADD COLUMN nome_cliente VARCHAR(100) AFTER id_cliente;