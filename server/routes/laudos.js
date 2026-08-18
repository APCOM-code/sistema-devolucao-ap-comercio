const createCrudRouter = require('./_crudHelper');

module.exports = createCrudRouter(
  'laudos',
  [
    'fotos_tiradas',
    'embalagem_intacta',
    'produto_funciona',
    'dano_fisico',
    'acessorios_completos',
    'serial_conferido',
    'condicao_geral',
    'nf_emitida_erp',
    'obs',
  ],
  {
    nomeExport: 'Laudo',
    colunasExport: [
      ['numero_pedido', 'Nº Pedido'],
      ['fotos_tiradas', 'Fotos Tiradas?'],
      ['embalagem_intacta', 'Embalagem Intacta?'],
      ['produto_funciona', 'Produto Funciona?'],
      ['dano_fisico', 'Dano Físico?'],
      ['acessorios_completos', 'Acessórios Completos?'],
      ['condicao_geral', 'Condição Geral'],
      ['nf_emitida_erp', 'NF Emitida?'],
      ['obs', 'Obs.'],
    ],
  }
);
