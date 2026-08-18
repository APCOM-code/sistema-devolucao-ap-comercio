const express = require('express');
const { db } = require('../db');

const router = express.Router();

const CAMPOS = [
  'numero_pedido', 'data', 'plataforma', 'tipo_envio', 'produto_sku', 'motivo',
  'contestacao', 'resultado_contestacao', 'produto_recebido', 'status_geral',
  'destinacao', 'valor_venda', 'reembolso_ml', 'custo_produto', 'comissao_ml',
  'frete_envio', 'frete_devolucao', 'responsavel', 'obs',
];

function calcResultado(p) {
  const n = (v) => (v === null || v === undefined ? 0 : v);
  return (
    Math.round(
      (n(p.reembolso_ml) - n(p.custo_produto) - n(p.comissao_ml) - n(p.frete_envio) - n(p.frete_devolucao)) * 100
    ) / 100
  );
}

function withResultado(p) {
  return { ...p, resultado_financeiro: calcResultado(p) };
}

router.get('/', async (req, res) => {
  const { status_geral, destinacao, responsavel, data_inicio, data_fim, q } = req.query;
  let sql = 'SELECT * FROM pedidos WHERE 1=1';
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
  if (data_inicio) {
    sql += ' AND data >= ?';
    args.push(data_inicio);
  }
  if (data_fim) {
    sql += ' AND data <= ?';
    args.push(data_fim);
  }
  if (q) {
    sql += ' AND (numero_pedido LIKE ? OR produto_sku LIKE ? OR obs LIKE ?)';
    args.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  sql += ' ORDER BY data DESC, id DESC';
  const r = await db.execute({ sql, args });
  res.json(r.rows.map(withResultado));
});

// Lookup por numero de pedido (usado pelo autopreenchimento nas outras abas).
// Retorna lista pois um mesmo numero pode ter mais de um registro (caso raro, ja visto no historico).
router.get('/lookup/:numero_pedido', async (req, res) => {
  const r = await db.execute({
    sql: 'SELECT * FROM pedidos WHERE numero_pedido = ? ORDER BY id DESC',
    args: [req.params.numero_pedido],
  });
  res.json(r.rows.map(withResultado));
});

router.get('/:id', async (req, res) => {
  const r = await db.execute({ sql: 'SELECT * FROM pedidos WHERE id = ?', args: [req.params.id] });
  if (r.rows.length === 0) return res.status(404).json({ erro: 'Pedido nao encontrado' });
  res.json(withResultado(r.rows[0]));
});

router.post('/', async (req, res) => {
  if (!req.body.numero_pedido) return res.status(400).json({ erro: 'numero_pedido e obrigatorio' });
  const valores = CAMPOS.map((c) => req.body[c] ?? null);
  const r = await db.execute({
    sql: `INSERT INTO pedidos (${CAMPOS.join(', ')}, updated_at) VALUES (${CAMPOS.map(() => '?').join(', ')}, datetime('now'))`,
    args: valores,
  });
  const novo = await db.execute({ sql: 'SELECT * FROM pedidos WHERE id = ?', args: [r.lastInsertRowid] });
  res.status(201).json(withResultado(novo.rows[0]));
});

router.put('/:id', async (req, res) => {
  const existenteR = await db.execute({ sql: 'SELECT * FROM pedidos WHERE id = ?', args: [req.params.id] });
  if (existenteR.rows.length === 0) return res.status(404).json({ erro: 'Pedido nao encontrado' });
  const existente = existenteR.rows[0];
  const valores = CAMPOS.map((c) => req.body[c] ?? existente[c]);
  await db.execute({
    sql: `UPDATE pedidos SET ${CAMPOS.map((c) => `${c} = ?`).join(', ')}, updated_at = datetime('now') WHERE id = ?`,
    args: [...valores, req.params.id],
  });
  const atualizado = await db.execute({ sql: 'SELECT * FROM pedidos WHERE id = ?', args: [req.params.id] });
  res.json(withResultado(atualizado.rows[0]));
});

router.delete('/:id', async (req, res) => {
  const r = await db.execute({ sql: 'DELETE FROM pedidos WHERE id = ?', args: [req.params.id] });
  if (Number(r.rowsAffected) === 0) return res.status(404).json({ erro: 'Pedido nao encontrado' });
  res.status(204).end();
});

module.exports = router;
