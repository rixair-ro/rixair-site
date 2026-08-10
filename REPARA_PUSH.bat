@echo off
title Reparare push (combina modificarile de pe GitHub cu cele locale)
cd /d "%~dp0"

echo === Ce exista pe GitHub si nu e local: ===
git fetch origin
git log --oneline main..origin/main
echo.

echo === Combin modificarile (la conflict au prioritate cele locale) ===
git pull --no-rebase --no-edit -X ours origin main
if errorlevel 1 goto :err

echo === Trimit totul pe GitHub ===
git push
if errorlevel 1 goto :err

echo.
echo GATA! Publicat cu succes. Site-ul se actualizeaza in ~1 minut.
pause
exit /b

:err
echo.
echo A aparut o problema - trimite un screenshot cu acest ecran.
pause
