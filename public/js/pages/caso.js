// Pagina "Caso": reune Registro Central + Laudo + Recurso + Saldao de um mesmo Nº de
// Pedido numa unica tela, cada bloco salva sozinho (sem recarregar a pagina), e o
// Nº do Pedido so e digitado uma vez, no topo.
const PaginaCaso = (() => {
  function campoHtmlInline(campo, valor) {
    const v = valor === undefined || valor === null ? '' : valor;
    if (campo.tipo === 'select') {
      const opts = campo.opcoes.map((o) => `<option value="${o}" ${o === v ? 'selected' : ''}>${o}</option>`).join('');
      return `<select name="${campo.nome}"><option value="">—</option>${opts}</select>`;
    }
    if (campo.tipo === 'textarea') return `<textarea name="${campo.nome}">${v}</textarea>`;
    if (campo.tipo === 'date') return `<input type="date" name="${campo.nome}" value="${v}" />`;
    if (campo.tipo === 'money') return `<input type="number" step="0.01" name="${campo.nome}" value="${v}" />`;
    return `<input type="text" name="${campo.nome}" value="${v}" />`;
  }

  function formHtml(campos, registro, idAttr) {
    return `
      <form data-id="${idAttr ?? ''}">
        <div class="form-grid">
          ${campos.map((c) => `<div class="campo ${c.full ? 'full' : ''}"><label>${c.label}</label>${campoHtmlInline(c, registro ? registro[c.nome] : null)}</div>`).join('')}
        </div>
        <div class="modal-acoes" style="justify-content:flex-start;">
          <button type="submit">Salvar</button>
          ${registro ? `<span class="tag-line" style="align-self:center;">${registro.orfao ? '<span class="badge orfao">órfão</span>' : ''}</span>` : ''}
        </div>
      </form>`;
  }

  function coletarValores(formEl, campos) {
    const dados = {};
    for (const c of campos) {
      const el = formEl.querySelector(`[name="${c.nome}"]`);
      dados[c.nome] = el.value === '' ? null : c.tipo === 'money' ? Number(el.value) : el.value;
    }
    return dados;
  }

  async function renderSecaoFilha(container, secaoId, cfg, numeroPedido) {
    const el = container.querySelector(`#${secaoId}`);
    const registros = await Api.listar(cfg.recurso, { numero_pedido: numeroPedido });
    el.innerHTML = `
      <h2>${cfg.titulo}</h2>
      <div id="${secaoId}-lista"></div>
      <button type="button" class="secundario" id="${secaoId}-novo" style="margin-top:8px;">+ Adicionar</button>
    `;
    const lista = el.querySelector(`#${secaoId}-lista`);

    function montaBloco(registro) {
      const bloco = Util.el('div', { class: 'agent-card', style: 'margin-bottom:12px;' });
      bloco.innerHTML = formHtml(cfg.campos, registro, registro ? registro.id : '');
      const form = bloco.querySelector('form');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const dados = { numero_pedido: numeroPedido, ...coletarValores(form, cfg.campos) };
        try {
          if (registro) await Api.atualizar(cfg.recurso, registro.id, dados);
          else await Api.criar(cfg.recurso, dados);
          Util.toast('Salvo.');
          await renderSecaoFilha(container, secaoId, cfg, numeroPedido);
        } catch (err) {
          Util.toast('Erro: ' + err.message);
        }
      });
      return bloco;
    }

    if (registros.length === 0) {
      lista.appendChild(montaBloco(null));
      el.querySelector(`#${secaoId}-novo`).style.display = 'none';
    } else {
      registros.forEach((r) => lista.appendChild(montaBloco(r)));
    }
    el.querySelector(`#${secaoId}-novo`).addEventListener('click', () => {
      lista.appendChild(montaBloco(null));
    });
  }

  async function renderSecaoPedido(container, numeroPedido) {
    const el = container.querySelector('#secao-registro');
    const resultados = await Api.lookupPedido(numeroPedido);

    if (resultados.length > 1) {
      el.innerHTML = `
        <h2>Registro Central</h2>
        <div class="alerta">⚠ Este número de pedido tem ${resultados.length} registros no Registro Central. Escolha qual editar:</div>
        <div class="toolbar">
          ${resultados.map((r) => `<button type="button" class="secundario" data-id="${r.id}">Pedido #${r.id} — ${Util.dataBr(r.data)} — ${r.responsavel || 'sem responsável'}</button>`).join('')}
        </div>
      `;
      el.querySelectorAll('button[data-id]').forEach((btn) => {
        btn.addEventListener('click', () => renderFormPedido(el, resultados.find((r) => String(r.id) === btn.dataset.id), numeroPedido, container));
      });
      return;
    }

    el.innerHTML = `<h2>Registro Central</h2><div id="registro-form-area"></div>`;
    renderFormPedido(el, resultados[0] || null, numeroPedido, container);
  }

  const CAMPOS_PEDIDO = [
    { nome: 'data', label: 'Data', tipo: 'date' },
    { nome: 'plataforma', label: 'Plataforma', tipo: 'text' },
    { nome: 'tipo_envio', label: 'Tipo Envio', tipo: 'text' },
    { nome: 'produto_sku', label: 'Produto/SKU', tipo: 'text' },
    { nome: 'motivo', label: 'Motivo', tipo: 'select', opcoes: ['Arrependimento', 'Produto com defeito', 'Danificado pelo comprador', 'Danificado na entrega', 'Defeito de fabricação', 'Outros'] },
    { nome: 'contestacao', label: 'Contestação', tipo: 'text' },
    { nome: 'resultado_contestacao', label: 'Resultado Contestação', tipo: 'text' },
    { nome: 'produto_recebido', label: 'Produto Recebido?', tipo: 'select', opcoes: ['Sim', 'Não'] },
    { nome: 'status_geral', label: 'Status Geral', tipo: 'select', opcoes: ['Em andamento', 'Encerrado'] },
    { nome: 'destinacao', label: 'Destinação', tipo: 'select', opcoes: ['Reembalar', 'Assistência técnica', 'Saldão parceiro', 'Enviado ao fabricante', 'Volta ao estoque', 'Aguardando gestor', 'Descarte'] },
    { nome: 'valor_venda', label: 'Valor Venda (R$)', tipo: 'money' },
    { nome: 'reembolso_ml', label: 'Reembolso ML (R$)', tipo: 'money' },
    { nome: 'custo_produto', label: 'Custo do Produto (R$)', tipo: 'money' },
    { nome: 'comissao_ml', label: 'Comissão ML (R$)', tipo: 'money' },
    { nome: 'frete_envio', label: 'Frete Envio (R$)', tipo: 'money' },
    { nome: 'frete_devolucao', label: 'Frete Devolução (R$)', tipo: 'money' },
    { nome: 'custo_componentes', label: 'Custo Componentes Comprados (R$)', tipo: 'money' },
    { nome: 'responsavel', label: 'Responsável', tipo: 'text' },
    { nome: 'obs', label: 'Obs.', tipo: 'textarea', full: true },
  ];

  function renderFormPedido(secaoEl, registro, numeroPedido, container) {
    const area = secaoEl.querySelector('#registro-form-area') || secaoEl;
    if (!registro) {
      area.innerHTML = `<div class="alerta">⚠ Pedido não encontrado no Registro Central. Preencha abaixo para criar.</div>${formHtml(CAMPOS_PEDIDO, null)}`;
    } else {
      area.innerHTML = `
        <div class="grid-tiles" style="margin-bottom:14px;">
          <div class="tile"><div class="label">Cenário</div><div class="value" style="font-size:15px;">${registro.categoria_condicao || '—'} ${registro.reembolsado ? '· reembolsado' : ''}</div></div>
          <div class="tile"><div class="label">Resultado Financeiro</div><div class="value" style="font-size:20px;color:${registro.resultado_financeiro >= 0 ? 'var(--good-text)' : 'var(--critical)'}">${Util.moeda(registro.resultado_financeiro)}</div></div>
        </div>
        ${formHtml(CAMPOS_PEDIDO, registro)}
      `;
    }
    const form = area.querySelector('form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const dados = { numero_pedido: numeroPedido, ...coletarValores(form, CAMPOS_PEDIDO) };
      try {
        if (registro) await Api.atualizar('pedidos', registro.id, dados);
        else await Api.criar('pedidos', dados);
        Util.toast('Registro Central salvo.');
        await renderSecaoPedido(container, numeroPedido);
      } catch (err) {
        Util.toast('Erro: ' + err.message);
      }
    });
  }

  async function render(container, numeroPedido) {
    if (!numeroPedido) {
      container.innerHTML = `
        <h1>Caso</h1>
        <p class="subtitulo">Veja e edite um pedido inteiro — Registro Central, Laudo, Recurso e Saldão — numa página só.</p>
        <div class="toolbar">
          <input type="text" id="busca-caso" placeholder="Digite o Nº do Pedido..." style="min-width:280px;" />
          <button id="btn-ver-caso">Ver Caso</button>
        </div>
      `;
      const ir = () => {
        const v = container.querySelector('#busca-caso').value.trim();
        if (v) location.hash = `#caso/${encodeURIComponent(v)}`;
      };
      container.querySelector('#btn-ver-caso').addEventListener('click', ir);
      container.querySelector('#busca-caso').addEventListener('keydown', (e) => { if (e.key === 'Enter') ir(); });
      return;
    }

    container.innerHTML = `
      <h1>Caso — Pedido ${numeroPedido}</h1>
      <p class="subtitulo"><a href="#caso">← buscar outro pedido</a></p>
      <div class="painel" id="secao-registro"></div>
      <div class="painel" id="secao-laudo"></div>
      <div class="painel" id="secao-recurso"></div>
      <div class="painel" id="secao-saldao"></div>
    `;

    await Promise.all([
      renderSecaoPedido(container, numeroPedido),
      renderSecaoFilha(container, 'secao-laudo', CONFIG_LAUDO, numeroPedido),
      renderSecaoFilha(container, 'secao-recurso', CONFIG_RECURSO, numeroPedido),
      renderSecaoFilha(container, 'secao-saldao', CONFIG_SALDAO, numeroPedido),
    ]);
  }

  return { render };
})();
