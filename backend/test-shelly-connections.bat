@echo off
chcp 65001 >nul
echo ======================================
echo   Testiranje Shelly Plug S utičnica
echo ======================================
echo.

REM IP adrese utičnica
set LOW_IP=192.168.1.166
set MEDIUM_IP=192.168.1.71
set HIGH_IP=192.168.1.244

echo 1. UTIČNICA NISKE POTROŠNJE (%LOW_IP%)
ping -n 1 -w 2000 %LOW_IP% >nul
if %errorlevel% equ 0 (
    echo [OK] Ping uspješan
    echo Testiram API...
    curl -s http://%LOW_IP%/rpc/Shelly.GetStatus
    echo.
) else (
    echo [GREŠKA] Ping neuspješan - uređaj nije dostupan
)
echo.

echo 2. UTIČNICA SREDNJE POTROŠNJE (%MEDIUM_IP%)
ping -n 1 -w 2000 %MEDIUM_IP% >nul
if %errorlevel% equ 0 (
    echo [OK] Ping uspješan
    echo Testiram API...
    curl -s http://%MEDIUM_IP%/rpc/Shelly.GetStatus
    echo.
) else (
    echo [GREŠKA] Ping neuspješan - uređaj nije dostupan
)
echo.

echo 3. UTIČNICA VISOKE POTROŠNJE (%HIGH_IP%)
ping -n 1 -w 2000 %HIGH_IP% >nul
if %errorlevel% equ 0 (
    echo [OK] Ping uspješan
    echo Testiram API...
    curl -s http://%HIGH_IP%/rpc/Shelly.GetStatus
    echo.
) else (
    echo [GREŠKA] Ping neuspješan - uređaj nije dostupan
)
echo.

echo ======================================
echo   Test završen!
echo ======================================
echo.
echo Ako su svi testovi prošli, pogledajte TEST_SETUP.md
echo za detaljne upute o kreiranju uređaja i prikupljanju podataka.
echo.
pause
