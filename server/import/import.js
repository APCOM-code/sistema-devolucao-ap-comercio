// Importa o historico (seed_data.json, gerado por parse_source.js) para o banco (local ou Turso).
// So insere se as tabelas estiverem vazias, para nao duplicar em execucoes futuras.

const fs = require('fs');
const path = require('path');
const { db, initSchema } = require('../db');

const seedPath = path.join(__dirname, 'seed_data.json');

const COLUNAS = {
  pedidos: [
    'numero_pedido', 'data', 'plataforma', 'tipo_envio', 'produto_sku', 'motivo',
    'contestacao', 'resultado_contestacao', 'produto_recebido', 'status_geral', 'destinacao',
    'valor_venda', 'reembolso_ml', 'custo_produto', 'comissao_ml', 'frete_envio',
    'frete_devolucao', 'responsavel', 'obs',
  ],
  laudos: [
    'numero_pedido', 'fotos_tiradas', 'embalagem_intacta', 'produto_funciona', 'dano_fisico',
    'acessorios_completos', 'serial_conferido', 'condicao_geral', 'nf_emitida_erp', 'obs',
  ],
  recursos: [
    'numero_pedido', 'data_abertura', 'evidencias_anexadas', 'status_recurso', 'data_resposta',
    'resultado_final', 'valor_reembolso', 'obs',
  ],
  saldao: [
    'numero_pedido', 'data_envio', 'lote_envio', 'condicao_produto', 'nf_emitida_parceiro',
    'numero_nf_parceiro', 'valor_saldao', 'obs',
  ],
};

function statementsPara(tabela, registros) {
  const colunas = COLUNAS[tabela];
  const placeholders = colunas.map(() => '?').join(', ');
  const sql = `INSERT INTO ${tabela} (${colunas.join(', ')}) VALUES (${placeholders})`;
  return registros.map((reg) => ({ sql, args: colunas.map((c) => reg[c] ?? null) }));
}

async function run() {
  await initSchema();

  const countR = await db.execute('SELECT COUNT(*) c FROM pedidos');
  const countPedidos = Number(countR.rows[0].c);
  if (countPedidos > 0) {
    console.log(`Banco ja tem ${countPedidos} pedidos. Importacao pulada (evita duplicar).`);
    console.log('Para reimportar do zero, apague/recrie o banco e rode novamente.');
    return;
  }

  if (!fs.existsSync(seedPath)) {
    console.error('seed_data.json nao encontrado. Rode antes: node server/import/parse_source.js');
    process.exit(1);
  }

  const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

  const responsaveisSeed = [...new Set(seed.pedidos.map((p) => p.responsavel).filter(Boolean))];

  const statements = [
    ...responsaveisSeed.map((nome) => ({ sql: 'INSERT OR IGNORE INTO responsaveis (nome) VALUES (?)', args: [nome] })),
    ...statementsPara('pedidos', seed.pedidos),
    ...statementsPara('laudos', seed.laudos),
    ...statementsPara('recursos', seed.recursos),
    ...statementsPara('saldao', seed.saldao),
  ];

  await db.batch(statements, 'write');

  const numerosPedidos = new Set(seed.pedidos.map((p) => p.numero_pedido));
  const orfaosLaudo = seed.laudos.filter((l) => !numerosPedidos.has(l.numero_pedido)).length;
  const orfaosRecurso = seed.recursos.filter((r) => !numerosPedidos.has(r.numero_pedido)).length;
  const orfaosSaldao = seed.saldao.filter((s) => !numerosPedidos.has(s.numero_pedido)).length;

  console.log('Importacao concluida:');
  console.log(`  Pedidos:  ${seed.pedidos.length}`);
  console.log(`  Laudos:   ${seed.laudos.length} (${orfaosLaudo} sem pedido correspondente no Registro Central)`);
  console.log(`  Recursos: ${seed.recursos.length} (${orfaosRecurso} sem pedido correspondente no Registro Central)`);
  console.log(`  Saldao:   ${seed.saldao.length} (${orfaosSaldao} sem pedido correspondente no Registro Central)`);
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
