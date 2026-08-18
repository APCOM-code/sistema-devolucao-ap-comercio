# Sistema de Controle de Devoluções — AP Comércio

Sistema local (web) que substitui a planilha de triagem de devolução. Roda neste computador
("servidor") e pode ser acessado por outros computadores/celulares na mesma rede local, sem
custo de hospedagem.

## Como iniciar

1. Dê **dois cliques** em `iniciar.bat` nesta pasta.
   - Na primeira vez, ele instala as dependências e importa o histórico da planilha
     automaticamente (pode levar um minuto).
   - Nas próximas vezes, ele só sobe o sistema.
2. Deixe essa janela preta aberta — é o servidor rodando. Fechar a janela desliga o sistema.
3. Acesse no navegador: **http://localhost:3000**

## Acessar de outro computador/celular na mesma rede

No computador que está rodando o `iniciar.bat`, abra o Prompt de Comando e digite `ipconfig`.
Procure o "Endereço IPv4" (algo como `192.168.0.15`). Nos outros dispositivos (mesma rede
Wi-Fi/cabo), acesse pelo navegador:

```
http://192.168.0.15:3000
```

(troque pelo IP real do computador-servidor)

## As 5 telas

- **Dashboard** — números gerais: total de reclamações, em andamento/encerrados, reembolso
  recebido, custos, resultado positivo/negativo e saldo líquido total, além do resultado por
  destinação (Reembalar, Assistência técnica, Saldão parceiro etc.).
- **Registro Central** — cadastro principal de cada devolução. Preencha aqui primeiro.
- **Laudo** — inspeção física do produto devolvido. Digite o Nº do Pedido e os dados do
  Registro Central (plataforma, SKU etc.) aparecem automaticamente.
- **Recurso** — acompanhamento do recurso/contestação aberto na plataforma (Mercado Livre).
- **Saldão Parceiro** — produtos enviados para o parceiro de saldão.

## Sobre o histórico importado

Todo o histórico da planilha original foi importado (110 pedidos, 154 laudos, 151 recursos,
2 registros de saldão). Durante a importação foram identificados:

- **Registros "órfãos"**: alguns Laudos/Recursos/Saldão citam um Nº de Pedido que nunca foi
  cadastrado no Registro Central (aconteceu na própria planilha original). Esses registros
  aparecem marcados com a tag **"órfão"** nas listagens e são contados no aviso do Dashboard —
  nada foi apagado, só sinalizado para vocês completarem o Registro Central quando quiserem.
- **Um Nº de Pedido duplicado** (`2000013579181909`) tinha dois registros completamente
  diferentes no Registro Central original — os dois foram mantidos.

## Backup dos dados

Todos os dados ficam em um único arquivo: `devolucoes.db` (nesta pasta). Para fazer backup,
basta copiar esse arquivo (com o sistema fechado, para evitar copiar no meio de uma escrita).
Recomendado copiar semanalmente para um pendrive ou nuvem (Google Drive, OneDrive etc.).

## Requisitos técnicos

- Node.js já vem instalado numa versão portátil em
  `%LOCALAPPDATA%\nodejs-portable\` — não precisa instalar nada a mais.
- Se quiser rodar em outro computador como servidor, instale o Node.js LTS
  (https://nodejs.org) nele e copie esta pasta inteira para lá.
