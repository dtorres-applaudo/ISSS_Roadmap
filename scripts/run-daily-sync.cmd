@echo off
REM Ejecutado a diario por la tarea programada de Windows "ISSS-SYDT-AvanceProducto-Sync".
REM Corre el sync con --write (sin revisión manual) y deja el log en
REM scripts\sync-avance-producto.log para revisar si algo falló.
cd /d "%~dp0.."
echo ==== %date% %time% ==== >> "scripts\sync-avance-producto.log"
node --env-file=google_sheets_token.env scripts\sync-avance-producto.js --write >> "scripts\sync-avance-producto.log" 2>&1
echo. >> "scripts\sync-avance-producto.log"
