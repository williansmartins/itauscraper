CREATE TABLE financeiro.tb_lancamentos_cartao_credito (
	id int PRIMARY KEY  auto_increment NOT NULL,
	`data` DATE NOT NULL,
	descricao varchar(100) NOT NULL,
	valor decimal NOT NULL,
	cartao int NOT NULL
);
