@echo off
setlocal
set NODE_DIR=%LOCALAPPDATA%\nodejs-portable\node-v22.14.0-win-x64
set PATH=%NODE_DIR%;%PATH%
cd /d "%~dp0"

if not exist node_modules (
  echo Instalando dependencias pela primeira vez, aguarde...
  call npm install
)

if not exist devolucoes.db (
  echo Criando banco de dados e importando historico da planilha...
  call npm run import
)

echo.
echo ==============================================
echo   Sistema de Devolucao - AP Comercio
echo   Acesse neste computador em: http://localhost:3000
echo.
echo   Para acessar de outro computador/celular na
echo   mesma rede Wi-Fi/cabo, rode "ipconfig" neste PC,
echo   pegue o "Endereco IPv4" e acesse:
echo   http://SEU-IP-AQUI:3000
echo.
echo   Para PARAR o sistema, feche esta janela.
echo ==============================================
echo.
call npm start
pause
