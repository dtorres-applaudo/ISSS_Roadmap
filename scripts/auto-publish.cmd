@echo off
REM Rutina de publicacion automatica - ISSS-SYDT "Avance de Producto".
REM Ejecutada por la tarea programada de Windows "ISSS-SYDT-AvanceProducto-Sync"
REM cada 2 horas, 7:00-21:00. Sincroniza avance_tramite/datos_hu del Sheet y,
REM SOLO si el JSON resultante cambio de verdad respecto al ultimo commit,
REM hace commit + push + firebase deploy sin pedir aprobacion (a pedido de
REM Dario, 2026-09-16 - antes esto requeria pedirlo cada vez).
REM
REM NOTA: este archivo debe guardarse en ASCII puro (sin tildes/enes ni
REM guiones largos) porque cmd.exe rompe el parseo de batch con UTF-8.
REM
REM Log completo (cada corrida, cambie algo o no) en scripts\sync-avance-producto.log.
REM Si algo falla (guarda de seguridad del sync, push o deploy), NO se
REM publica nada a medias: se corta ahi y se registra el motivo en el log.

setlocal
cd /d "%~dp0.."

set "LOG=scripts\sync-avance-producto.log"
set "GIT=C:\Users\DarioTorres\AppData\Local\Programs\Git\cmd\git.exe"
set "FIREBASE=C:\Users\DarioTorres\AppData\Roaming\npm\firebase.cmd"
set "NODE=C:\Program Files\nodejs\node.exe"

echo ==== %date% %time% ==== >> "%LOG%"

"%NODE%" --env-file=google_sheets_token.env scripts\sync-avance-producto.js --write >> "%LOG%" 2>&1
if errorlevel 1 (
  echo [auto-publish] El sync fallo o la guarda de seguridad bloqueo el escrito - no se publica nada. >> "%LOG%"
  echo. >> "%LOG%"
  exit /b 1
)

"%GIT%" diff --quiet -- public\data\avance_producto.json
if %errorlevel%==0 (
  echo [auto-publish] avance_producto.json sin cambios - nada que publicar. >> "%LOG%"
  echo. >> "%LOG%"
  exit /b 0
)

echo [auto-publish] Cambios detectados en avance_producto.json - publicando... >> "%LOG%"
"%GIT%" add public\data\avance_producto.json >> "%LOG%" 2>&1
"%GIT%" commit -m "Auto-sync avance_producto.json (%date% %time%)" >> "%LOG%" 2>&1
"%GIT%" push >> "%LOG%" 2>&1
if errorlevel 1 (
  echo [auto-publish] ERROR: git push fallo - revisar autenticacion de Git Credential Manager, puede requerir volver a iniciar sesion. >> "%LOG%"
  echo. >> "%LOG%"
  exit /b 1
)

"%FIREBASE%" deploy --only hosting >> "%LOG%" 2>&1
if errorlevel 1 (
  echo [auto-publish] ERROR: firebase deploy fallo - revisar sesion de 'firebase login'. El commit y push ya quedaron hechos. >> "%LOG%"
  echo. >> "%LOG%"
  exit /b 1
)

echo [auto-publish] Publicado con exito (commit + push + deploy). >> "%LOG%"
echo. >> "%LOG%"
