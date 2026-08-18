# Sistema de Controle de Devoluções — AP Comércio

Sistema web que substitui a planilha de triagem de devolução. Hospedado gratuitamente na nuvem
(Render + Turso), acessível de qualquer lugar, sem depender de nenhum computador ligado.

## Acesse aqui

**https://sistema-devolucao-ap-comercio.onrender.com**

Funciona em qualquer computador, tablet ou celular com internet — não precisa estar na rede da
loja. Por ser um plano gratuito, se ninguém acessar por 15 minutos o site "dorme"; o primeiro
acesso depois disso demora uns 30-50 segundos pra "acordar" — depois disso fica rápido normal.

## As 7 telas

- **Dashboard** — a tela inicial. Mostra primeiro o que precisa de ação hoje (**Pendências**:
  recursos parados há 7+ dias, pedidos sem movimento recente), depois **Prejuízo Real ×
  Ganho Compensatório** (ver seção "Como o dinheiro é calculado" abaixo), números operacionais
  e o resultado por cenário/destinação.
- **Registro Central** — cadastro principal de cada devolução. Preencha aqui primeiro. O Nº do
  Pedido é clicável e leva direto pro **Caso**.
- **Laudo** — inspeção física do produto devolvido.
- **Recurso** — acompanhamento do recurso/contestação aberto na plataforma (Mercado Livre).
- **Saldão Parceiro** — produtos enviados para o parceiro de saldão.
- **Caso** — busca por Nº de Pedido e mostra Registro Central + Laudo + Recurso + Saldão de um
  mesmo pedido numa página só, cada bloco salva sozinho. É o jeito mais rápido de resolver um
  caso do início ao fim sem ficar trocando de aba.
- **Importar Planilha** — sobe um `.xlsx` baixado do Google Sheets direto pelo navegador (sem
  terminal). Mostra quanto vai mudar antes de aplicar.

## Filtro por período e exportar Excel

Registro Central, Laudo, Recurso e Saldão têm filtro **De / Até** por data, e um botão
**Exportar Excel** que baixa exatamente o que está filtrado na tela. Isso é pensado pra
acompanhar meta por funcionário: filtra por período (e por Responsável, no Registro Central) e
exporta pra conferir depois.

A data usada em todo esse filtro é a **Data de Abertura do Recurso** (preenchida na aba
Recurso — o dia em que o funcionário abriu a mediação/contestação daquela devolução), não a
data antiga de "quando a devolução foi feita". O Registro Central mostra essa data (coluna
"Abertura Recurso") em vez de pedir uma data própria — um pedido só aparece com data depois que
um recurso for aberto pra ele na aba Recurso.

O Dashboard também tem filtro de período no topo, que recalcula todos os números pro intervalo
escolhido. **Todo número do Dashboard é clicável** — clicar leva direto pro Registro Central já
filtrado com a lista de pedidos por trás daquele número (ex: clicar em "Prejuízo Real" mostra só
os pedidos que compõem aquele prejuízo).

## Como o dinheiro é calculado

Três valores contam de verdade no resultado de cada pedido: **Custo do Produto** (só quando o
produto está danificado — Laudo com condição Regular/Ruim/Péssimo), **Frete Devolução** (só
quando é cobrado) e **Custo de Componentes Comprados** (quando o produto chegou faltando algo —
ver Registro Central/Caso — preenchido depois da compra da peça que faltava). **Comissão ML e
Frete Envio ficam de fora do cálculo** — o Mercado Livre sempre cancela os dois em qualquer
devolução, então preencher esses campos é só pra conferência/histórico, não representa dinheiro
perdido de verdade. Produto que volta bom não é perda — o custo do produto se recupera numa
venda futura. Por isso cada pedido cai num destes 4 cenários (mais um "sem laudo" quando ainda
não foi avaliado):

| Cenário | Produto | Reembolso ML | O que significa |
|---|---|---|---|
| Perda total | Danificado | Não | Prejuízo real — dinheiro que não volta |
| Recuperado no descarte | Danificado | Sim | Reembolso cobre o descarte, sem prejuízo |
| Ganho duplo | Bom | Sim | Reembolso + produto volta pra vender de novo |
| Neutro | Bom | Não | Sem perda — custo recuperado na próxima venda |

O Dashboard mostra **Prejuízo Real** (soma só da "Perda total") e **Ganho Compensatório** (soma
só do "Ganho duplo"), e quanto um cobre o outro em %.

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

Pela própria tela: **Importar Planilha** → escolher o `.xlsx` baixado do Google Sheets →
**Analisar planilha** (mostra quantos registros são novos, atualizados, ou ambíguos e precisam
de revisão manual, mais avisos de datas suspeitas) → **Confirmar Importação**.

O casamento é feito pelo Nº do Pedido (não pela posição na planilha), e uma célula vazia nunca
apaga um dado que já existia no sistema — só atualiza o que realmente veio preenchido de novo.
Pedidos com mais de um registro igual no sistema são pulados automaticamente por segurança
(ficam listados pra revisão manual).

Isso substitui os scripts de terminal usados na importação inicial (`parse_xlsx.js` +
`sync_from_xlsx.js`, que continuam existindo em `server/import/` só como alternativa local, caso
precise depurar algo).

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
  Central original — os dois foram mantidos, e a tela de Caso deixa escolher qual editar.
- Datas com erro de digitação na planilha (ex: ano digitado errado) foram deixadas em branco em
  vez de importadas erradas — dá pra corrigir na tela do sistema quando quiser.
