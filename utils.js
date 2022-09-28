//08 / jan -> 2022-01-08
exports.dataExtensaParaBancoDeDados = function (string) {
    var dia = string.substring(0, 2);
    var mes = mesStringToNumber(string.substring(5, 8));
    var ano = new Date().getFullYear();

    var data = ano + "-" + mes.toString().padStart(2, '0') + "-" + dia;
    return data;
};

//'26/10/22' -> 2022-10-26
exports.datadataBRtoDatabase = function (string) {
    var dia = string.substring(0, 2);
    var mes = string.substring(3, 5);
    var ano = string.substring(6, 8);

    var data = ano + "-" + mes.toString().padStart(2, '0') + "-" + dia;
    return data;
};

// fev -> 2
mesStringToNumber = function (string) {
    switch (string) {
        case 'jan': return 1
            break;
        case 'fev': return 2
            break;
        case 'mar': return 3
            break;
        case 'abr': return 4
            break;
        case 'mai': return 5
            break;
        case 'jun': return 6
            break;
        case 'jul': return 7
            break;
        case 'ago': return 8
            break;
        case 'set': return 9
            break;
        case 'out': return 10
            break;
        case 'nov': return 11
            break;
        case 'dez': return 12
            break;
        default:
            break;
    }
};