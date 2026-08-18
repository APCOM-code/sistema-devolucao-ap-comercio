const Paginas = {
  dashboard: PaginaDashboard,
  registro: PaginaRegistroCentral,
  laudo: PaginaLaudo,
  recurso: PaginaRecurso,
  saldao: PaginaSaldao,
  importar: PaginaImportar,
  caso: PaginaCaso,
};

async function navegar() {
  const hash = (location.hash || '#dashboard').replace('#', '');
  const [caminho, queryStr] = hash.split('?');
  const partes = caminho.split('/');
  const nome = partes[0];
  const param = partes[1] ? decodeURIComponent(partes[1]) : null;
  const query = Object.fromEntries(new URLSearchParams(queryStr || ''));
  const pagina = Paginas[nome] || Paginas.dashboard;

  document.querySelectorAll('#nav-tabs a').forEach((a) => {
    a.classList.toggle('active', a.dataset.tab === nome);
  });

  const container = document.getElementById('conteudo');
  container.innerHTML = '';
  try {
    await pagina.render(container, param, query);
  } catch (err) {
    console.error(err);
    container.innerHTML = `<div class="vazio">Erro ao carregar: ${err.message}</div>`;
  }
}

window.addEventListener('hashchange', navegar);
window.addEventListener('DOMContentLoaded', navegar);
