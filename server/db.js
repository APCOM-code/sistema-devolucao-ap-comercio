const path = require('path');
const { createClient } = require('@libsql/client');

// Se TURSO_DATABASE_URL estiver definida, conecta no banco na nuvem (Turso).
// Senao, usa um arquivo SQLite local (mesmo motor, o cliente libsql fala os dois).
const url = process.env.TURSO_DATABASE_URL || `file:${path.join(__dirname, '..', 'devolucoes.db')}`;
const authToken = process.env.TURSO_AUTH_TOKEN;

const db = createClient(authToken ? { url, authToken } : { url });

const SCHEMA = `
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

async function initSchema() {
  await db.executeMultiple(SCHEMA);
}

module.exports = { db, initSchema };
