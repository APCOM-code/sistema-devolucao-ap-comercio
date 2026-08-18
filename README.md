# Sistema de Controle de Devoluções — AP Comércio

Sistema web que substitui a planilha de triagem de devolução. Hospedado gratuitamente na nuvem
(Render + Turso), acessível de qualquer lugar, sem depender de nenhum computador ligado.

## Acesse aqui

**https://sistema-devolucao-ap-comercio.onrender.com**

Funciona em qualquer computador, tablet ou celular com internet — não precisa estar na rede da
loja. Por ser um plano gratuito, se ninguém acessar por 15 minutos o site "dorme"; o primeiro
acesso depois disso demora uns 30-50 segundos pra "acordar" — depois disso fica rápido normal.

## As 5 telas

- **Dashboard** — números gerais: total de reclamações, em andamento/encerrados, reembolso
  recebido, custos, resultado positivo/negativo e saldo líquido total, além do resultado por
  destinação (Reembalar, Assistência técnica, Saldão parceiro etc.).
- **Registro Central** — cadastro principal de cada devolução. Preencha aqui primeiro.
- **Laudo** — inspeção física do produto devolvido. Digite o Nº do Pedido e os dados do
  Registro Central (plataforma, SKU etc.) aparecem automaticamente.
- **Recurso** — acompanhamento do recurso/contestação aberto na plataforma (Mercado Livre).
- **Saldão Parceiro** — produtos enviados para o parceiro de saldão.

## Onde ficam os dados

O banco de dados fica no **Turso** (banco na nuvem, separado do site), então os dados
sobrevivem mesmo que o site reinicie ou saia do ar temporariamente. Pra fazer backup manual,
entre no painel do Turso (app.turso.tech) → seu banco → **Export Database** → baixa um arquivo
`.sqlite` com tudo.

## Atualizando o código (se precisar mexer em algo no futuro)

O código está em `https://github.com/APCOM-code/sistema-devolucao-ap-comercio`. Toda vez que o
código lá for atualizado, entre no painel do Render → o serviço → **Manual Deploy** → **Deploy
latest commit** (esse projeto usa deploy manual, não automático, porque foi conectado via
"Public Git Repository").

## Sincronizar uma planilha atualizada

Se um dia vocês exportarem a planilha do Google Sheets como `.xlsx` de novo e quiserem trazer
pedidos novos/atualizados pro sistema, isso é feito localmente (não pelo site):

1. Coloque o arquivo baixado em qualquer pasta.
2. Rode `node server/import/parse_xlsx.js "caminho\para\o\arquivo.xlsx"`.
3. Rode `node server/import/sync_from_xlsx.js`.

O script só atualiza campos que mudaram (nunca deixa uma célula vazia apagar um dado que já
existia) e avisa sobre datas ou valores suspeitos antes de aplicar qualquer coisa. Isso precisa
rodar num computador com as variáveis `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN` configuradas
(peça pra quem fez a configuração original, se precisar).

## Rodar localmente (modo offline, alternativa)

Se algum dia quiser rodar sem depender da nuvem (ex: testar algo sem afetar os dados reais):

1. Copie esta pasta para um computador com Node.js instalado (ou use a versão portátil em
   `%LOCALAPPDATA%\nodejs-portable\`, se disponível).
2. Rode `npm install` e depois `npm start` (ou dê dois cliques em `iniciar.bat`).
3. Sem as variáveis `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN` configuradas, o sistema cria
   automaticamente um arquivo local `devolucoes.db` — **isso é um banco separado**, vazio,
   não é o mesmo dos dados reais na nuvem.
4. Acesse em `http://localhost:3000`.

## Histórico importado

Todo o histórico da planilha original foi importado e depois atualizado: 176 pedidos, 171
laudos, 168 recursos, 2 registros de saldão (situação em 17/08/2026). Durante as importações
foram identificados e tratados sem perda de dados:

- **Registros "órfãos"**: Laudo/Recurso/Saldão que citam um Nº de Pedido sem registro
  correspondente no Registro Central. Ficam marcados com a tag **"órfão"** nas listagens e
  contados no aviso do Dashboard.
- **Um Nº de Pedido duplicado** (`2000013579181909`) com dois registros diferentes no Registro
  Central original — os dois foram mantidos.
- Datas com erro de digitação na planilha (ex: ano digitado errado) foram deixadas em branco em
  vez de importadas erradas — dá pra corrigir na tela do sistema quando quiser.
