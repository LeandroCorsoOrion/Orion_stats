@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 > nul

cd /d "%~dp0"

echo ==========================================
echo   INICIANDO ORION ANALYTICS
echo ==========================================
echo.

REM Configuracao de portas (padroes)
if not defined BACKEND_PORT set "BACKEND_PORT=8055"
if not defined FRONTEND_PORT set "FRONTEND_PORT=5555"

call :EnsurePort BACKEND_PORT "Backend" 8055 8065
if errorlevel 1 goto :FAIL
call :EnsurePort FRONTEND_PORT "Frontend" 5555 5565
if errorlevel 1 goto :FAIL

set "BACKEND_URL=http://localhost:%BACKEND_PORT%"
set "FRONTEND_URL=http://localhost:%FRONTEND_PORT%"

call :EnsurePrereqs
if errorlevel 1 goto :FAIL

call :SetupBackend
if errorlevel 1 goto :FAIL

call :SetupFrontend
if errorlevel 1 goto :FAIL

if /i "%ORION_SKIP_LAUNCH%"=="1" (
    echo.
    echo [INFO] ORION_SKIP_LAUNCH=1 - setup concluido sem abrir terminais.
    goto :SUCCESS
)

call :LaunchServices
if errorlevel 1 goto :FAIL

goto :SUCCESS

:EnsurePrereqs
echo [SETUP] Verificando Python...
call :EnsurePython
if errorlevel 1 exit /b 1

echo [SETUP] Verificando Node.js/npm...
call :EnsureNode
if errorlevel 1 exit /b 1

echo [SETUP] Versoes detectadas:
call :RunPython --version
call node -v
if errorlevel 1 exit /b 1
call npm.cmd -v
if errorlevel 1 exit /b 1
echo.
exit /b 0

:SetupBackend
echo [BACKEND] Verificando ambiente...

if not exist "backend\" (
    echo [ERRO] Pasta "backend" nao encontrada.
    exit /b 1
)

if not exist "backend\.venv\Scripts\python.exe" (
    echo [BACKEND] Criando ambiente virtual...
    call :RunPython -m venv backend\.venv
    if errorlevel 1 (
        echo [ERRO] Falha ao criar o venv do backend.
        exit /b 1
    )
)

echo [BACKEND] Atualizando pip...
call backend\.venv\Scripts\python.exe -m pip install --upgrade pip >nul

echo [BACKEND] Instalando/atualizando dependencias...
call backend\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
if errorlevel 1 (
    echo [ERRO] Falha ao instalar dependencias do backend.
    exit /b 1
)

REM Criar .env se nao existir
if not exist "backend\.env" (
    if exist "backend\.env.example" (
        echo [BACKEND] Criando arquivo .env...
        copy backend\.env.example backend\.env > nul
    ) else (
        echo [BACKEND] Criando .env padrao...
        (
            echo DEBUG=true
            echo HOST=0.0.0.0
            echo PORT=%BACKEND_PORT%
            echo CORS_ORIGINS=["http://localhost:%FRONTEND_PORT%","http://localhost:3000"]
        ) > backend\.env
    )
)

REM Criar diretorios de dados/modelos
if not exist "backend\data" mkdir backend\data
if not exist "backend\models" mkdir backend\models

exit /b 0

:SetupFrontend
echo [FRONTEND] Verificando dependencias...

if not exist "frontend\" (
    echo [ERRO] Pasta "frontend" nao encontrada.
    exit /b 1
)

pushd frontend
if exist "package-lock.json" (
    if exist "node_modules\" (
        echo [FRONTEND] Atualizando dependencias ^(npm install^)...
        call npm.cmd install
    ) else (
        echo [FRONTEND] Instalando dependencias limpas ^(npm ci^)...
        call npm.cmd ci
    )
) else (
    echo [FRONTEND] package-lock nao encontrado. Executando npm install...
    call npm.cmd install
)
set "NPM_EXIT=%ERRORLEVEL%"
popd

if not "%NPM_EXIT%"=="0" (
    echo [ERRO] Falha ao preparar dependencias do frontend.
    exit /b 1
)

exit /b 0

:LaunchServices
echo.
echo ==========================================
echo   ABRINDO TERMINAIS...
echo ==========================================

REM Launch Backend
start "ORION ANALYTICS - Backend" cmd /k "cd /d %~dp0backend && .venv\Scripts\python -m uvicorn app.main:app --reload --host 127.0.0.1 --port %BACKEND_PORT%"

REM Aguardar backend iniciar
echo [INFO] Aguardando backend iniciar...
timeout /t 3 /nobreak > nul

REM Launch Frontend
start "ORION ANALYTICS - Frontend" cmd /k "cd /d %~dp0frontend && set VITE_API_URL=%BACKEND_URL% && npm.cmd run dev -- --port %FRONTEND_PORT% --strictPort"

exit /b 0

:EnsurePython
call :FindPython
if not errorlevel 1 exit /b 0

echo [WARN] Python nao encontrado.
call :FindWinget
if errorlevel 1 (
    echo [ERRO] Winget nao encontrado para instalar Python automaticamente.
    echo [AJUDA] Instale Python 3.11+ e execute novamente.
    exit /b 1
)

echo [SETUP] Instalando Python 3.11 via winget...
winget install -e --id Python.Python.3.11 --scope user --accept-package-agreements --accept-source-agreements
if errorlevel 1 (
    echo [ERRO] Falha na instalacao automatica do Python.
    exit /b 1
)

call :FindPython
if errorlevel 1 (
    echo [ERRO] Python instalado, mas ainda nao encontrado no PATH desta sessao.
    echo [AJUDA] Feche e abra o terminal e rode START.bat novamente.
    exit /b 1
)

