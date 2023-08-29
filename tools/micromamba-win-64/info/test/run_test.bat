



if not exist %LIBRARY_BIN%\micromamba.exe (exit 1)
IF %ERRORLEVEL% NEQ 0 exit /B 1
micromamba.exe --help
IF %ERRORLEVEL% NEQ 0 exit /B 1
mkdir %TEMP%\mamba
IF %ERRORLEVEL% NEQ 0 exit /B 1
set "MAMBA_ROOT_PREFIX=%TEMP%\mamba"
IF %ERRORLEVEL% NEQ 0 exit /B 1
micromamba.exe create -n test --override-channels -c conda-forge --yes python=3.9
IF %ERRORLEVEL% NEQ 0 exit /B 1
%MAMBA_ROOT_PREFIX%\envs\test\python.exe --version
IF %ERRORLEVEL% NEQ 0 exit /B 1
%MAMBA_ROOT_PREFIX%\envs\test\python.exe -c "import os"
IF %ERRORLEVEL% NEQ 0 exit /B 1
exit /B 0
