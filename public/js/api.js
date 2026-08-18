const Api = {
  async _req(metodo, url, corpo) {
    const resp = await fetch(url, {
      method: metodo,
      headers: corpo ? { 'Content-Type': 'application/json' } : undefined,
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
    if (!resp.ok) {
      let msg = `Erro ${resp.status}`;
      try {
        const j = await resp.json();
        if (j.erro) msg = j.erro;
      } catch (_) {}
      throw new Error(msg);
    }
    if (resp.status === 204) return null;
    return resp.json();
  },
  listar(recurso, params = {}) {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null));
    const sufixo = qs.toString() ? `?${qs}` : '';
    return this._req('GET', `/api/${recurso}${sufixo}`);
  },
  criar(recurso, dados) {
    return this._req('POST', `/api/${recurso}`, dados);
  },
  atualizar(recurso, id, dados) {
    return this._req('PUT', `/api/${recurso}/${id}`, dados);
  },
  remover(recurso, id) {
    return this._req('DELETE', `/api/${recurso}/${id}`);
  },
  lookupPedido(numero) {
    return this._req('GET', `/api/pedidos/lookup/${encodeURIComponent(numero)}`);
  },
  dashboard() {
    return this._req('GET', '/api/dashboard');
  },
  pendencias() {
    return this._req('GET', '/api/pendencias');
  },
};
