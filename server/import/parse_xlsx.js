// Le o arquivo .xlsx baixado do Google Sheets (formato nativo Excel, com datas/valores
// ja tipados) e gera server/import/seed_data_novo.json no mesmo formato do seed_data.json
// original, para comparacao/merge com o que ja esta no banco.

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const XLSX_PATH = process.argv[2];
if (!XLSX_PATH) {
  console.error('Uso: node parse_xlsx.js "caminho\\para\\arquivo.xlsx"');
  process.exit(1);
}
const OUT_PATH = path.join(__dirname, 'seed_data_novo.json');

const wb = XLSX.readFile(XLSX_PATH, { cellDates: true });

const avisos = [];

function dataIso(v, contexto) {
  if (!v) return null;
  if (v instanceof Date) {
    const y = v.getFullYear();
    if (y < 2015 || y > 2030) {
      avisos.push(`Data suspeita (ano ${y}) ignorada em ${contexto}: ${v}`);
      return null;
    }
    const m = String(v.getMonth() + 1).padStart(2, '0');
    const d = String(v.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof v === 'string') {
    const m = v.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) {
      const [, d, mo, y] = m;
      if (Number(y) >= 2015 && Number(y) <= 2030) return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
  }
  avisos.push(`Data em formato inesperado ignorada em ${contexto}: ${JSON.stringify(v)}`);
  return null;
}
function txt(v) {
  if (v === '' || v === undefined || v === null) return null;
  return String(v).trim();
}
function num(v) {
  if (v === '' || v === undefined || v === null) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function linhasDaAba(nomeAba) {
  const sheet = wb.Sheets[nomeAba];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  const headerIdx = rows.findIndex((r) => r.some((c) => String(c).trim() === '#'));
  return rows.slice(headerIdx + 1).filter((r) => txt(r[1])); // precisa ter Nº Pedido
}

const pedidos = linhasDaAba('📋 Registro Central').map((c) => ({
  numero_pedido: txt(c[1]),
  data: dataIso(c[2], `Registro Central, pedido ${c[1]}`),
  plataforma: txt(c[3]),
  tipo_envio: txt(c[4]),
  produto_sku: txt(c[5]),
  motivo: txt(c[6]),
  contestacao: txt(c[7]),
  resultado_contestacao: txt(c[8]),
  produto_recebido: txt(c[9]),
  status_geral: txt(c[10]),
  destinacao: txt(c[11]),
  valor_venda: num(c[12]),
  reembolso_ml: num(c[13]),
  custo_produto: num(c[14]),
  comissao_ml: num(c[15]),
  frete_envio: num(c[16]),
  frete_devolucao: num(c[17]),
  responsavel: txt(c[19]),
  obs: txt(c[20]),
}));

const laudos = linhasDaAba('🔍 Laudo do Produto').map((c) => ({
  numero_pedido: txt(c[1]),
  fotos_tiradas: txt(c[5]),
  embalagem_intacta: txt(c[6]),
  produto_funciona: txt(c[7]),
  dano_fisico: txt(c[8]),
  acessorios_completos: txt(c[9]),
  serial_conferido: txt(c[10]),
  condicao_geral: txt(c[11]),
  nf_emitida_erp: txt(c[12]),
  obs: txt(c[13]),
}));

const recursos = linhasDaAba('⚖️ Recurso na Plataforma').map((c) => ({
  numero_pedido: txt(c[1]),
  data_abertura: dataIso(c[5], `Recurso, pedido ${c[1]} (data abertura)`),
  evidencias_anexadas: txt(c[6]),
  status_recurso: txt(c[7]),
  data_resposta: dataIso(c[8], `Recurso, pedido ${c[1]} (data resposta)`),
  resultado_final: txt(c[9]),
  valor_reembolso: num(c[10]),
  obs: txt(c[12]),
}));

const saldao = linhasDaAba('🏪 Saldão Parceiro')
  .filter((c) => txt(c[1]) !== 'TOTAL')
  .map((c) => ({
    numero_pedido: txt(c[1]),
    data_envio: dataIso(c[5], `Saldao, pedido ${c[1]}`),
    lote_envio: txt(c[6]),
    condicao_produto: txt(c[7]),
    nf_emitida_parceiro: txt(c[8]),
    numero_nf_parceiro: txt(c[9]),
    valor_saldao: num(c[10]),
    obs: txt(c[12]),
  }));

const seed = { pedidos, laudos, recursos, saldao };
fs.writeFileSync(OUT_PATH, JSON.stringify(seed, null, 2), 'utf8');

console.log('Pedidos:', pedidos.length);
console.log('Laudos:', laudos.length);
console.log('Recursos:', recursos.length);
console.log('Saldao:', saldao.length);
console.log('Escrito em', OUT_PATH);
if (avisos.length) {
  console.log(`\n${avisos.length} aviso(s) de dados suspeitos (nao entraram no arquivo, precisam de revisao na planilha):`);
  avisos.forEach((a) => console.log(' - ' + a));
}
