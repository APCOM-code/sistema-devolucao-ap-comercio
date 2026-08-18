const createCrudRouter = require('./_crudHelper');

module.exports = createCrudRouter('saldao', [
  'data_envio',
  'lote_envio',
  'condicao_produto',
  'nf_emitida_parceiro',
  'numero_nf_parceiro',
  'valor_saldao',
  'obs',
]);
