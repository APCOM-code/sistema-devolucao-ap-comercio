const express = require('express');
const { db } = require('../db');
const { parseXlsxBuffer } = require('../import/xlsxParser');
const { calcularPlano, aplicarPlano, resumoPlano } = require('../import/mergeLogic');

const router = express.Router();

function bufferDoBody(req) {
  if (!req.body.conteudo_base64) throw new Error('conteudo_base64 e obrigatorio');
  return Buffer.from(req.body.conteudo_base64, 'base64');
}

router.post('/preview', async (req, res) => {
  try {
    const buffer = bufferDoBody(req);
    const dados = parseXlsxBuffer(buffer);
    const plano = await calcularPlano(db, dados);
    res.json(resumoPlano(plano));
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
});

router.post('/confirmar', async (req, res) => {
  try {
    const buffer = bufferDoBody(req);
    const dados = parseXlsxBuffer(buffer);
    const plano = await calcularPlano(db, dados);
    const aplicado = await aplicarPlano(db, plano);
    res.json({ aplicado, avisos: dados.avisos });
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
});

module.exports = router;
