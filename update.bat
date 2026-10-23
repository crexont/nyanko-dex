@echo off
rem Close BlueStacks first, then double-click this file.
rem Options: --instance Pie64   --no-extract   --no-open
cd /d "%~dp0"
set PYTHONUTF8=1

rem Find Python 3: py launcher -> python on PATH -> default per-user install
set "PY="
py -3 -c "import sys; sys.exit(sys.version_info < (3, 9))" >nul 2>&1 && set "PY=py -3"
if not defined PY python -c "import sys; sys.exit(sys.version_info < (3, 9))" >nul 2>&1 && set "PY=python"
if not defined PY for /d %%D in ("%LOCALAPPDATA%\Programs\Python\Python3*") do if exist "%%~fD\python.exe" set "PY="%%~fD\python.exe""
if not defined PY (
  echo Python 3.9+ not found. Install it from https://www.python.org/downloads/
  echo  ^(check "Add python.exe to PATH" during setup^), then run this again.
  goto :fail
)

rem Install dependencies on first run
%PY% -c "import bcsfe, Crypto" >nul 2>&1 || (
  echo Installing dependencies...
  %PY% -m pip install -r requirements.txt || goto :fail
)

%PY% tools\update.py %*
if errorlevel 1 goto :fail
exit /b 0

:fail
pause
exit /b 1
