const path = require('path');
const { createClient } = require('@libsql/client');

// Se TURSO_DATABASE_URL estiver definida, conecta no banco na nuvem (Turso).
// Senao, usa um arquivo SQLite local (mesmo motor, o cliente libsql fala os dois).
const url = process.env.TURSO_DATABASE_URL || `file:${path.join(__dirname, '..', 'devolucoes.db')}`;
const authToken = process.env.TURSO_AUTH_TOKEN;

const db = createClient(authToken ? { url, authToken } : { url });

const SCHEMA_TABELAS = `
CREATE TABLE IF NOT EXISTS responsaveis (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS pedidos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  numero_pedido TEXT NOT NULL,
  data TEXT,
  plataforma TEXT DEFAULT 'Mercado Livre',
  tipo_envio TEXT,
  produto_sku TEXT,
  motivo TEXT,
  contestacao TEXT,
  resultado_contestacao TEXT,
  produto_recebido TEXT,
  status_geral TEXT,
  destinacao TEXT,
  valor_venda REAL,
  reembolso_ml REAL,
  custo_produto REAL,
  comissao_ml REAL,
  frete_envio REAL,
  frete_devolucao REAL,
  custo_componentes REAL,
  responsavel TEXT,
  obs TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_pedidos_numero ON pedidos(numero_pedido);

CREATE TABLE IF NOT EXISTS laudos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  numero_pedido TEXT NOT NULL,
  fotos_tiradas TEXT,
  embalagem_intacta TEXT,
  produto_funciona TEXT,
  dano_fisico TEXT,
  acessorios_completos TEXT,
  serial_conferido TEXT,
  condicao_geral TEXT,
  nf_emitida_erp TEXT,
  obs TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_laudos_numero ON laudos(numero_pedido);

CREATE TABLE IF NOT EXISTS recursos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  numero_pedido TEXT NOT NULL,
  data_abertura TEXT,
  evidencias_anexadas TEXT,
  status_recurso TEXT,
  data_resposta TEXT,
  resultado_final TEXT,
  valor_reembolso REAL,
  obs TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_recursos_numero ON recursos(numero_pedido);

CREATE TABLE IF NOT EXISTS saldao (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  numero_pedido TEXT NOT NULL,
  data_envio TEXT,
  lote_envio TEXT,
  condicao_produto TEXT,
  nf_emitida_parceiro TEXT,
  numero_nf_parceiro TEXT,
  valor_saldao REAL,
  obs TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_saldao_numero ON saldao(numero_pedido);
`;

// View central do calculo financeiro. Um pedido so perde o custo do produto quando o
// laudo mais recente indica produto danificado (Regular/Ruim/Pessimo) -- produto em boa
// condicao (Perfeito/Bom) volta pro estoque e o custo NAO conta como prejuizo.
// Comissao ML e Frete Envio ficam guardados so como registro/conferencia (o Mercado Livre
// cancela os dois em qualquer devolucao) -- NAO entram na conta do resultado. Frete Devolucao
// e Custo de Componentes (comprados pra completar um pedido que chegou incompleto) sao custos
// reais e sempre contam, independente da condicao do produto.
const SCHEMA_VIEW = `
DROP VIEW IF EXISTS pedidos_calc;
CREATE VIEW pedidos_calc AS
WITH laudo_recente AS (
  SELECT numero_pedido, condicao_geral,
         ROW_NUMBER() OVER (PARTITION BY numero_pedido ORDER BY id DESC) AS rn
  FROM laudos
)
SELECT
  p.*,
  CASE
    WHEN lr.condicao_geral IN ('Perfeito - como novo', 'Bom') THEN 'bom'
    WHEN lr.condicao_geral IN ('Regular', 'Ruim', 'Péssimo - não funciona') THEN 'danificado'
    ELSE 'desconhecido'
  END AS categoria_condicao,
  CASE WHEN COALESCE(p.reembolso_ml, 0) > 0 THEN 1 ELSE 0 END AS reembolsado,
  ROUND(
    COALESCE(p.reembolso_ml, 0)
    - CASE WHEN lr.condicao_geral IN ('Perfeito - como novo', 'Bom') THEN 0 ELSE COALESCE(p.custo_produto, 0) END
    - COALESCE(p.frete_devolucao, 0)
    - COALESCE(p.custo_componentes, 0)
  , 2) AS resultado_financeiro
FROM pedidos p
LEFT JOIN laudo_recente lr ON lr.numero_pedido = p.numero_pedido AND lr.rn = 1;
`;

// Colunas novas em banco que ja existia antes delas (local ou Turso ja criados sem a coluna).
// CREATE TABLE IF NOT EXISTS nao adiciona coluna em tabela existente, entao migra na mao aqui.
async function migrarColunasNovas() {
  try {
    await db.execute('ALTER TABLE pedidos ADD COLUMN custo_componentes REAL');
  } catch (err) {
    if (!/duplicate column/i.test(err.message)) throw err;
  }
}

async function initSchema() {
  await db.executeMultiple(SCHEMA_TABELAS);
  await migrarColunasNovas();
  await db.executeMultiple(SCHEMA_VIEW);
}

module.exports = { db, initSchema };
