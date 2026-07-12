@echo off
title Conectare folder la GitHub (rulare o singura data)
cd /d "%~dp0"

echo === Curat resturi vechi (daca exista) ===
if exist ".git\config.lock" del /f ".git\config.lock"
if exist ".git" rmdir /s /q ".git"

echo === Initializez git si conectez la GitHub ===
git init -b main
git config core.longpaths true
git config user.name "rixair-ro"
git config user.email "andreioprescu2017@gmail.com"
git remote add origin https://github.com/rixair-ro/rixair-site.git

echo === Descarc istoricul din GitHub (fisierele tale locale raman neatinse) ===
git fetch origin main
if errorlevel 1 goto :err
git reset --mixed origin/main

echo === Trimit modificarile locale pe GitHub ===
git add -A
git commit -m "actualizare site (design v51, imagini locale, 404, meta)"
git push -u origin main
if errorlevel 1 goto :err

echo.
echo GATA! Folderul e conectat. De acum folosesti PUBLICA.bat ca de obicei.
pause
exit /b

:err
echo.
echo A aparut o eroare (probabil autentificarea GitHub - urmareste fereastra de login).
echo Ruleaza scriptul din nou dupa ce te-ai logat.
pause
