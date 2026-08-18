const express = require('express');
const { db } = require('../db');

const router = express.Router();

// "Precisa de acao" e sempre calculado ao vivo (nada fica salvo/cacheado): recursos ainda
// nao encerrados contados pelos dias desde a abertura, e pedidos ainda nao encerrados
// contados pelos dias desde a ultima atualizacao.
router.get('/', async (req, res) => {
  const recursosR = await db.execute(
    `SELECT numero_pedido, status_recurso, resultado_final, data_abertura,
      CAST(julianday('now') - julianday(data_abertura) AS INTEGER) AS dias
     FROM recursos
     WHERE status_recurso IS NOT NULL AND status_recurso != 'Encerrado' AND data_abertura IS NOT NULL
     ORDER BY dias DESC
     LIMIT 20`
  );

  const pedidosR = await db.execute(
    `SELECT numero_pedido, status_geral, destinacao, updated_at,
      CAST(julianday('now') - julianday(updated_at) AS INTEGER) AS dias
     FROM pedidos
     WHERE status_geral IS NOT NULL AND status_geral != 'Encerrado'
     ORDER BY dias DESC
     LIMIT 20`
  );

  const recursos_pendentes = recursosR.rows.map((r) => ({
    numero_pedido: r.numero_pedido,
    status_recurso: r.status_recurso,
    resultado_final: r.resultado_final,
    data_abertura: r.data_abertura,
    dias: Number(r.dias),
    urgencia: Number(r.dias) >= 15 ? 'critica' : Number(r.dias) >= 7 ? 'atencao' : 'ok',
  }));

  const pedidos_parados = pedidosR.rows.map((r) => ({
    numero_pedido: r.numero_pedido,
    status_geral: r.status_geral,
    destinacao: r.destinacao,
    dias: Number(r.dias),
    urgencia: Number(r.dias) >= 15 ? 'critica' : Number(r.dias) >= 7 ? 'atencao' : 'ok',
  }));

  res.json({
    recursos_pendentes: recursos_pendentes.filter((r) => r.urgencia !== 'ok'),
    pedidos_parados: pedidos_parados.filter((p) => p.urgencia !== 'ok'),
  });
});

module.exports = router;
