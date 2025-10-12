CREATE DATABASE agendamentos_db;

USE agendamentos_db;

CREATE TABLE agendamentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    modelo_carro VARCHAR(100) NOT NULL,
    tipo_lavagem VARCHAR(50) NOT NULL,
    data_agendada DATE NOT NULL,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);