// Aplica ao banco as diferencas entre o historico ja importado (seed_data.json) e uma
// exportacao mais nova da planilha (seed_data_novo.json, gerado por parse_xlsx.js).
//
// Regra de fusao por linha existente (mesma posicao == mesmo pedido em ambos os arquivos):
// para cada campo, usa o valor novo se ele nao for nulo/vazio; senao mantem o valor antigo.
// Isso aplica atualizacoes reais (status avançou, recurso foi resolvido) sem deixar uma
// celula em branco na planilha apagar um dado financeiro que ja estava correto no sistema.
//
// Linhas alem do tamanho antigo sao inseridas como novas.

const fs = require('fs');
const path = require('path');
const { db, initSchema } = require('../db');

const antigo = JSON.parse(fs.readFileSync(path.join(__dirname, 'seed_data.json'), 'utf8'));
const novo = JSON.parse(fs.readFileSync(path.join(__dirname, 'seed_data_novo.json'), 'utf8'));

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

function mesclaLinha(colunas, antiga, nova) {
  const m = {};
  for (const c of colunas) m[c] = nova[c] !== null && nova[c] !== undefined ? nova[c] : antiga[c] ?? null;
  return m;
}

async function processaTabela(tabela, listaAntiga, listaNova) {
  const colunas = COLUNAS[tabela];
  const min = Math.min(listaAntiga.length, listaNova.length);

  for (let i = 0; i < min; i++) {
    if (listaAntiga[i].numero_pedido !== listaNova[i].numero_pedido) {
      throw new Error(
        `Desalinhamento em ${tabela}, posicao ${i}: antigo=${listaAntiga[i].numero_pedido} novo=${listaNova[i].numero_pedido}. Abortando sem alterar nada.`
      );
    }
  }

  const merged = [];
  const statements = [];
  let atualizados = 0;

  for (let i = 0; i < min; i++) {
    const m = mesclaLinha(colunas, listaAntiga[i], listaNova[i]);
    merged.push(m);
    if (JSON.stringify(m) !== JSON.stringify(listaAntiga[i])) {
      atualizados++;
      const id = i + 1; // tabelas foram populadas na ordem, sem gaps, na importacao original
      statements.push({
        sql: `UPDATE ${tabela} SET ${colunas.map((c) => `${c} = ?`).join(', ')}, updated_at = datetime('now') WHERE id = ?`,
        args: [...colunas.map((c) => m[c]), id],
      });
    }
  }

  const novos = listaNova.slice(min);
  for (const reg of novos) {
    merged.push(reg);
    const placeholders = colunas.map(() => '?').join(', ');
    statements.push({ sql: `INSERT INTO ${tabela} (${colunas.join(', ')}) VALUES (${placeholders})`, args: colunas.map((c) => reg[c] ?? null) });
  }

  if (statements.length) await db.batch(statements, 'write');

  console.log(`${tabela}: ${atualizados} atualizado(s), ${novos.length} novo(s) inserido(s).`);
  return merged;
}

async function run() {
  await initSchema();

  const responsaveisNovos = [...new Set(novo.pedidos.map((p) => p.responsavel).filter(Boolean))];
  if (responsaveisNovos.length) {
    await db.batch(
      responsaveisNovos.map((nome) => ({ sql: 'INSERT OR IGNORE INTO responsaveis (nome) VALUES (?)', args: [nome] })),
      'write'
    );
  }

  const mergedPedidos = await processaTabela('pedidos', antigo.pedidos, novo.pedidos);
  const mergedLaudos = await processaTabela('laudos', antigo.laudos, novo.laudos);
  const mergedRecursos = await processaTabela('recursos', antigo.recursos, novo.recursos);
  const mergedSaldao = await processaTabela('saldao', antigo.saldao, novo.saldao);

  // seed_data.json passa a refletir o novo estado (baseline para a proxima sincronizacao)
  const novoBaseline = { pedidos: mergedPedidos, laudos: mergedLaudos, recursos: mergedRecursos, saldao: mergedSaldao };
  fs.writeFileSync(path.join(__dirname, 'seed_data.json'), JSON.stringify(novoBaseline, null, 2), 'utf8');
  console.log('\nseed_data.json atualizado como novo baseline.');
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('ERRO:', err.message);
    process.exit(1);
  });
