// Fabrica de pagina para as abas "filhas" (Laudo, Recurso, Saldao) que sempre
// funcionam do mesmo jeito: digita o Nº do Pedido, o sistema busca os dados do
// Registro Central automaticamente, e o usuario preenche os campos proprios daquela aba.
function criarPaginaFilha(cfg) {
  function valorCampo(registro, campo) {
    const v = registro ? registro[campo.nome] : undefined;
    return v === undefined || v === null ? '' : v;
  }

  function campoHtml(campo, registro) {
    const valor = valorCampo(registro, campo);
    if (campo.tipo === 'select') {
      const opts = campo.opcoes
        .map((o) => `<option value="${o}" ${o === valor ? 'selected' : ''}>${o || '(vazio)'}</option>`)
        .join('');
      return `<select name="${campo.nome}"><option value="">—</option>${opts}</select>`;
    }
    if (campo.tipo === 'textarea') {
      return `<textarea name="${campo.nome}">${valor}</textarea>`;
    }
    if (campo.tipo === 'date') {
      return `<input type="date" name="${campo.nome}" value="${valor}" />`;
    }
    if (campo.tipo === 'money') {
      return `<input type="number" step="0.01" name="${campo.nome}" value="${valor}" />`;
    }
    return `<input type="text" name="${campo.nome}" value="${valor}" />`;
  }

  async function abrirFormulario(container, registroExistente) {
    const editando = !!registroExistente;
    const fundo = Util.el('div', { class: 'modal-fundo' });
    const modal = Util.el('div', { class: 'modal' });
    modal.innerHTML = `
      <h2>${editando ? 'Editar' : 'Novo'} — ${cfg.titulo}</h2>
      <div class="campo">
        <label>Nº do Pedido</label>
        <input type="text" id="campo-numero-pedido" value="${registroExistente ? registroExistente.numero_pedido : ''}" ${editando ? 'readonly' : ''} placeholder="Digite o número do pedido..." />
      </div>
      <div id="info-pedido"></div>
      <form id="form-filho">
        <div class="form-grid">
          ${cfg.campos
            .map(
              (c) => `<div class="campo ${c.full ? 'full' : ''}"><label>${c.label}</label>${campoHtml(c, registroExistente)}</div>`
            )
            .join('')}
        </div>
        <div class="modal-acoes">
          <button type="button" class="secundario" id="btn-cancelar">Cancelar</button>
          <button type="submit">Salvar</button>
        </div>
      </form>
    `;
    fundo.appendChild(modal);
    document.body.appendChild(fundo);
    fundo.addEventListener('click', (e) => {
      if (e.target === fundo) fundo.remove();
    });
    modal.querySelector('#btn-cancelar').addEventListener('click', () => fundo.remove());

    const infoDiv = modal.querySelector('#info-pedido');
    const inputNumero = modal.querySelector('#campo-numero-pedido');

    async function atualizarInfo() {
      const numero = inputNumero.value.trim();
      if (!numero) {
        infoDiv.innerHTML = '';
        return;
      }
      const resultados = await Api.lookupPedido(numero);
      if (resultados.length === 0) {
        infoDiv.innerHTML = `<div class="aviso-lookup orfao">⚠ Pedido não encontrado no Registro Central. Você ainda pode salvar, mas o registro ficará marcado como órfão até completar o cadastro lá.</div>`;
      } else {
        const p = resultados[0];
        infoDiv.innerHTML = `<div class="aviso-lookup ok">✓ ${p.plataforma || ''} · ${p.tipo_envio || ''} · SKU ${p.produto_sku || '—'} · Venda ${Util.moeda(p.valor_venda)} · Destinação: ${p.destinacao || '—'}${resultados.length > 1 ? ` (⚠ ${resultados.length} pedidos com este número — mostrando o mais recente)` : ''}</div>`;
      }
    }
    inputNumero.addEventListener('input', Util.debounce(atualizarInfo, 350));
    if (editando) atualizarInfo();

    modal.querySelector('#form-filho').addEventListener('submit', async (e) => {
      e.preventDefault();
      const numero = inputNumero.value.trim();
      if (!numero) {
        Util.toast('Digite o número do pedido.');
        return;
      }
      const dados = { numero_pedido: numero };
      for (const c of cfg.campos) {
        const el = modal.querySelector(`[name="${c.nome}"]`);
        dados[c.nome] = el.value === '' ? null : c.tipo === 'money' ? Number(el.value) : el.value;
      }
      try {
        if (editando) await Api.atualizar(cfg.recurso, registroExistente.id, dados);
        else await Api.criar(cfg.recurso, dados);
        Util.toast('Salvo com sucesso.');
        fundo.remove();
        render(container);
      } catch (err) {
        Util.toast('Erro: ' + err.message);
      }
    });
  }

  function lerFiltros(container) {
    return {
      numero_pedido: container.querySelector('#filtro-numero').value.trim(),
      data_inicio: container.querySelector('#filtro-data-inicio').value,
      data_fim: container.querySelector('#filtro-data-fim').value,
    };
  }

  function exportarExcel(container) {
    const filtros = lerFiltros(container);
    const qs = new URLSearchParams(Object.entries(filtros).filter(([, v]) => v !== '' && v != null));
    window.location.href = `/api/${cfg.recurso}/exportar?${qs}`;
  }

  async function render(container, _param, query = {}) {
    container.innerHTML = `
      <h1>${cfg.titulo}</h1>
      <p class="subtitulo">${cfg.subtitulo}</p>
      <div class="toolbar">
        <input type="text" id="filtro-numero" placeholder="Filtrar por Nº do Pedido..." value="${query.numero_pedido || ''}" />
        <label style="font-size:12px;color:var(--text-secondary);">Período de <input type="date" id="filtro-data-inicio" value="${query.data_inicio || ''}" style="width:auto;" /></label>
        <label style="font-size:12px;color:var(--text-secondary);">até <input type="date" id="filtro-data-fim" value="${query.data_fim || ''}" style="width:auto;" /></label>
        <div class="spacer"></div>
        <button class="secundario" id="btn-exportar">⬇ Exportar Excel</button>
        <button id="btn-novo">+ Novo</button>
      </div>
      <div id="tabela-area"></div>
    `;
    container.querySelector('#btn-novo').addEventListener('click', () => abrirFormulario(container, null));
    container.querySelector('#btn-exportar').addEventListener('click', () => exportarExcel(container));
    ['#filtro-numero', '#filtro-data-inicio', '#filtro-data-fim'].forEach((sel) => {
      container.querySelector(sel).addEventListener('input', Util.debounce(() => carregarTabela(container), 300));
    });
    await carregarTabela(container);
  }

  async function carregarTabela(container) {
    const filtros = lerFiltros(container);
    const area = container.querySelector('#tabela-area');
    const registros = await Api.listar(cfg.recurso, filtros);
    if (registros.length === 0) {
      area.innerHTML = `<div class="vazio">Nenhum registro ainda.</div>`;
      return;
    }
    const colunas = cfg.colunasTabela;
    area.innerHTML = `
      <div class="tabela-wrap"><table>
        <thead><tr>
          <th>Nº Pedido</th>
          ${colunas.map((c) => `<th>${c.label}</th>`).join('')}
          <th>Ações</th>
        </tr></thead>
        <tbody>
          ${registros
            .map(
              (r) => `<tr data-id="${r.id}">
              <td>${r.numero_pedido}${r.orfao ? ' <span class="badge orfao">órfão</span>' : ''}</td>
              ${colunas.map((c) => `<td>${c.formato ? c.formato(r[c.nome]) : r[c.nome] ?? '—'}</td>`).join('')}
              <td class="acoes">
                <button class="secundario btn-editar">Editar</button>
                <button class="perigo btn-excluir">Excluir</button>
              </td>
            </tr>`
            )
            .join('')}
        </tbody>
      </table></div>
    `;
    area.querySelectorAll('tr[data-id]').forEach((tr) => {
      const id = tr.dataset.id;
      const registro = registros.find((r) => String(r.id) === id);
      tr.querySelector('.btn-editar').addEventListener('click', () => abrirFormulario(container, registro));
      tr.querySelector('.btn-excluir').addEventListener('click', async () => {
        if (!confirm('Excluir este registro?')) return;
        await Api.remover(cfg.recurso, id);
        Util.toast('Excluído.');
        carregarTabela(container);
      });
    });
  }

  return { render };
}
