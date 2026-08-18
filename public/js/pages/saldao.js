const PaginaSaldao = criarPaginaFilha({
  recurso: 'saldao',
  titulo: 'Produtos Enviados ao Saldão',
  subtitulo: 'Digite o Nº do Pedido — produto, motivo original e valor de venda são buscados automaticamente.',
  campos: [
    { nome: 'data_envio', label: 'Data Envio Saldão', tipo: 'date' },
    { nome: 'lote_envio', label: 'Lote Envio', tipo: 'text' },
    { nome: 'condicao_produto', label: 'Condição do Produto', tipo: 'text' },
    { nome: 'nf_emitida_parceiro', label: 'NF Emitida Parceiro?', tipo: 'select', opcoes: ['Sim', 'Não'] },
    { nome: 'numero_nf_parceiro', label: 'Nº NF Parceiro', tipo: 'text' },
    { nome: 'valor_saldao', label: 'Valor Saldão (R$)', tipo: 'money' },
    { nome: 'obs', label: 'Obs.', tipo: 'textarea', full: true },
  ],
  colunasTabela: [
    { nome: 'condicao_produto', label: 'Condição' },
    { nome: 'valor_saldao', label: 'Valor Saldão', formato: Util.moeda },
    { nome: 'data_envio', label: 'Data Envio', formato: Util.dataBr },
    { nome: 'nf_emitida_parceiro', label: 'NF Parceiro?' },
  ],
});
