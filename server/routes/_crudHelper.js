const express = require('express');
const { db } = require('../db');

// Router CRUD generico para tabelas filhas (laudos, recursos, saldao) que sempre
// tem numero_pedido + um conjunto de campos proprios. Marca cada linha com
// "orfao: true" quando o numero_pedido nao existe no Registro Central.
function createCrudRouter(tabela, campos) {
  const router = express.Router();
  const colunas = ['numero_pedido', ...campos];

  async function comOrfao(row) {
    if (!row) return row;
    const r = await db.execute({ sql: 'SELECT 1 FROM pedidos WHERE numero_pedido = ? LIMIT 1', args: [row.numero_pedido] });
    return { ...row, orfao: r.rows.length === 0 };
  }

  router.get('/', async (req, res) => {
    const { numero_pedido } = req.query;
    let sql = `SELECT * FROM ${tabela} WHERE 1=1`;
    const args = [];
    if (numero_pedido) {
      sql += ' AND numero_pedido = ?';
      args.push(numero_pedido);
    }
    sql += ' ORDER BY id DESC';
    const r = await db.execute({ sql, args });
    res.json(await Promise.all(r.rows.map(comOrfao)));
  });

  router.get('/:id', async (req, res) => {
    const r = await db.execute({ sql: `SELECT * FROM ${tabela} WHERE id = ?`, args: [req.params.id] });
    if (r.rows.length === 0) return res.status(404).json({ erro: 'Registro nao encontrado' });
    res.json(await comOrfao(r.rows[0]));
  });

  router.post('/', async (req, res) => {
    if (!req.body.numero_pedido) return res.status(400).json({ erro: 'numero_pedido e obrigatorio' });
    const valores = colunas.map((c) => req.body[c] ?? null);
    const r = await db.execute({
      sql: `INSERT INTO ${tabela} (${colunas.join(', ')}, updated_at) VALUES (${colunas.map(() => '?').join(', ')}, datetime('now'))`,
      args: valores,
    });
    const novo = await db.execute({ sql: `SELECT * FROM ${tabela} WHERE id = ?`, args: [r.lastInsertRowid] });
    res.status(201).json(await comOrfao(novo.rows[0]));
  });

  router.put('/:id', async (req, res) => {
    const existenteR = await db.execute({ sql: `SELECT * FROM ${tabela} WHERE id = ?`, args: [req.params.id] });
    if (existenteR.rows.length === 0) return res.status(404).json({ erro: 'Registro nao encontrado' });
    const existente = existenteR.rows[0];
    const valores = colunas.map((c) => req.body[c] ?? existente[c]);
    await db.execute({
      sql: `UPDATE ${tabela} SET ${colunas.map((c) => `${c} = ?`).join(', ')}, updated_at = datetime('now') WHERE id = ?`,
      args: [...valores, req.params.id],
    });
    const atualizado = await db.execute({ sql: `SELECT * FROM ${tabela} WHERE id = ?`, args: [req.params.id] });
    res.json(await comOrfao(atualizado.rows[0]));
  });

  router.delete('/:id', async (req, res) => {
    const r = await db.execute({ sql: `DELETE FROM ${tabela} WHERE id = ?`, args: [req.params.id] });
    if (Number(r.rowsAffected) === 0) return res.status(404).json({ erro: 'Registro nao encontrado' });
    res.status(204).end();
  });

  return router;
}

module.exports = createCrudRouter;
