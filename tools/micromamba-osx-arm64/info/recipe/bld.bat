SET VCPKG_ROOT=%CD%\vcpkg

SET VCPKG_BUILD_TYPE=release
vcpkg install --overlay-ports=%RECIPE_DIR%\libsolv libsolv[conda] --triplet x64-windows-static

if %errorlevel% NEQ 0 exit /b %errorlevel%
vcpkg install "libarchive[bzip2,lz4,lzma,lzo,openssl,zstd]" --triplet x64-windows-static
if %errorlevel% NEQ 0 exit /b %errorlevel%
vcpkg install curl --triplet x64-windows-static
if %errorlevel% NEQ 0 exit /b %errorlevel%
vcpkg install yaml-cpp --triplet x64-windows-static
if %errorlevel% NEQ 0 exit /b %errorlevel%
vcpkg install reproc --triplet x64-windows-static
if %errorlevel% NEQ 0 exit /b %errorlevel%

SET "CXXFLAGS=%CXXFLAGS% /showIncludes"
SET CMAKE_PREFIX_PATH=%VCPKG_ROOT%\installed\x64-windows-static\;%CMAKE_PREFIX_PATH%

cmake -S mamba ^
    -B build ^
    -D CMAKE_INSTALL_PREFIX=%LIBRARY_PREFIX% ^
    -D CMAKE_PREFIX_PATH="%VCPKG_ROOT%\installed\x64-windows-static\;%CMAKE_PREFIX_PATH%" ^
    -D CMAKE_BUILD_TYPE="Release" ^
    -D BUILD_LIBMAMBA=ON ^
    -D BUILD_STATIC=ON ^
    -D BUILD_MICROMAMBA=ON ^
    -G "Ninja"
if %errorlevel% NEQ 0 exit /b %errorlevel%

cmake --build build --parallel %CPU_COUNT%
if %errorlevel% NEQ 0 exit /b %errorlevel%

cmake --install build
if %errorlevel% NEQ 0 exit /b %errorlevel%

DEL /Q /F /S "%LIBRARY_PREFIX%\lib\libmamba*"
if %errorlevel% NEQ 0 exit /b %errorlevel%
RMDIR /S /Q "%LIBRARY_PREFIX%\include\mamba"
if %errorlevel% NEQ 0 exit /b %errorlevel%
RMDIR /S /Q "%LIBRARY_PREFIX%\lib\cmake\libmamba"
if %errorlevel% NEQ 0 exit /b %errorlevel%
