const express = require('express');
const XLSX = require('xlsx');
const { db } = require('../db');

const router = express.Router();

// "data" (data da devolucao) nao faz mais parte do formulario -- o campo de data usado em
// toda a interface agora e data_abertura_recurso (calculado na view, a partir do Recurso).
// A coluna "data" continua existindo no banco por historico, so nao e mais editavel aqui.
const CAMPOS = [
  'numero_pedido', 'plataforma', 'tipo_envio', 'produto_sku', 'motivo',
  'contestacao', 'resultado_contestacao', 'produto_recebido', 'status_geral',
  'destinacao', 'valor_venda', 'reembolso_ml', 'custo_produto', 'comissao_ml',
  'frete_envio', 'frete_devolucao', 'custo_componentes', 'responsavel', 'obs',
];

function montaFiltro(query) {
  const { status_geral, destinacao, responsavel, data_inicio, data_fim, q, categoria_condicao, reembolsado, produto_recebido } = query;
  let sql = 'SELECT * FROM pedidos_calc WHERE 1=1';
  const args = [];
  if (status_geral) {
    sql += ' AND status_geral = ?';
    args.push(status_geral);
  }
  if (destinacao) {
    sql += ' AND destinacao = ?';
    args.push(destinacao);
  }
  if (responsavel) {
    sql += ' AND responsavel = ?';
    args.push(responsavel);
  }
  if (categoria_condicao) {
    sql += ' AND categoria_condicao = ?';
    args.push(categoria_condicao);
  }
  if (reembolsado === '0' || reembolsado === '1') {
    sql += ' AND reembolsado = ?';
    args.push(Number(reembolsado));
  }
  if (produto_recebido) {
    sql += ' AND produto_recebido = ?';
    args.push(produto_recebido);
  }
  if (data_inicio) {
    sql += ' AND data_abertura_recurso >= ?';
    args.push(data_inicio);
  }
  if (data_fim) {
    sql += ' AND data_abertura_recurso <= ?';
    args.push(data_fim);
  }
  if (q) {
    sql += ' AND (numero_pedido LIKE ? OR produto_sku LIKE ? OR obs LIKE ?)';
    args.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  sql += ' ORDER BY data_abertura_recurso DESC, id DESC';
  return { sql, args };
}

router.get('/', async (req, res) => {
  const { sql, args } = montaFiltro(req.query);
  const r = await db.execute({ sql, args });
  res.json(r.rows);
});

const COLUNAS_EXPORT = [
  ['numero_pedido', 'Nº Pedido'], ['data_abertura_recurso', 'Abertura Recurso'], ['plataforma', 'Plataforma'],
  ['tipo_envio', 'Tipo Envio'], ['produto_sku', 'Produto/SKU'], ['motivo', 'Motivo'],
  ['status_geral', 'Status'], ['destinacao', 'Destinação'], ['categoria_condicao', 'Cenário'],
  ['valor_venda', 'Valor Venda'], ['reembolso_ml', 'Reembolso ML'], ['custo_produto', 'Custo Produto'],
  ['frete_devolucao', 'Frete Devolução'], ['custo_componentes', 'Custo Componentes'],
  ['resultado_financeiro', 'Resultado Financeiro'], ['responsavel', 'Responsável'], ['obs', 'Obs.'],
];

router.get('/exportar', async (req, res) => {
  const { sql, args } = montaFiltro(req.query);
  const r = await db.execute({ sql, args });

  const linhas = r.rows.map((row) => {
    const obj = {};
    for (const [campo, titulo] of COLUNAS_EXPORT) obj[titulo] = row[campo] ?? '';
    return obj;
  });
  const planilha = XLSX.utils.json_to_sheet(linhas);
  const livro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(livro, planilha, 'Registro Central');
  const buffer = XLSX.write(livro, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="registro_central_${Date.now()}.xlsx"`);
  res.send(buffer);
});

// Lookup por numero de pedido (usado pelo autopreenchimento nas outras abas).
// Retorna lista pois um mesmo numero pode ter mais de um registro (caso raro, ja visto no historico).
router.get('/lookup/:numero_pedido', async (req, res) => {
  const r = await db.execute({
    sql: 'SELECT * FROM pedidos_calc WHERE numero_pedido = ? ORDER BY id DESC',
    args: [req.params.numero_pedido],
  });
  res.json(r.rows);
});

router.get('/:id', async (req, res) => {
  const r = await db.execute({ sql: 'SELECT * FROM pedidos_calc WHERE id = ?', args: [req.params.id] });
  if (r.rows.length === 0) return res.status(404).json({ erro: 'Pedido nao encontrado' });
  res.json(r.rows[0]);
});

router.post('/', async (req, res) => {
  if (!req.body.numero_pedido) return res.status(400).json({ erro: 'numero_pedido e obrigatorio' });
  const valores = CAMPOS.map((c) => req.body[c] ?? null);
  const r = await db.execute({
    sql: `INSERT INTO pedidos (${CAMPOS.join(', ')}, updated_at) VALUES (${CAMPOS.map(() => '?').join(', ')}, datetime('now'))`,
    args: valores,
  });
  const novo = await db.execute({ sql: 'SELECT * FROM pedidos_calc WHERE id = ?', args: [r.lastInsertRowid] });
  res.status(201).json(novo.rows[0]);
});

router.put('/:id', async (req, res) => {
  const existenteR = await db.execute({ sql: 'SELECT * FROM pedidos WHERE id = ?', args: [req.params.id] });
  if (existenteR.rows.length === 0) return res.status(404).json({ erro: 'Pedido nao encontrado' });
  const existente = existenteR.rows[0];
  const valores = CAMPOS.map((c) => (c in req.body ? req.body[c] : existente[c]));
  await db.execute({
    sql: `UPDATE pedidos SET ${CAMPOS.map((c) => `${c} = ?`).join(', ')}, updated_at = datetime('now') WHERE id = ?`,
    args: [...valores, req.params.id],
  });
  const atualizado = await db.execute({ sql: 'SELECT * FROM pedidos_calc WHERE id = ?', args: [req.params.id] });
  res.json(atualizado.rows[0]);
});

router.delete('/:id', async (req, res) => {
  const r = await db.execute({ sql: 'DELETE FROM pedidos WHERE id = ?', args: [req.params.id] });
  if (Number(r.rowsAffected) === 0) return res.status(404).json({ erro: 'Pedido nao encontrado' });
  res.status(204).end();
});

module.exports = router;
