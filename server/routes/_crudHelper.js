const express = require('express');
const XLSX = require('xlsx');
const { db } = require('../db');

// Router CRUD generico para tabelas filhas (laudos, recursos, saldao) que sempre
// tem numero_pedido + um conjunto de campos proprios. Marca cada linha com
// "orfao: true" quando o numero_pedido nao existe no Registro Central.
// "Periodo" filtra pela data do Registro Central (pedidos.data) do pedido vinculado,
// nao por uma data propria da tabela filha -- e a data em que a devolucao foi feita.
function createCrudRouter(tabela, campos, opcoes = {}) {
  const router = express.Router();
  const colunas = ['numero_pedido', ...campos];
  const colunasExport = opcoes.colunasExport || colunas.map((c) => [c, c]);
  const nomeExport = opcoes.nomeExport || tabela;

  async function comOrfao(row) {
    if (!row) return row;
    const r = await db.execute({ sql: 'SELECT 1 FROM pedidos WHERE numero_pedido = ? LIMIT 1', args: [row.numero_pedido] });
    return { ...row, orfao: r.rows.length === 0 };
  }

  function montaFiltro(query) {
    const { numero_pedido, data_inicio, data_fim } = query;
    const precisaJoin = !!(data_inicio || data_fim);
    let sql = precisaJoin
      ? `SELECT t.* FROM ${tabela} t LEFT JOIN pedidos p ON p.numero_pedido = t.numero_pedido WHERE 1=1`
      : `SELECT * FROM ${tabela} WHERE 1=1`;
    const args = [];
    if (numero_pedido) {
      sql += ` AND ${precisaJoin ? 't.' : ''}numero_pedido = ?`;
      args.push(numero_pedido);
    }
    if (data_inicio) {
      sql += ' AND p.data >= ?';
      args.push(data_inicio);
    }
    if (data_fim) {
      sql += ' AND p.data <= ?';
      args.push(data_fim);
    }
    sql += ` ORDER BY ${precisaJoin ? 't.' : ''}id DESC`;
    return { sql, args };
  }

  router.get('/', async (req, res) => {
    const { sql, args } = montaFiltro(req.query);
    const r = await db.execute({ sql, args });
    res.json(await Promise.all(r.rows.map(comOrfao)));
  });

  router.get('/exportar', async (req, res) => {
    const { sql, args } = montaFiltro(req.query);
    const r = await db.execute({ sql, args });
    const linhas = r.rows.map((row) => {
      const obj = {};
      for (const [campo, titulo] of colunasExport) obj[titulo] = row[campo] ?? '';
      return obj;
    });
    const planilha = XLSX.utils.json_to_sheet(linhas);
    const livro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(livro, planilha, nomeExport.slice(0, 31));
    const buffer = XLSX.write(livro, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${tabela}_${Date.now()}.xlsx"`);
    res.send(buffer);
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
    const valores = colunas.map((c) => (c in req.body ? req.body[c] : existente[c]));
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
