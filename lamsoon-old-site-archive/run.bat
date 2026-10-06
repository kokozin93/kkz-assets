@echo off
REM Lam Soon old-site archive - one-click run (Windows)
REM   run.bat              -> crawl MY + TH-EN + TH-TH
REM   run.bat my           -> Malaysia only
REM   run.bat my --resume  -> continue after an interruption
cd /d "%~dp0tools"
py -m pip install -q -r requirements.txt || goto :err
py -m playwright install chromium || goto :err
if "%~1"=="" (py crawl.py --site all) else (py crawl.py --site %*)
echo Open: %~dp0archive\index.html
pause
exit /b 0
:err
echo Setup failed - install Python 3.10+ from python.org (tick "Add to PATH") and retry.
pause
exit /b 1
