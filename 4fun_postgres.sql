-- =======================================================
-- BANCO DE DADOS 4FUN - POSTGRESQL
-- =======================================================

-- ⚠️ Exclui tabelas antigas se existirem
DROP TABLE IF EXISTS agendamentos CASCADE;
DROP TABLE IF EXISTS carros CASCADE;
DROP TABLE IF EXISTS cliente CASCADE;

-- =======================================================
-- 🧍 TABELA CLIENTE
-- =======================================================
CREATE TABLE cliente (
  id_cliente SERIAL PRIMARY KEY,
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
  id_carro SERIAL PRIMARY KEY,
  id_cliente INT,
  marca VARCHAR(50) NOT NULL,
  modelo VARCHAR(50) NOT NULL,
  ano VARCHAR(10),
  placa VARCHAR(8) UNIQUE NOT NULL,
  cor VARCHAR(30),
  CONSTRAINT fk_carro_cliente FOREIGN KEY (id_cliente)
    REFERENCES cliente(id_cliente)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

-- Permitir cliente NULL (equivalente ao ALTER TABLE MODIFY)
ALTER TABLE carros ALTER COLUMN id_cliente DROP NOT NULL;

-- =======================================================
-- 📅 TABELA AGENDAMENTOS
-- =======================================================
CREATE TABLE agendamentos (
  id SERIAL PRIMARY KEY,
  id_cliente INT,
  id_carro INT,
  tipo_lavagem VARCHAR(100) NOT NULL,
  data_agendada TIMESTAMP NOT NULL,
  data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(10) DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Feito', 'Cancelado')),
  nome_cliente VARCHAR(100),
  CONSTRAINT fk_agend_cliente FOREIGN KEY (id_cliente)
    REFERENCES cliente(id_cliente)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_agend_carro FOREIGN KEY (id_carro)
    REFERENCES carros(id_carro)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

-- Permitir id_cliente NULL (equivalente ao ALTER TABLE MODIFY)
ALTER TABLE agendamentos ALTER COLUMN id_cliente DROP NOT NULL;

-- Arredonda a data para a hora cheia (caso queira normalizar)
ALTER TABLE public.agendamentos
ALTER COLUMN data_agendada TYPE timestamptz
USING date_trunc('hour', data_agendada);

-- Agora adiciona a constraint UNIQUE na coluna data_agendada
ALTER TABLE public.agendamentos
ADD CONSTRAINT unica_data_hora UNIQUE (data_agendada);



Hostname: dpg-d3r87e49c44c73d9687g-a
Port: 5432
Database: db_fourfun_agendametos
Username: db_fourfun_agendametos_user
Password: wNRa2qKfG6PvWNnCMYg7yE9zVVncupHH
Internal Database URL: postgresql://db_fourfun_agendametos_user:wNRa2qKfG6PvWNnCMYg7yE9zVVncupHH@dpg-d3r87e49c44c73d9687g-a/db_fourfun_agendametos
External Database URL: postgresql://db_fourfun_agendametos_user:wNRa2qKfG6PvWNnCMYg7yE9zVVncupHH@dpg-d3r87e49c44c73d9687g-a.oregon-postgres.render.com/db_fourfun_agendametos
PSQL Command: PGPASSWORD=wNRa2qKfG6PvWNnCMYg7yE9zVVncupHH psql -h dpg-d3r87e49c44c73d9687g-a.oregon-postgres.render.com -U db_fourfun_agendametos_user db_fourfun_agendametos

Render pgHero app
pghero-f37416c3
813914e264ae417c0b89c22cf771f6d3


Validar no terminal
psql -h dpg-d3r87e49c44c73d9687g-a.oregon-postgres.render.com \
     -U db_fourfun_agendametos_user \
     -d db_fourfun_agendametos \
     -p 5432 \
     sslmode=require
