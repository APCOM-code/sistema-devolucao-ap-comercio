const Paginas = {
  dashboard: PaginaDashboard,
  registro: PaginaRegistroCentral,
  laudo: PaginaLaudo,
  recurso: PaginaRecurso,
  saldao: PaginaSaldao,
};

async function navegar() {
  const hash = (location.hash || '#dashboard').replace('#', '');
  const pagina = Paginas[hash] || Paginas.dashboard;

  document.querySelectorAll('#nav-tabs a').forEach((a) => {
    a.classList.toggle('active', a.dataset.tab === hash);
  });

  const container = document.getElementById('conteudo');
  container.innerHTML = '';
  try {
    await pagina.render(container);
  } catch (err) {
    console.error(err);
    container.innerHTML = `<div class="vazio">Erro ao carregar: ${err.message}</div>`;
  }
}

window.addEventListener('hashchange', navegar);
window.addEventListener('DOMContentLoaded', navegar);
