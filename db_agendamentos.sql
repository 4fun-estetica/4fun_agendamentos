USE sql1080201;

CREATE TABLE agendamentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    modelo_carro VARCHAR(100) NOT NULL,
    tipo_lavagem VARCHAR(50) NOT NULL,
    data_agendada DATE NOT NULL,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE agendamentos
ADD COLUMN status VARCHAR(20) DEFAULT 'Pendente';


CREATE TABLE carros (
  id_carro INT AUTO_INCREMENT PRIMARY KEY,
  placa VARCHAR(10) NOT NULL UNIQUE,
  marca VARCHAR(50),
  modelo VARCHAR(100),
  ano VARCHAR(10),
  cor VARCHAR(30),
  nome_cliente VARCHAR(100)
);

CREATE TABLE clientes (
  id_cliente INT AUTO_INCREMENT PRIMARY KEY,
  nome_completo VARCHAR(100) NOT NULL,
  telefone VARCHAR(20) NOT NULL,
  logradouro VARCHAR(100),
  bairro VARCHAR(50),
  cidade VARCHAR(50),
  uf CHAR(2),
  cep CHAR(8)
);

-- Ajustar o tipo da coluna 'placa' para aceitar exatamente 7 caracteres
ALTER TABLE carros
  MODIFY COLUMN placa CHAR(7) NOT NULL UNIQUE;

-- Alterar o tipo da coluna 'ano' para YEAR
ALTER TABLE carros
  MODIFY COLUMN ano YEAR NOT NULL;

-- Adicionar coluna 'id_cliente' para vincular ao cliente
ALTER TABLE carros
  ADD COLUMN id_cliente INT NULL AFTER cor;

-- Criar relação com a tabela 'clientes' (se ainda não existir)
ALTER TABLE carros
  ADD CONSTRAINT fk_carros_clientes
  FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente)
  ON UPDATE CASCADE
  ON DELETE SET NULL;

-- Remover o campo redundante 'nome_cliente' — 
-- Apenas se você já estiver vinculando o carro via 'id_cliente'
ALTER TABLE carros
  DROP COLUMN nome_cliente;


-- Altera o campo data_agendada para aceitar data e hora
ALTER TABLE agendamentos MODIFY data_agendada DATETIME NOT NULL;
