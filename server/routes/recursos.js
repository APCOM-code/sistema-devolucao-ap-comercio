const createCrudRouter = require('./_crudHelper');

module.exports = createCrudRouter('recursos', [
  'data_abertura',
  'evidencias_anexadas',
  'status_recurso',
  'data_resposta',
  'resultado_final',
  'valor_reembolso',
  'obs',
]);
