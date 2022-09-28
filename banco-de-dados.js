var conector = require("mysql");

var conexao = conector.createConnection({
    host: "pwms.com.br",
    user: "controlei-user",
    password: "controlei-user-123",
    database: "controlei"
});

exports.conectar = function (dataString, titulo, valor) {
    conexao.connect(callback);
};

exports.salvar = function (dataString, titulo, valor, cartao) {
    var sql = "INSERT INTO tb_lancamentos_cartao_credito (data, titulo, valor, cartao, created_at) VALUES ('"+dataString+"', '"+titulo+"', "+valor+", '"+cartao+"', NOW())";
    conexao.query(sql, function (err, resultado) {
        if (err) { 
            if(err.code == 'ER_DUP_ENTRY'){
                console.info("Status: já cadastrado: " + titulo);
              }else{
                console.info(err);
              }
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