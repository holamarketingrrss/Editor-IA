# Instalador del Editor IA para Windows: prepara WSL con Ubuntu (Linux dentro de Windows), clona el repo ahí
# y corre instalar/linux.sh. Abrí PowerShell COMO ADMINISTRADOR y corré:
#   powershell -ExecutionPolicy Bypass -File instalar\windows.ps1
# Si es la primera vez que se instala WSL, Windows pide reiniciar: reiniciá, abrí "Ubuntu" una vez para crear
# el usuario y volvé a correr este mismo comando.
$ErrorActionPreference = 'Stop'
$Repo = 'https://github.com/holamarketingrrss/Editor-IA.git'
$Distro = 'Ubuntu'

$admin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

# 1) WSL + Ubuntu
$distros = (wsl.exe --list --quiet 2>$null) -replace "`0", '' | Where-Object { $_ -ne '' }
if (-not ($distros -contains $Distro)) {
  if (-not $admin) { Write-Host 'Abrí PowerShell como administrador (clic derecho > Ejecutar como administrador) y corré esto de nuevo.'; exit 1 }
  Write-Host '== Instalando WSL con Ubuntu (puede tardar varios minutos)'
  wsl.exe --install -d $Distro
  Write-Host ''
  Write-Host 'Listo el primer paso. Ahora:'
  Write-Host '  1. Reiniciá la compu si Windows lo pide.'
  Write-Host '  2. Abrí "Ubuntu" desde el menú Inicio y creá tu usuario y contraseña de Linux.'
  Write-Host '  3. Volvé a correr este instalador.'
  exit 0
}

# 2) Repo dentro de Ubuntu (rápido) y el instalador de Linux
Write-Host '== Clonando o actualizando el repo dentro de Ubuntu (~/Editor-IA)'
Write-Host '   Si GitHub pide usuario y contraseña: el usuario de GitHub y un token (github.com > Settings > Developer settings > Tokens).'
wsl.exe -d $Distro -- bash -lc "command -v git >/dev/null || sudo apt-get install -y git; if [ -d ~/Editor-IA/.git ]; then cd ~/Editor-IA && git pull --ff-only; else git clone $Repo ~/Editor-IA; fi"
if ($LASTEXITCODE -ne 0) { Write-Host 'No se pudo clonar el repo: revisá el acceso a GitHub y volvé a correr.'; exit 1 }

Write-Host '== Instalando el editor dentro de Ubuntu (te va a pedir la contraseña de Linux)'
wsl.exe -d $Distro -- bash -lc 'cd ~/Editor-IA && bash instalar/linux.sh'
Write-Host ''
Write-Host 'Para abrir la app: doble clic en "Editor IA" en el Escritorio (se abre en http://127.0.0.1:4321).'
