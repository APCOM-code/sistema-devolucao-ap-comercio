const path = require('path');
const express = require('express');
const { initSchema } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/pedidos', require('./routes/pedidos'));
app.use('/api/laudos', require('./routes/laudos'));
app.use('/api/recursos', require('./routes/recursos'));
app.use('/api/saldao', require('./routes/saldao'));
app.use('/api/responsaveis', require('./routes/responsaveis'));
app.use('/api/dashboard', require('./routes/dashboard'));

initSchema()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Sistema de Devolucao rodando em http://localhost:${PORT}`);
      console.log('Para acessar de outro computador na mesma rede, use o IP deste PC (veja README.md).');
    });
  })
  .catch((err) => {
    console.error('Erro ao iniciar o banco de dados:', err);
    process.exit(1);
  });
