// Le o arquivo bruto exportado da planilha Google Sheets (formato tabela markdown)
// e converte as 4 abas de dados em server/import/seed_data.json.
// Fonte: server/import/raw_planilha.txt (extraido via Google Drive em 06/08/2026).

const fs = require('fs');
const path = require('path');

const RAW_PATH = path.join(__dirname, 'raw_planilha.txt');
const OUT_PATH = path.join(__dirname, 'seed_data.json');

function splitRow(line) {
  // remove markdown escapes tipo \- \# e separa por |
  let cells = line.split('|').slice(1, -1).map((c) => c.trim());
  return cells.map((c) =>
    c
      .replace(/\\-/g, '-')
      .replace(/\\#/g, '#')
      .replace(/\\\./g, '.')
      .trim()
  );
}

function parseMoney(v) {
  if (!v) return null;
  const cleaned = v.replace(/^R\$\s?/, '').replace(/\./g, '').replace(',', '.').trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : Math.round(n * 100) / 100;
}

function parseDate(v) {
  if (!v) return null;
  const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function emptyToNull(v) {
  return v === '' || v === undefined ? null : v;
}

const lines = fs.readFileSync(RAW_PATH, 'utf8').split(/\r?\n/);

// Encontra os indices de inicio de cada secao pelo titulo em negrito/merged
function findSectionStart(marker, fromIndex = 0) {
  for (let i = fromIndex; i < lines.length; i++) {
    if (lines[i].includes(marker)) return i;
  }
  return -1;
}

const idxRegistro = findSectionStart('REGISTRO CENTRAL DE DEVOLU');
const idxLaudo = findSectionStart('LAUDO DE CONFER');
const idxRecurso = findSectionStart('RECURSO E REEMBOLSO');
const idxSaldao = findSectionStart('PRODUTOS ENVIADOS AO SALD');
const idxDashboard = findSectionStart('Dashboard de Devolucoes');

function extractTable(startIdx, endIdx, expectedCols) {
  // acha a linha de cabecalho (comeca com "| # |") dentro do intervalo
  let headerIdx = -1;
  for (let i = startIdx; i < endIdx; i++) {
    if (/^\|\s*\\?#\s*\|/.test(lines[i])) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) return [];
  const rows = [];
  for (let i = headerIdx + 1; i < endIdx; i++) {
    const line = lines[i];
    if (!line.startsWith('|')) continue;
    const cells = splitRow(line);
    if (cells.length < 2) continue;
    const numRow = cells[0];
    if (!/^\d+$/.test(numRow)) continue; // ignora linhas vazias/template sem numero
    rows.push(cells);
  }
  return rows;
}

// ---- Registro Central ----
const registroRows = extractTable(idxRegistro, idxLaudo, 21);
const pedidos = registroRows
  .filter((c) => c[1]) // precisa ter numero de pedido
  .map((c) => ({
    numero_pedido: c[1],
    data: parseDate(c[2]),
    plataforma: emptyToNull(c[3]),
    tipo_envio: emptyToNull(c[4]),
    produto_sku: emptyToNull(c[5]),
    motivo: emptyToNull(c[6]),
    contestacao: emptyToNull(c[7]),
    resultado_contestacao: emptyToNull(c[8]),
    produto_recebido: emptyToNull(c[9]),
    status_geral: emptyToNull(c[10]),
    destinacao: emptyToNull(c[11]),
    valor_venda: parseMoney(c[12]),
    reembolso_ml: parseMoney(c[13]),
    custo_produto: parseMoney(c[14]),
    comissao_ml: parseMoney(c[15]),
    frete_envio: parseMoney(c[16]),
    frete_devolucao: parseMoney(c[17]),
    responsavel: emptyToNull(c[19]),
    obs: emptyToNull(c[20]),
  }));

// ---- Laudo ----
const laudoRows = extractTable(idxLaudo, idxRecurso, 14);
const laudos = laudoRows
  .filter((c) => c[1])
  .map((c) => ({
    numero_pedido: c[1],
    fotos_tiradas: emptyToNull(c[5]),
    embalagem_intacta: emptyToNull(c[6]),
    produto_funciona: emptyToNull(c[7]),
    dano_fisico: emptyToNull(c[8]),
    acessorios_completos: emptyToNull(c[9]),
    serial_conferido: emptyToNull(c[10]),
    condicao_geral: emptyToNull(c[11]),
    nf_emitida_erp: emptyToNull(c[12]),
    obs: emptyToNull(c[13]),
  }));

// ---- Recurso ----
const recursoRows = extractTable(idxRecurso, idxSaldao, 13);
const recursos = recursoRows
  .filter((c) => c[1])
  .map((c) => ({
    numero_pedido: c[1],
    data_abertura: parseDate(c[5]),
    evidencias_anexadas: emptyToNull(c[6]),
    status_recurso: emptyToNull(c[7]),
    data_resposta: parseDate(c[8]),
    resultado_final: emptyToNull(c[9]),
    valor_reembolso: parseMoney(c[10]),
    obs: emptyToNull(c[12]),
  }));

// ---- Saldao ----
const saldaoRows = extractTable(idxSaldao, idxDashboard, 12);
const saldao = saldaoRows
  .filter((c) => c[1])
  .map((c) => ({
    numero_pedido: c[1],
    data_envio: parseDate(c[5]),
    lote_envio: emptyToNull(c[6]),
    condicao_produto: emptyToNull(c[7]),
    nf_emitida_parceiro: emptyToNull(c[8]),
    numero_nf_parceiro: emptyToNull(c[9]),
    valor_saldao: parseMoney(c[10]),
    obs: emptyToNull(c[12]),
  }));

const seed = { pedidos, laudos, recursos, saldao };
fs.writeFileSync(OUT_PATH, JSON.stringify(seed, null, 2), 'utf8');

console.log('Pedidos:', pedidos.length);
console.log('Laudos:', laudos.length);
console.log('Recursos:', recursos.length);
console.log('Saldao:', saldao.length);
console.log('Escrito em', OUT_PATH);
