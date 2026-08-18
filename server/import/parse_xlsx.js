// Uso local (terminal): le um .xlsx e grava seed_data_novo.json.
// Uso do dia a dia: pela tela "Importar Planilha" dentro do proprio sistema, que usa
// server/import/xlsxParser.js diretamente (sem precisar de terminal).

const fs = require('fs');
const path = require('path');
const { parseXlsxBuffer } = require('./xlsxParser');

const XLSX_PATH = process.argv[2];
if (!XLSX_PATH) {
  console.error('Uso: node parse_xlsx.js "caminho\\para\\arquivo.xlsx"');
  process.exit(1);
}
const OUT_PATH = path.join(__dirname, 'seed_data_novo.json');

const buffer = fs.readFileSync(XLSX_PATH);
const { pedidos, laudos, recursos, saldao, avisos } = parseXlsxBuffer(buffer);

fs.writeFileSync(OUT_PATH, JSON.stringify({ pedidos, laudos, recursos, saldao }, null, 2), 'utf8');

console.log('Pedidos:', pedidos.length);
console.log('Laudos:', laudos.length);
console.log('Recursos:', recursos.length);
console.log('Saldao:', saldao.length);
console.log('Escrito em', OUT_PATH);
if (avisos.length) {
  console.log(`\n${avisos.length} aviso(s) de dados suspeitos (nao entraram no arquivo, precisam de revisao na planilha):`);
  avisos.forEach((a) => console.log(' - ' + a));
}
