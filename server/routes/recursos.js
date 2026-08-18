const createCrudRouter = require('./_crudHelper');

module.exports = createCrudRouter(
  'recursos',
  [
    'data_abertura',
    'evidencias_anexadas',
    'status_recurso',
    'data_resposta',
    'resultado_final',
    'valor_reembolso',
    'obs',
  ],
  {
    nomeExport: 'Recurso',
    colunasExport: [
      ['numero_pedido', 'Nº Pedido'],
      ['data_abertura', 'Data Abertura'],
      ['status_recurso', 'Status'],
      ['data_resposta', 'Data Resposta'],
      ['resultado_final', 'Resultado Final'],
      ['valor_reembolso', 'Valor Reembolso'],
      ['obs', 'Obs.'],
    ],
  }
);
