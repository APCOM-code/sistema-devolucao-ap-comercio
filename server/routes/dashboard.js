const express = require('express');
const { db } = require('../db');

const router = express.Router();

router.get('/', async (req, res) => {
  const { data_inicio, data_fim } = req.query;
  let filtroSql = 'WHERE 1=1';
  const filtroArgs = [];
  if (data_inicio) {
    filtroSql += ' AND data >= ?';
    filtroArgs.push(data_inicio);
  }
  if (data_fim) {
    filtroSql += ' AND data <= ?';
    filtroArgs.push(data_fim);
  }

  const operacionalR = await db.execute({
    sql: `SELECT
      COUNT(*) AS total_reclamacoes,
      SUM(CASE WHEN status_geral != 'Encerrado' OR status_geral IS NULL THEN 1 ELSE 0 END) AS em_andamento,
      SUM(CASE WHEN status_geral = 'Encerrado' THEN 1 ELSE 0 END) AS encerrados,
      SUM(CASE WHEN produto_recebido = 'Sim' THEN 1 ELSE 0 END) AS devolucoes_recebidas
    FROM pedidos_calc ${filtroSql}`,
    args: filtroArgs,
  });

  // Total de Custos = so os custos que de fato ficam com a gente (custo do produto quando
  // danificado + frete de devolucao quando cobrado + componentes comprados pra completar o
  // pedido). Comissao ML e Frete Envio ficam de fora porque o Mercado Livre sempre cancela os
  // dois numa devolucao -- ver server/db.js.
  const financeiroR = await db.execute({
    sql: `SELECT
      ROUND(SUM(COALESCE(reembolso_ml,0)), 2) AS total_reembolso_recebido,
      ROUND(SUM(CASE WHEN categoria_condicao = 'bom' THEN 0 ELSE COALESCE(custo_produto,0) END) + SUM(COALESCE(frete_devolucao,0)) + SUM(COALESCE(custo_componentes,0)), 2) AS total_custos,
      ROUND(SUM(resultado_financeiro), 2) AS saldo_liquido_total,
      ROUND(SUM(CASE WHEN categoria_condicao = 'danificado' AND reembolsado = 0 THEN resultado_financeiro ELSE 0 END), 2) AS prejuizo_real,
      ROUND(SUM(CASE WHEN categoria_condicao = 'bom' AND reembolsado = 1 THEN resultado_financeiro ELSE 0 END), 2) AS ganho_compensatorio
    FROM pedidos_calc ${filtroSql}`,
    args: filtroArgs,
  });

  const fin = financeiroR.rows[0];
  const prejuizoReal = Number(fin.prejuizo_real) || 0; // <= 0
  const ganhoComp = Number(fin.ganho_compensatorio) || 0; // >= 0
  const cobertura = prejuizoReal < 0 ? Math.round((ganhoComp / Math.abs(prejuizoReal)) * 1000) / 10 : null;

  const porCenarioR = await db.execute({
    sql: `SELECT
      CASE WHEN categoria_condicao = 'desconhecido' THEN 'desconhecido' ELSE categoria_condicao END AS categoria_condicao,
      CASE WHEN categoria_condicao = 'desconhecido' THEN 0 ELSE reembolsado END AS reembolsado,
      COUNT(*) AS quantidade, ROUND(SUM(resultado_financeiro), 2) AS resultado
     FROM pedidos_calc ${filtroSql}
     GROUP BY categoria_condicao = 'desconhecido', categoria_condicao, CASE WHEN categoria_condicao = 'desconhecido' THEN 0 ELSE reembolsado END
     ORDER BY categoria_condicao, reembolsado`,
    args: filtroArgs,
  });

  const NOMES_CENARIO = {
    'danificado|0': 'Perda total — danificado, sem reembolso',
    'danificado|1': 'Recuperado no descarte — danificado, com reembolso',
    'bom|1': 'Ganho duplo — produto bom, com reembolso',
    'bom|0': 'Neutro — produto bom, custo volta pro estoque',
    'desconhecido|0': 'Condição não avaliada (sem laudo)',
  };
  const porCenario = porCenarioR.rows.map((row) => ({
    cenario: NOMES_CENARIO[`${row.categoria_condicao}|${row.reembolsado}`] || 'Outro',
    categoria_condicao: row.categoria_condicao,
    reembolsado: !!row.reembolsado,
    quantidade: Number(row.quantidade),
    resultado: Number(row.resultado),
  }));

  const porDestinacaoR = await db.execute({
    sql: `SELECT
      COALESCE(destinacao, '(sem destinacao)') AS destinacao,
      COUNT(*) AS quantidade,
      ROUND(SUM(resultado_financeiro), 2) AS resultado
    FROM pedidos_calc ${filtroSql}
    GROUP BY destinacao
    ORDER BY quantidade DESC`,
    args: filtroArgs,
  });

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
    financeiro: {
      total_reembolso_recebido: Number(fin.total_reembolso_recebido),
      total_custos: Number(fin.total_custos),
      saldo_liquido_total: Number(fin.saldo_liquido_total),
      prejuizo_real: prejuizoReal,
      ganho_compensatorio: ganhoComp,
      cobertura_percentual: cobertura,
    },
    por_cenario: porCenario,
    por_destinacao: porDestinacaoR.rows,
    alertas: {
      laudos_sem_pedido: Number(orfaosLaudosR.rows[0].c),
      recursos_sem_pedido: Number(orfaosRecursosR.rows[0].c),
      saldao_sem_pedido: Number(orfaosSaldaoR.rows[0].c),
    },
  });
});

module.exports = router;
