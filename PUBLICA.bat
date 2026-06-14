@echo off
title Publicare site RIXAIR
cd /d "%~dp0"
git config core.longpaths true
git add -A
git commit -m "actualizare produse"
git push
echo.
echo Publicat! Site-ul se actualizeaza in ~1 minut.
pause
