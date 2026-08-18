const PaginaRecurso = criarPaginaFilha({
  recurso: 'recursos',
  titulo: 'Recurso e Reembolso — Plataforma',
  subtitulo: 'Digite o Nº do Pedido — plataforma, valor de venda e destinação são buscados automaticamente.',
  campos: [
    { nome: 'data_abertura', label: 'Data Abertura Recurso', tipo: 'date' },
    { nome: 'evidencias_anexadas', label: 'Evidências Anexadas?', tipo: 'select', opcoes: ['Sim - fotos', 'Não'] },
    { nome: 'status_recurso', label: 'Status Recurso', tipo: 'select', opcoes: ['Em análise', 'Aguardando retorno', 'Encerrado'] },
    { nome: 'data_resposta', label: 'Data Resposta', tipo: 'date' },
    { nome: 'resultado_final', label: 'Resultado Final', tipo: 'select', opcoes: ['Em recurso', 'Reembolso total', 'Reembolso parcial', 'Negado'] },
    { nome: 'valor_reembolso', label: 'Valor Reembolso (R$)', tipo: 'money' },
    { nome: 'obs', label: 'Obs.', tipo: 'textarea', full: true },
  ],
  colunasTabela: [
    { nome: 'status_recurso', label: 'Status' },
    { nome: 'resultado_final', label: 'Resultado' },
    { nome: 'valor_reembolso', label: 'Reembolso', formato: Util.moeda },
    { nome: 'data_abertura', label: 'Abertura', formato: Util.dataBr },
  ],
});
