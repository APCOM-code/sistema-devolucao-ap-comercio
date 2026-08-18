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
          const pct = (Math.abs(l.resultado) / max) * 50;
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

  const COR_CENARIO = {
    'danificado|false': 'var(--critical)',
    'danificado|true': 'var(--series-3)',
    'bom|true': 'var(--good)',
    'bom|false': 'var(--series-1)',
    'desconhecido|false': 'var(--text-muted)',
    'desconhecido|true': 'var(--text-muted)',
  };

  function painelCenarios(linhas) {
    const max = Math.max(1, ...linhas.map((l) => l.quantidade));
    return linhas
      .map((l) => {
        const cor = COR_CENARIO[`${l.categoria_condicao}|${l.reembolsado}`] || 'var(--text-muted)';
        return `
      <div class="bar-row">
        <div class="rotulo" style="width:260px;">${l.cenario}</div>
        <div class="trilho">
          <svg width="100%" height="24" preserveAspectRatio="none" style="overflow:visible">
            <rect x="0" y="0" width="${(l.quantidade / max) * 100}%" height="24" rx="4" fill="${cor}"></rect>
          </svg>
        </div>
        <div class="valor">${l.quantidade}× · <span style="color:${l.resultado >= 0 ? 'var(--good-text)' : 'var(--critical)'}">${Util.moeda(l.resultado)}</span></div>
      </div>`;
      })
      .join('');
  }

  async function render(container) {
    const d = await Api.dashboard();
    const op = d.operacional;
    const fin = d.financeiro;
    const totalOrfaos = d.alertas.laudos_sem_pedido + d.alertas.recursos_sem_pedido + d.alertas.saldao_sem_pedido;

    const prejuizoAbs = Math.abs(fin.prejuizo_real);
    const cobertura = fin.cobertura_percentual;
    const maxBarra = Math.max(prejuizoAbs, fin.ganho_compensatorio, 1);

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

      <div class="painel" style="border-color:var(--critical);">
        <h2>Prejuízo real × Ganho compensatório</h2>
        <p class="subtitulo" style="margin-top:-6px;">
          Prejuízo real = produtos danificados que o Mercado Livre não reembolsou (perda total do custo).
          Ganho compensatório = produtos que voltaram bons e ainda geraram reembolso (ganho duplo).
        </p>
        <div class="grid-tiles" style="margin-bottom:16px;">
          ${tile('Prejuízo Real', Util.moeda(fin.prejuizo_real), 'critical')}
          ${tile('Ganho Compensatório', Util.moeda(fin.ganho_compensatorio), 'good')}
          ${tile('Cobertura', cobertura === null ? '—' : `${cobertura}%`, cobertura >= 100 ? 'good' : 'critical')}
        </div>
        <div class="bar-row">
          <div class="rotulo">Prejuízo real</div>
          <div class="trilho"><svg width="100%" height="24" style="overflow:visible"><rect width="${(prejuizoAbs / maxBarra) * 100}%" height="24" rx="4" fill="var(--critical)"></rect></svg></div>
          <div class="valor">${Util.moeda(-prejuizoAbs)}</div>
        </div>
        <div class="bar-row">
          <div class="rotulo">Ganho compensatório</div>
          <div class="trilho"><svg width="100%" height="24" style="overflow:visible"><rect width="${(fin.ganho_compensatorio / maxBarra) * 100}%" height="24" rx="4" fill="var(--good)"></rect></svg></div>
          <div class="valor">${Util.moeda(fin.ganho_compensatorio)}</div>
        </div>
        <p class="tag-line" style="margin-top:12px;font-size:13px;">
          ${
            cobertura === null
              ? 'Sem prejuízo real registrado no momento.'
              : cobertura >= 100
              ? `O ganho compensatório <b>cobre todo o prejuízo real</b> (${cobertura}%).`
              : `O ganho compensatório cobre <b>${cobertura}%</b> do prejuízo real — ainda falta ${Util.moeda(prejuizoAbs - fin.ganho_compensatorio)} pra empatar.`
          }
        </p>
      </div>

      <h2>Operacional</h2>
      <div class="grid-tiles">
        ${tile('Total de Reclamações', op.total_reclamacoes)}
        ${tile('Em Andamento', op.em_andamento)}
        ${tile('Encerrados', op.encerrados)}
        ${tile('Devoluções Recebidas', op.devolucoes_recebidas)}
      </div>

      <h2>Financeiro geral</h2>
      <div class="grid-tiles">
        ${tile('Total Reembolso Recebido', Util.moeda(fin.total_reembolso_recebido))}
        ${tile('Total de Custos', Util.moeda(fin.total_custos))}
        ${tile('Saldo Líquido Total', Util.moeda(fin.saldo_liquido_total), fin.saldo_liquido_total >= 0 ? 'good' : 'critical')}
      </div>

      <div class="painel">
        <h2>Resultado por Cenário</h2>
        <p class="subtitulo" style="margin-top:-6px;">Como cada pedido foi resolvido, e o que isso rendeu de verdade.</p>
        ${painelCenarios(d.por_cenario)}
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
