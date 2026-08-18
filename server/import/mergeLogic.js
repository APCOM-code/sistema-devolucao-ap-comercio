// Calcula e aplica a diferenca entre uma planilha recem-importada e o que ja esta no banco.
// Casamento por numero_pedido (nao por posicao -- funciona mesmo com pedidos criados
// direto pelo sistema, que nao vem de nenhuma planilha).
//
// Regra por campo: o valor novo so substitui o antigo se nao for nulo/vazio -- uma celula
// em branco na planilha nunca apaga um dado que ja existia (mesma protecao do sync antigo).
// Numero de pedido com mais de um registro no banco e tratado como ambiguo e pulado --
// melhor pedir revisao manual do que arriscar atualizar a linha errada.

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

function mesclaCampos(colunas, antiga, nova) {
  const m = {};
  for (const c of colunas) m[c] = nova[c] !== null && nova[c] !== undefined ? nova[c] : (antiga[c] ?? null);
  return m;
}

async function planoParaTabela(db, tabela, linhasNovas) {
  const colunas = COLUNAS[tabela];
  const existentesR = await db.execute(`SELECT * FROM ${tabela}`);
  const porNumero = new Map();
  for (const row of existentesR.rows) {
    const lista = porNumero.get(row.numero_pedido) || [];
    lista.push(row);
    porNumero.set(row.numero_pedido, lista);
  }

  const novos = [];
  const atualizados = [];
  const ambiguos = [];

  for (const linha of linhasNovas) {
    const existentes = porNumero.get(linha.numero_pedido) || [];
    if (existentes.length === 0) {
      novos.push(linha);
    } else if (existentes.length === 1) {
      const existente = existentes[0];
      const mesclado = mesclaCampos(colunas, existente, linha);
      const mudou = colunas.some((c) => (mesclado[c] ?? null) !== (existente[c] ?? null));
      if (mudou) atualizados.push({ id: existente.id, numero_pedido: linha.numero_pedido, dados: mesclado });
    } else {
      ambiguos.push(linha.numero_pedido);
    }
  }

  return { tabela, colunas, novos, atualizados, ambiguos: [...new Set(ambiguos)] };
}

async function calcularPlano(db, dadosNovos) {
  const [pedidos, laudos, recursos, saldao] = await Promise.all([
    planoParaTabela(db, 'pedidos', dadosNovos.pedidos),
    planoParaTabela(db, 'laudos', dadosNovos.laudos),
    planoParaTabela(db, 'recursos', dadosNovos.recursos),
    planoParaTabela(db, 'saldao', dadosNovos.saldao),
  ]);
  return { pedidos, laudos, recursos, saldao, avisos: dadosNovos.avisos };
}

async function aplicarPlano(db, plano) {
  const statements = [];

  const responsaveisNovos = [...new Set(plano.pedidos.novos.map((p) => p.responsavel).filter(Boolean))];
  for (const nome of responsaveisNovos) {
    statements.push({ sql: 'INSERT OR IGNORE INTO responsaveis (nome) VALUES (?)', args: [nome] });
  }

  for (const parte of [plano.pedidos, plano.laudos, plano.recursos, plano.saldao]) {
    const placeholders = parte.colunas.map(() => '?').join(', ');
    for (const novo of parte.novos) {
      statements.push({
        sql: `INSERT INTO ${parte.tabela} (${parte.colunas.join(', ')}) VALUES (${placeholders})`,
        args: parte.colunas.map((c) => novo[c] ?? null),
      });
    }
    for (const upd of parte.atualizados) {
      statements.push({
        sql: `UPDATE ${parte.tabela} SET ${parte.colunas.map((c) => `${c} = ?`).join(', ')}, updated_at = datetime('now') WHERE id = ?`,
        args: [...parte.colunas.map((c) => upd.dados[c] ?? null), upd.id],
      });
    }
  }

  if (statements.length) await db.batch(statements, 'write');

  return {
    pedidos: { novos: plano.pedidos.novos.length, atualizados: plano.pedidos.atualizados.length },
    laudos: { novos: plano.laudos.novos.length, atualizados: plano.laudos.atualizados.length },
    recursos: { novos: plano.recursos.novos.length, atualizados: plano.recursos.atualizados.length },
    saldao: { novos: plano.saldao.novos.length, atualizados: plano.saldao.atualizados.length },
  };
}

function resumoPlano(plano) {
  const resumir = (p) => ({
    novos: p.novos.length,
    atualizados: p.atualizados.length,
    ambiguos: p.ambiguos.length,
  });
  return {
    pedidos: resumir(plano.pedidos),
    laudos: resumir(plano.laudos),
    recursos: resumir(plano.recursos),
    saldao: resumir(plano.saldao),
    avisos: plano.avisos,
    ambiguos_detalhe: {
      pedidos: plano.pedidos.ambiguos,
      laudos: plano.laudos.ambiguos,
      recursos: plano.recursos.ambiguos,
      saldao: plano.saldao.ambiguos,
    },
  };
}

module.exports = { calcularPlano, aplicarPlano, resumoPlano };
