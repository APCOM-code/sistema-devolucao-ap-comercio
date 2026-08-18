const PaginaRegistroCentral = (() => {
  const MOTIVOS = ['Arrependimento', 'Produto com defeito', 'Danificado pelo comprador', 'Danificado na entrega', 'Defeito de fabricação', 'Outros'];
  const STATUS = ['Em andamento', 'Encerrado'];
  const DESTINACOES = ['Reembalar', 'Assistência técnica', 'Saldão parceiro', 'Enviado ao fabricante', 'Volta ao estoque', 'Aguardando gestor', 'Descarte'];
  const CAMPOS_MONEY = ['valor_venda', 'reembolso_ml', 'custo_produto', 'comissao_ml', 'frete_envio', 'frete_devolucao'];

  async function abrirFormulario(container, registro) {
    const editando = !!registro;
    const responsaveis = await Api.listar('responsaveis');
    const fundo = Util.el('div', { class: 'modal-fundo' });
    const modal = Util.el('div', { class: 'modal' });
    const g = (nome) => (registro ? registro[nome] ?? '' : '');
    const opcoes = (lista, atual) =>
      lista.map((o) => `<option value="${o}" ${o === atual ? 'selected' : ''}>${o}</option>`).join('');

    modal.innerHTML = `
      <h2>${editando ? 'Editar Pedido' : 'Novo Pedido'}</h2>
      <form id="form-pedido">
        <div class="form-grid">
          <div class="campo"><label>Nº do Pedido</label><input name="numero_pedido" value="${g('numero_pedido')}" required /></div>
          <div class="campo"><label>Data</label><input type="date" name="data" value="${g('data')}" /></div>
          <div class="campo"><label>Plataforma</label><input name="plataforma" value="${g('plataforma') || 'Mercado Livre'}" /></div>
          <div class="campo"><label>Tipo Envio</label><input name="tipo_envio" value="${g('tipo_envio') || 'Full'}" /></div>
          <div class="campo"><label>Produto/SKU</label><input name="produto_sku" value="${g('produto_sku')}" /></div>
          <div class="campo"><label>Motivo</label><select name="motivo"><option value="">—</option>${opcoes(MOTIVOS, g('motivo'))}</select></div>
          <div class="campo"><label>Contestação</label><input name="contestacao" value="${g('contestacao')}" placeholder="Sim / Não / Devolução direta" /></div>
          <div class="campo"><label>Resultado Contestação</label><input name="resultado_contestacao" value="${g('resultado_contestacao')}" placeholder="Aprovada / Negada / Em análise" /></div>
          <div class="campo"><label>Produto Recebido?</label><select name="produto_recebido"><option value="">—</option><option ${g('produto_recebido')==='Sim'?'selected':''}>Sim</option><option ${g('produto_recebido')==='Não'?'selected':''}>Não</option></select></div>
          <div class="campo"><label>Status Geral</label><select name="status_geral"><option value="">—</option>${opcoes(STATUS, g('status_geral'))}</select></div>
          <div class="campo"><label>Destinação</label><select name="destinacao"><option value="">—</option>${opcoes(DESTINACOES, g('destinacao'))}</select></div>
          <div class="campo"><label>Responsável</label>
            <select name="responsavel"><option value="">—</option>${opcoes(responsaveis.map(r=>r.nome), g('responsavel'))}<option value="__novo__">+ novo responsável...</option></select>
          </div>
          <div class="campo"><label>Valor Venda (R$)</label><input type="number" step="0.01" name="valor_venda" value="${g('valor_venda')}" /></div>
          <div class="campo"><label>Reembolso ML (R$)</label><input type="number" step="0.01" name="reembolso_ml" value="${g('reembolso_ml')}" /></div>
          <div class="campo"><label>Custo do Produto (R$)</label><input type="number" step="0.01" name="custo_produto" value="${g('custo_produto')}" /></div>
          <div class="campo"><label>Comissão ML (R$)</label><input type="number" step="0.01" name="comissao_ml" value="${g('comissao_ml')}" /></div>
          <div class="campo"><label>Frete Envio (R$)</label><input type="number" step="0.01" name="frete_envio" value="${g('frete_envio')}" /></div>
          <div class="campo"><label>Frete Devolução (R$)</label><input type="number" step="0.01" name="frete_devolucao" value="${g('frete_devolucao')}" /></div>
          <div class="campo full"><label>Obs.</label><textarea name="obs">${g('obs')}</textarea></div>
        </div>
        <div class="modal-acoes">
          <button type="button" class="secundario" id="btn-cancelar">Cancelar</button>
          <button type="submit">Salvar</button>
        </div>
      </form>
    `;
    fundo.appendChild(modal);
    document.body.appendChild(fundo);
    fundo.addEventListener('click', (e) => { if (e.target === fundo) fundo.remove(); });
    modal.querySelector('#btn-cancelar').addEventListener('click', () => fundo.remove());

    modal.querySelector('[name="responsavel"]').addEventListener('change', async (e) => {
      if (e.target.value === '__novo__') {
        const nome = prompt('Nome do novo responsável:');
        if (nome && nome.trim()) {
          await Api.criar('responsaveis', { nome: nome.trim() });
          const opt = Util.el('option', { value: nome.trim(), selected: true }, nome.trim());
          e.target.insertBefore(opt, e.target.lastElementChild);
        } else {
          e.target.value = '';
        }
      }
    });

    modal.querySelector('#form-pedido').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const dados = {};
      for (const [k, v] of fd.entries()) {
        dados[k] = CAMPOS_MONEY.includes(k) ? (v === '' ? null : Number(v)) : v === '' ? null : v;
      }
      try {
        if (editando) await Api.atualizar('pedidos', registro.id, dados);
        else await Api.criar('pedidos', dados);
        Util.toast('Pedido salvo com sucesso.');
        fundo.remove();
        render(container);
      } catch (err) {
        Util.toast('Erro: ' + err.message);
      }
    });
  }

  function statusBadge(status) {
    if (status === 'Encerrado') return `<span class="badge encerrado">Encerrado</span>`;
    return `<span class="badge andamento">${status || 'Em andamento'}</span>`;
  }

  const CENARIO_BADGE = {
    'danificado|0': { texto: 'Perda total', classe: 'perda' },
    'danificado|1': { texto: 'Recuperado no descarte', classe: 'recuperado' },
    'bom|1': { texto: 'Ganho duplo', classe: 'ganho' },
    'bom|0': { texto: 'Neutro', classe: 'neutro' },
    'desconhecido|0': { texto: 'Sem laudo', classe: 'desconhecido' },
    'desconhecido|1': { texto: 'Sem laudo', classe: 'desconhecido' },
  };
  function cenarioBadge(p) {
    const chave = `${p.categoria_condicao}|${p.reembolsado ? 1 : 0}`;
    const info = CENARIO_BADGE[chave] || { texto: '—', classe: 'desconhecido' };
    return `<span class="badge cenario-${info.classe}">${info.texto}</span>`;
  }

  async function carregarTabela(container) {
    const f = container.querySelector('#filtros');
    const params = {
      status_geral: f.querySelector('[name="status_geral"]').value,
      destinacao: f.querySelector('[name="destinacao"]').value,
      responsavel: f.querySelector('[name="responsavel"]').value,
      q: f.querySelector('[name="q"]').value.trim(),
    };
    const area = container.querySelector('#tabela-area');
    const pedidos = await Api.listar('pedidos', params);
    if (pedidos.length === 0) {
      area.innerHTML = `<div class="vazio">Nenhum pedido encontrado.</div>`;
      return;
    }
    area.innerHTML = `
      <div class="tabela-wrap"><table>
        <thead><tr>
          <th>Nº Pedido</th><th>Data</th><th>SKU</th><th>Motivo</th><th>Status</th><th>Destinação</th>
          <th>Cenário</th><th>Resultado (R$)</th><th>Responsável</th><th>Ações</th>
        </tr></thead>
        <tbody>
          ${pedidos
            .map(
              (p) => `<tr data-id="${p.id}">
              <td>${p.numero_pedido}</td>
              <td>${Util.dataBr(p.data)}</td>
              <td>${p.produto_sku || '—'}</td>
              <td>${p.motivo || '—'}</td>
              <td>${statusBadge(p.status_geral)}</td>
              <td>${p.destinacao || '—'}</td>
              <td>${cenarioBadge(p)}</td>
              <td class="num" style="color:${p.resultado_financeiro >= 0 ? 'var(--good-text)' : 'var(--critical)'}">${Util.moeda(p.resultado_financeiro)}</td>
              <td>${p.responsavel || '—'}</td>
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
      const registro = pedidos.find((p) => String(p.id) === id);
      tr.querySelector('.btn-editar').addEventListener('click', () => abrirFormulario(container, registro));
      tr.querySelector('.btn-excluir').addEventListener('click', async () => {
        if (!confirm(`Excluir o pedido ${registro.numero_pedido}? Isso não apaga laudos/recursos/saldão ligados a ele.`)) return;
        await Api.remover('pedidos', id);
        Util.toast('Excluído.');
        carregarTabela(container);
      });
    });
  }

  async function render(container) {
    const responsaveis = await Api.listar('responsaveis');
    container.innerHTML = `
      <h1>Registro Central de Devoluções</h1>
      <p class="subtitulo">Preencha aqui primeiro — as outras abas (Laudo, Recurso, Saldão) buscam os dados automaticamente pelo Nº do Pedido.</p>
      <div class="toolbar" id="filtros">
        <input type="text" name="q" placeholder="Buscar por Nº pedido, SKU ou obs..." />
        <select name="status_geral"><option value="">Status: todos</option>${STATUS.map((s) => `<option value="${s}">${s}</option>`).join('')}</select>
        <select name="destinacao"><option value="">Destinação: todas</option>${DESTINACOES.map((d) => `<option value="${d}">${d}</option>`).join('')}</select>
        <select name="responsavel"><option value="">Responsável: todos</option>${responsaveis.map((r) => `<option value="${r.nome}">${r.nome}</option>`).join('')}</select>
        <div class="spacer"></div>
        <button id="btn-novo">+ Novo Pedido</button>
      </div>
      <div id="tabela-area"></div>
    `;
    container.querySelector('#btn-novo').addEventListener('click', () => abrirFormulario(container, null));
    container.querySelectorAll('#filtros input, #filtros select').forEach((el) => {
      el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', Util.debounce(() => carregarTabela(container), 300));
    });
    await carregarTabela(container);
  }

  return { render };
})();
