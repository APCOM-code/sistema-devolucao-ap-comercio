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
  const partes = (location.hash || '#dashboard').replace('#', '').split('/');
  const nome = partes[0];
  const param = partes[1] ? decodeURIComponent(partes[1]) : null;
  const pagina = Paginas[nome] || Paginas.dashboard;

  document.querySelectorAll('#nav-tabs a').forEach((a) => {
    a.classList.toggle('active', a.dataset.tab === nome);
  });

  const container = document.getElementById('conteudo');
  container.innerHTML = '';
  try {
    await pagina.render(container, param);
  } catch (err) {
    console.error(err);
    container.innerHTML = `<div class="vazio">Erro ao carregar: ${err.message}</div>`;
  }
}

window.addEventListener('hashchange', navegar);
window.addEventListener('DOMContentLoaded', navegar);
