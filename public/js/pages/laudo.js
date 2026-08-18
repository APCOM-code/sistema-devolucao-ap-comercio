const PaginaLaudo = criarPaginaFilha({
  recurso: 'laudos',
  titulo: 'Laudo de Conferência do Produto',
  subtitulo: 'Digite o Nº do Pedido — os dados do pedido são buscados automaticamente no Registro Central.',
  campos: [
    { nome: 'fotos_tiradas', label: 'Fotos Tiradas?', tipo: 'select', opcoes: ['Sim', 'Não'] },
    { nome: 'embalagem_intacta', label: 'Embalagem Intacta?', tipo: 'select', opcoes: ['Sim', 'Não (leve)', 'Não (grave)'] },
    { nome: 'produto_funciona', label: 'Produto Funciona?', tipo: 'select', opcoes: ['Funciona normal', 'Funciona parcialmente', 'Não liga', 'Não testado'] },
    { nome: 'dano_fisico', label: 'Dano Físico?', tipo: 'select', opcoes: ['Não', 'Sim (leve)', 'Sim (grave)'] },
    { nome: 'acessorios_completos', label: 'Acessórios Completos?', tipo: 'select', opcoes: ['Sim', 'Não - faltando itens'] },
    { nome: 'serial_conferido', label: 'Serial Conferido?', tipo: 'select', opcoes: ['Sim', 'Não'] },
    { nome: 'condicao_geral', label: 'Condição Geral', tipo: 'select', opcoes: ['Perfeito - como novo', 'Bom', 'Regular', 'Ruim', 'Péssimo - não funciona'] },
    { nome: 'nf_emitida_erp', label: 'NF Emitida no ERP?', tipo: 'select', opcoes: ['Sim', 'Não'] },
    { nome: 'obs', label: 'Obs. do Laudo', tipo: 'textarea', full: true },
  ],
  colunasTabela: [
    { nome: 'condicao_geral', label: 'Condição Geral' },
    { nome: 'produto_funciona', label: 'Funciona?' },
    { nome: 'dano_fisico', label: 'Dano Físico?' },
    { nome: 'nf_emitida_erp', label: 'NF Emitida?' },
  ],
});
