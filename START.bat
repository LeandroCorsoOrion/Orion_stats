@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 > nul

echo ==========================================
echo   INICIANDO ORION STATS
echo ==========================================
echo.

REM Configuracao de portas (padroes)
if not defined BACKEND_PORT set "BACKEND_PORT=8055"
if not defined FRONTEND_PORT set "FRONTEND_PORT=5555"

call :EnsurePort BACKEND_PORT "Backend" 8055 8065
if errorlevel 1 goto :EOF
call :EnsurePort FRONTEND_PORT "Frontend" 5555 5565
if errorlevel 1 goto :EOF

set "BACKEND_URL=http://localhost:%BACKEND_PORT%"
set "FRONTEND_URL=http://localhost:%FRONTEND_PORT%"

REM ==========================================
REM   BACKEND SETUP
REM ==========================================
echo [BACKEND] Verificando ambiente...

if not exist "backend\.venv\Scripts\python.exe" (
    echo [BACKEND] Criando ambiente virtual...
    python -m venv backend\.venv
    if errorlevel 1 (
        echo [ERRO] Falha ao criar o venv do backend.
        pause
        goto :EOF
    )
    echo [BACKEND] Instalando dependencias...
    call backend\.venv\Scripts\pip install -r backend\requirements.txt
    if errorlevel 1 (
        echo [ERRO] Falha ao instalar dependencias do backend.
        pause
        goto :EOF
    )
) else (
    echo [BACKEND] Ambiente virtual OK.
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

REM ==========================================
REM   FRONTEND SETUP
REM ==========================================
echo [FRONTEND] Verificando dependencias...

if not exist "frontend\node_modules\" (
    echo [FRONTEND] Instalando dependencias ^(npm install^)...
    cd frontend
    call npm install
    cd ..
    if errorlevel 1 (
        echo [ERRO] Falha ao instalar dependencias do frontend.
        pause
        goto :EOF
    )
) else (
    echo [FRONTEND] node_modules OK.
)

echo.
echo ==========================================
echo   ABRINDO TERMINAIS...
echo ==========================================

REM Launch Backend
start "ORION STATS - Backend" cmd /k "cd /d %~dp0backend && .venv\Scripts\python -m uvicorn app.main:app --reload --host 127.0.0.1 --port %BACKEND_PORT%"

REM Aguardar backend iniciar
echo [INFO] Aguardando backend iniciar...
timeout /t 3 /nobreak > nul

REM Launch Frontend
start "ORION STATS - Frontend" cmd /k "cd /d %~dp0frontend && set VITE_API_URL=%BACKEND_URL% && npm run dev -- --port %FRONTEND_PORT% --strictPort"

echo.
echo ==========================================
echo   ORION STATS EM EXECUCAO!
echo ==========================================
echo.
echo   Backend API : %BACKEND_URL%
echo   Swagger Docs: %BACKEND_URL%/docs
echo   Frontend    : %FRONTEND_URL%
echo.
echo ==========================================
echo   Pressione qualquer tecla para fechar
echo   (os terminais continuarao rodando)
echo ==========================================
pause > nul
goto :EOF

REM =========================
REM Funcoes auxiliares
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
pause
exit /b 1
