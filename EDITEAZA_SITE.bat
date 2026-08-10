@echo off
title Editor site RIXAIR (local)
cd /d "%~dp0"
echo Pornesc editorul local... se deschide browserul imediat.
echo Cand termini de editat: inchide aceasta fereastra, apoi ruleaza PUBLICA.bat.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0editor_server.ps1"
pause
