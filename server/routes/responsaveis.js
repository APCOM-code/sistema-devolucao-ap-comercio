const express = require('express');
const { db } = require('../db');

const router = express.Router();

router.get('/', async (req, res) => {
  const r = await db.execute('SELECT * FROM responsaveis ORDER BY nome');
  res.json(r.rows);
});

router.post('/', async (req, res) => {
  const { nome } = req.body;
  if (!nome || !nome.trim()) return res.status(400).json({ erro: 'nome e obrigatorio' });
  await db.execute({ sql: 'INSERT OR IGNORE INTO responsaveis (nome) VALUES (?)', args: [nome.trim()] });
  const r = await db.execute({ sql: 'SELECT * FROM responsaveis WHERE nome = ?', args: [nome.trim()] });
  res.status(201).json(r.rows[0]);
});

module.exports = router;
