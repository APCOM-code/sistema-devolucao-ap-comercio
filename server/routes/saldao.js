const createCrudRouter = require('./_crudHelper');

module.exports = createCrudRouter(
  'saldao',
  [
    'data_envio',
    'lote_envio',
    'condicao_produto',
    'nf_emitida_parceiro',
    'numero_nf_parceiro',
    'valor_saldao',
    'obs',
  ],
  {
    nomeExport: 'Saldao',
    colunasExport: [
      ['numero_pedido', 'Nº Pedido'],
      ['data_envio', 'Data Envio'],
      ['lote_envio', 'Lote Envio'],
      ['condicao_produto', 'Condição'],
      ['nf_emitida_parceiro', 'NF Parceiro?'],
      ['numero_nf_parceiro', 'Nº NF Parceiro'],
      ['valor_saldao', 'Valor Saldão'],
      ['obs', 'Obs.'],
    ],
  }
);
