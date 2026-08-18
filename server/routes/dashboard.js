const express = require('express');
const { db } = require('../db');

const router = express.Router();

// Expressao SQL do resultado financeiro de cada pedido (mesma formula validada contra a
// planilha original: reembolso ML - custo - comissao - frete envio - frete devolucao).
const RESULTADO_SQL = `
  (COALESCE(reembolso_ml,0) - COALESCE(custo_produto,0) - COALESCE(comissao_ml,0)
   - COALESCE(frete_envio,0) - COALESCE(frete_devolucao,0))
`;

router.get('/', async (req, res) => {
  const operacionalR = await db.execute(
    `SELECT
      COUNT(*) AS total_reclamacoes,
      SUM(CASE WHEN status_geral != 'Encerrado' OR status_geral IS NULL THEN 1 ELSE 0 END) AS em_andamento,
      SUM(CASE WHEN status_geral = 'Encerrado' THEN 1 ELSE 0 END) AS encerrados,
      SUM(CASE WHEN produto_recebido = 'Sim' THEN 1 ELSE 0 END) AS devolucoes_recebidas
    FROM pedidos`
  );

  const financeiroR = await db.execute(
    `SELECT
      ROUND(SUM(COALESCE(reembolso_ml,0)), 2) AS total_reembolso_recebido,
      ROUND(SUM(COALESCE(custo_produto,0) + COALESCE(comissao_ml,0) + COALESCE(frete_envio,0) + COALESCE(frete_devolucao,0)), 2) AS total_custos,
      ROUND(SUM(CASE WHEN ${RESULTADO_SQL} > 0 THEN ${RESULTADO_SQL} ELSE 0 END), 2) AS resultado_positivo,
      ROUND(SUM(CASE WHEN ${RESULTADO_SQL} < 0 THEN ${RESULTADO_SQL} ELSE 0 END), 2) AS resultado_negativo,
      ROUND(SUM(${RESULTADO_SQL}), 2) AS saldo_liquido_total
    FROM pedidos`
  );

  const porDestinacaoR = await db.execute(
    `SELECT
      COALESCE(destinacao, '(sem destinacao)') AS destinacao,
      COUNT(*) AS quantidade,
      ROUND(SUM(${RESULTADO_SQL}), 2) AS resultado
    FROM pedidos
    GROUP BY destinacao
    ORDER BY quantidade DESC`
  );

  const orfaosLaudosR = await db.execute(
    `SELECT COUNT(*) c FROM laudos l WHERE NOT EXISTS (SELECT 1 FROM pedidos p WHERE p.numero_pedido = l.numero_pedido)`
  );
  const orfaosRecursosR = await db.execute(
    `SELECT COUNT(*) c FROM recursos r WHERE NOT EXISTS (SELECT 1 FROM pedidos p WHERE p.numero_pedido = r.numero_pedido)`
  );
  const orfaosSaldaoR = await db.execute(
    `SELECT COUNT(*) c FROM saldao s WHERE NOT EXISTS (SELECT 1 FROM pedidos p WHERE p.numero_pedido = s.numero_pedido)`
  );

  res.json({
    operacional: operacionalR.rows[0],
    financeiro: financeiroR.rows[0],
    por_destinacao: porDestinacaoR.rows,
    alertas: {
      laudos_sem_pedido: Number(orfaosLaudosR.rows[0].c),
      recursos_sem_pedido: Number(orfaosRecursosR.rows[0].c),
      saldao_sem_pedido: Number(orfaosSaldaoR.rows[0].c),
    },
  });
});

module.exports = router;
