@echo off
REM Lam Soon old-site archive - one-click run (Windows)
REM   run.bat              -> crawl MY + TH-EN + TH-TH
REM   run.bat my           -> Malaysia only
REM   run.bat my --resume  -> continue after an interruption
if not exist "%~dp0.venv\Scripts\python.exe" (py -m venv "%~dp0.venv" || goto :err)
set PY="%~dp0.venv\Scripts\python.exe"
cd /d "%~dp0tools"
%PY% -m pip install -q -r requirements.txt || goto :err
%PY% -m playwright install chromium || goto :err
if "%~1"=="" (%PY% crawl.py --site all) else (%PY% crawl.py --site %*)
echo Open: %~dp0archive\index.html
pause
exit /b 0
:err
echo Setup failed - install Python 3.10+ from python.org (tick "Add to PATH") and retry.
pause
exit /b 1
