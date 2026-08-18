const PaginaImportar = (() => {
  function arquivoParaBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function linhaResumo(nome, r) {
    return `
      <tr>
        <td>${nome}</td>
        <td class="num">${r.novos}</td>
        <td class="num">${r.atualizados}</td>
        <td class="num">${r.ambiguos}</td>
      </tr>`;
  }

  function renderResumo(resumo) {
    const totalAmbiguos = resumo.pedidos.ambiguos + resumo.laudos.ambiguos + resumo.recursos.ambiguos + resumo.saldao.ambiguos;
    const listaAvisos = resumo.avisos && resumo.avisos.length
      ? `<div class="alerta">⚠ ${resumo.avisos.length} aviso(s) de dados suspeitos (não vão ser importados, revise na planilha):<ul style="margin:8px 0 0;padding-left:20px;">${resumo.avisos.map((a) => `<li>${a}</li>`).join('')}</ul></div>`
      : '';
    const listaAmbiguos = totalAmbiguos > 0
      ? `<div class="alerta">⚠ ${totalAmbiguos} pedido(s) com mais de um registro igual no sistema — pulados por segurança, não foram alterados automaticamente. Revise manualmente: ${
          [...resumo.ambiguos_detalhe.pedidos, ...resumo.ambiguos_detalhe.laudos, ...resumo.ambiguos_detalhe.recursos, ...resumo.ambiguos_detalhe.saldao]
            .filter((v, i, arr) => arr.indexOf(v) === i)
            .join(', ')
        }</div>`
      : '';

    return `
      ${listaAvisos}
      ${listaAmbiguos}
      <div class="tabela-wrap">
        <table>
          <thead><tr><th>Aba</th><th>Novos</th><th>Atualizados</th><th>Ambíguos (pulados)</th></tr></thead>
          <tbody>
            ${linhaResumo('Registro Central', resumo.pedidos)}
            ${linhaResumo('Laudo', resumo.laudos)}
            ${linhaResumo('Recurso', resumo.recursos)}
            ${linhaResumo('Saldão', resumo.saldao)}
          </tbody>
        </table>
      </div>
    `;
  }

  async function render(container) {
    container.innerHTML = `
      <h1>Importar Planilha</h1>
      <p class="subtitulo">
        Suba aqui o arquivo .xlsx baixado do Google Sheets — nada de terminal ou comando.
        O sistema mostra o que vai mudar antes de aplicar, e nunca deixa uma célula vazia
        apagar um dado que já existia.
      </p>
      <div class="painel">
        <div class="toolbar">
          <input type="file" id="arquivo-xlsx" accept=".xlsx" />
          <button id="btn-analisar">Analisar planilha</button>
          <div class="spacer"></div>
          <span id="nome-arquivo" style="font-size:12px;color:var(--text-muted);"></span>
        </div>
        <div id="resultado-area"></div>
      </div>
    `;

    const inputArquivo = container.querySelector('#arquivo-xlsx');
    const btnAnalisar = container.querySelector('#btn-analisar');
    const resultadoArea = container.querySelector('#resultado-area');
    let base64Atual = null;

    inputArquivo.addEventListener('change', () => {
      const f = inputArquivo.files[0];
      container.querySelector('#nome-arquivo').textContent = f ? f.name : '';
      resultadoArea.innerHTML = '';
      base64Atual = null;
    });

    btnAnalisar.addEventListener('click', async () => {
      const file = inputArquivo.files[0];
      if (!file) {
        Util.toast('Escolha um arquivo .xlsx primeiro.');
        return;
      }
      btnAnalisar.disabled = true;
      btnAnalisar.textContent = 'Analisando...';
      resultadoArea.innerHTML = '';
      try {
        base64Atual = await arquivoParaBase64(file);
        const resumo = await Api._req('POST', '/api/importar/preview', { conteudo_base64: base64Atual });
        resultadoArea.innerHTML =
          renderResumo(resumo) +
          `<div class="modal-acoes" style="justify-content:flex-start;margin-top:16px;">
             <button id="btn-confirmar">Confirmar Importação</button>
           </div>`;
        resultadoArea.querySelector('#btn-confirmar').addEventListener('click', async (e) => {
          e.target.disabled = true;
          e.target.textContent = 'Aplicando...';
          try {
            const resp = await Api._req('POST', '/api/importar/confirmar', { conteudo_base64: base64Atual });
            const a = resp.aplicado;
            resultadoArea.innerHTML = `<div class="aviso-lookup ok" style="font-size:14px;padding:16px;">
              ✓ Importação aplicada: ${a.pedidos.novos + a.laudos.novos + a.recursos.novos + a.saldao.novos} registros novos,
              ${a.pedidos.atualizados + a.laudos.atualizados + a.recursos.atualizados + a.saldao.atualizados} atualizados.
              Confira o <a href="#dashboard">Dashboard</a>.
            </div>`;
            Util.toast('Importação concluída.');
          } catch (err) {
            Util.toast('Erro ao aplicar: ' + err.message);
            e.target.disabled = false;
            e.target.textContent = 'Confirmar Importação';
          }
        });
      } catch (err) {
        resultadoArea.innerHTML = `<div class="vazio">Erro ao analisar: ${err.message}</div>`;
      } finally {
        btnAnalisar.disabled = false;
        btnAnalisar.textContent = 'Analisar planilha';
      }
    });
  }

  return { render };
})();
