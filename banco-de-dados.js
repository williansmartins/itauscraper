var conector = require("mysql");

var conexao = conector.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "financeiro"
});

exports.conectar = function (dataString, descricao, valor) {
    conexao.connect(callback);
};

exports.salvar = function (dataString, descricao, valor, cartao) {
    var sql = "INSERT INTO tb_lancamentos_cartao_credito VALUES (null, '"+dataString+"', '"+descricao+"', "+valor+", '"+cartao+"')";
    conexao.query(sql, function (erro, resultado) {
        if (erro) { 
            console.error(erro);
        }else{
            console.log("Inserido com sucesso: " + resultado.insertId);
            // console.log(resultado); 
        }
    });
};

function callback(erro){
    if(erro){
        console.error("Erro ao tentar se conextar");
        console.error(erro);
    }else{
        console.info("Sucesso ao conectar!");
    }
}