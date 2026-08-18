const PaginaDashboard = (() => {
  function tile(label, value, cls = '') {
    return `<div class="tile"><div class="label">${label}</div><div class="value ${cls}">${value}</div></div>`;
  }

  function barraSimples(linhas, corVar) {
    const max = Math.max(1, ...linhas.map((l) => l.quantidade));
    return linhas
      .map(
        (l) => `
      <div class="bar-row">
        <div class="rotulo">${l.destinacao}</div>
        <div class="trilho">
          <svg width="100%" height="24" preserveAspectRatio="none" style="overflow:visible">
            <rect x="0" y="0" width="${(l.quantidade / max) * 100}%" height="24" rx="4" fill="${corVar}"></rect>
          </svg>
        </div>
        <div class="valor">${l.quantidade}</div>
      </div>`
      )
      .join('');
  }

  function barraDivergente(linhas) {
    const max = Math.max(1, ...linhas.map((l) => Math.abs(l.resultado)));
    return `
      <div class="chart-legend">
        <div class="item"><span class="swatch" style="background:var(--series-1)"></span>Resultado positivo</div>
        <div class="item"><span class="swatch" style="background:var(--critical)"></span>Resultado negativo</div>
      </div>
      ${linhas
        .map((l) => {
          const pct = (Math.abs(l.resultado) / max) * 50; // metade da largura = 100% do eixo
          const positivo = l.resultado >= 0;
          return `
        <div class="bar-row">
          <div class="rotulo">${l.destinacao}</div>
          <div class="trilho">
            <svg width="100%" height="24" preserveAspectRatio="none" style="overflow:visible">
              <line x1="50%" y1="0" x2="50%" y2="24" stroke="var(--baseline)" stroke-width="1"></line>
              <rect x="${positivo ? '50%' : `${50 - pct}%`}" y="0" width="${pct}%" height="24" rx="4"
                fill="${positivo ? 'var(--series-1)' : 'var(--critical)'}"></rect>
            </svg>
          </div>
          <div class="valor" style="color:${positivo ? 'var(--good-text)' : 'var(--critical)'}">${Util.moeda(l.resultado)}</div>
        </div>`;
        })
        .join('')}
    `;
  }

  async function render(container) {
    const d = await Api.dashboard();
    const op = d.operacional;
    const fin = d.financeiro;
    const totalOrfaos = d.alertas.laudos_sem_pedido + d.alertas.recursos_sem_pedido + d.alertas.saldao_sem_pedido;

    container.innerHTML = `
      <h1>Dashboard de Devoluções</h1>
      <p class="subtitulo">Pós-vendas e devolução — visão geral de todos os registros.</p>

      ${
        totalOrfaos > 0
          ? `<div class="alerta">⚠ Existem <strong>${totalOrfaos}</strong> registros em Laudo/Recurso/Saldão sem pedido correspondente no Registro Central
             (${d.alertas.laudos_sem_pedido} em Laudo, ${d.alertas.recursos_sem_pedido} em Recurso, ${d.alertas.saldao_sem_pedido} em Saldão).
             Isso vem do histórico importado da planilha — considere completar o Registro Central para esses pedidos.</div>`
          : ''
      }

      <h2>Operacional</h2>
      <div class="grid-tiles">
        ${tile('Total de Reclamações', op.total_reclamacoes)}
        ${tile('Em Andamento', op.em_andamento)}
        ${tile('Encerrados', op.encerrados)}
        ${tile('Devoluções Recebidas', op.devolucoes_recebidas)}
      </div>

      <h2>Financeiro</h2>
      <div class="grid-tiles">
        ${tile('Total Reembolso Recebido', Util.moeda(fin.total_reembolso_recebido))}
        ${tile('Total de Custos', Util.moeda(fin.total_custos))}
        ${tile('Resultado Positivo', Util.moeda(fin.resultado_positivo), 'good')}
        ${tile('Resultado Negativo', Util.moeda(fin.resultado_negativo), 'critical')}
        ${tile('Saldo Líquido Total', Util.moeda(fin.saldo_liquido_total), fin.saldo_liquido_total >= 0 ? 'good' : 'critical')}
      </div>

      <div class="painel">
        <h2>Destinação dos Produtos (quantidade)</h2>
        ${barraSimples(d.por_destinacao, 'var(--series-1)')}
      </div>

      <div class="painel">
        <h2>Resultado Financeiro por Destinação</h2>
        ${barraDivergente(d.por_destinacao)}
      </div>
    `;
  }

  return { render };
})();