exit /b 0

:FindPython
set "PYTHON_BIN="
set "PYTHON_MODE="

where py >nul 2>nul
if not errorlevel 1 (
    py -3.11 --version >nul 2>nul
    if not errorlevel 1 (
        set "PYTHON_BIN=py"
        set "PYTHON_MODE=py311"
        goto :PY_FOUND
    )
)

for /f "delims=" %%p in ('where python 2^>nul') do (
    "%%p" --version >nul 2>nul
    if not errorlevel 1 (
        set "PYTHON_BIN=%%p"
        set "PYTHON_MODE=python"
        goto :PY_FOUND
    )
)

where py >nul 2>nul
if not errorlevel 1 (
    py -3 --version >nul 2>nul
    if not errorlevel 1 (
        set "PYTHON_BIN=py"
        set "PYTHON_MODE=py3"
        goto :PY_FOUND
    )
)

exit /b 1

:PY_FOUND
exit /b 0

:RunPython
if /i "%PYTHON_MODE%"=="py311" (
    py -3.11 %*
    exit /b %ERRORLEVEL%
)

if /i "%PYTHON_MODE%"=="py3" (
    py -3 %*
    exit /b %ERRORLEVEL%
)

"%PYTHON_BIN%" %*
exit /b %ERRORLEVEL%

:EnsureNode
call :AddNodeToPathFromKnownInstall
call :FindNodeNpm
if not errorlevel 1 exit /b 0

echo [WARN] Node.js/npm nao encontrados.
call :FindWinget
if errorlevel 1 (
    echo [ERRO] Winget nao encontrado para instalar Node.js automaticamente.
    echo [AJUDA] Instale Node.js LTS e execute novamente.
    exit /b 1
)

echo [SETUP] Instalando Node.js LTS via winget...
winget install -e --id OpenJS.NodeJS.LTS --scope user --accept-package-agreements --accept-source-agreements
if errorlevel 1 (
    echo [ERRO] Falha na instalacao automatica do Node.js.
    exit /b 1
)

call :AddNodeToPathFromKnownInstall
call :FindNodeNpm
if errorlevel 1 (
    echo [ERRO] Node.js foi instalado, mas nao foi encontrado no PATH desta sessao.
    echo [AJUDA] Feche e abra o terminal e rode START.bat novamente.
    exit /b 1
)

exit /b 0

:FindNodeNpm
where node >nul 2>nul
if errorlevel 1 exit /b 1
where npm.cmd >nul 2>nul
if errorlevel 1 exit /b 1
exit /b 0

:AddNodeToPathFromKnownInstall
if exist "%ProgramFiles%\nodejs\node.exe" (
    call :PrependPath "%ProgramFiles%\nodejs"
)

for /d %%d in ("%LOCALAPPDATA%\Microsoft\WinGet\Packages\OpenJS.NodeJS.LTS_*") do (
    for /d %%n in ("%%~fd\node-v*-win-x64") do (
        if exist "%%~fN\node.exe" (
            call :PrependPath "%%~fN"
        )
    )
)

exit /b 0

:PrependPath
set "CANDIDATE=%~1"
if "%CANDIDATE%"=="" exit /b 0
if not exist "%CANDIDATE%" exit /b 0

echo %PATH% | find /I "%CANDIDATE%" >nul
if not errorlevel 1 exit /b 0

set "PATH=%CANDIDATE%;%PATH%"
exit /b 0

:FindWinget
where winget >nul 2>nul
if errorlevel 1 exit /b 1
exit /b 0

:SUCCESS
echo.
echo ==========================================
echo   ORION ANALYTICS PRONTO
echo ==========================================
echo.
echo   Backend API : %BACKEND_URL%
echo   Swagger Docs: %BACKEND_URL%/docs
echo   Frontend    : %FRONTEND_URL%
echo.

if /i not "%ORION_SKIP_LAUNCH%"=="1" (
    echo ==========================================
    echo   Pressione qualquer tecla para fechar
    echo   (os terminais continuarao rodando)
    echo ==========================================
    if /i not "%ORION_NO_PAUSE%"=="1" pause > nul
)

exit /b 0

:FAIL
echo.
echo ==========================================
echo   FALHA AO INICIAR ORION ANALYTICS
echo ==========================================
if /i not "%ORION_NO_PAUSE%"=="1" pause
exit /b 1

REM =========================
REM Funcoes auxiliares de porta
REM =========================
:IsPortFree
set "PORT_FREE=1"
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":%1 " ^| findstr "LISTENING"') do (
    set "PORT_FREE=0"
)
exit /b 0

:EnsurePort
set "VAR=%~1"
set "LABEL=%~2"
set "START=%~3"
set "END=%~4"
set "PORT=!%VAR%!"
call :IsPortFree !PORT!
if "!PORT_FREE!"=="1" (
    echo [OK] Porta !PORT! livre para %LABEL%.
    exit /b 0
)

echo [WARN] Porta !PORT! (%LABEL%) ocupada.
if exist "kill_ports.bat" (
    echo [INFO] Executando kill_ports.bat...
    call kill_ports.bat
    call :IsPortFree !PORT!
    if "!PORT_FREE!"=="1" (
        echo [OK] Porta !PORT! liberada para %LABEL%.
        exit /b 0
    )
)

echo [INFO] Buscando proxima porta livre para %LABEL%...
for /l %%p in (!START!,1,!END!) do (
    call :IsPortFree %%p
    if "!PORT_FREE!"=="1" (
        set "%VAR%=%%p"
        echo [OK] Usando porta %%p para %LABEL%.
        exit /b 0
    )
)

echo [ERRO] Nenhuma porta livre encontrada entre !START! e !END! para %LABEL%.
exit /b 1
