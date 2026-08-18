const createCrudRouter = require('./_crudHelper');

module.exports = createCrudRouter('laudos', [
  'fotos_tiradas',
  'embalagem_intacta',
  'produto_funciona',
  'dano_fisico',
  'acessorios_completos',
  'serial_conferido',
  'condicao_geral',
  'nf_emitida_erp',
  'obs',
]);
