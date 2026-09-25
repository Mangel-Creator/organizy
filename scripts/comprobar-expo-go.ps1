# Comprueba que la app abre en Expo Go desde el iPhone del usuario.
# Úsalo al terminar cada parte del proyecto (ver CLAUDE.md > "Cómo prueba el usuario").
#   powershell -ExecutionPolicy Bypass -File scripts\comprobar-expo-go.ps1
#
# 1. Instala las librerías que falten (si otra sesión añadió alguna a package.json).
# 2. Mira si el túnel (puerto 8083) está en marcha.
# 3. Pide la app por la dirección fija, como haría Expo Go en el iPhone, y dice si compila.

$ErrorActionPreference = 'Stop'
$raiz = 'C:\proyectos\organizy'
$direccion = 'https://uv-pnzw-mangel_creator-8083.exp.direct'
Set-Location $raiz

# 1. Librerías declaradas en package.json que no están instaladas.
$paquete = Get-Content package.json -Raw | ConvertFrom-Json
$nombres = @($paquete.dependencies.PSObject.Properties.Name) + @($paquete.devDependencies.PSObject.Properties.Name)
$faltan = $nombres | Where-Object { -not (Test-Path (Join-Path 'node_modules' $_)) }
if ($faltan) {
  Write-Output "Faltan librerías: $($faltan -join ', '). Instalando..."
  npm install --no-audit --no-fund 2>&1 | Out-Null
  Write-Output 'AVISO: si el túnel ya estaba en marcha, reinícialo (preview_stop + preview_start "organizy-tunel") para que cargue las librerías nuevas.'
} else {
  Write-Output 'Librerías: todas instaladas.'
}

# 2. Túnel en marcha.
$escucha = Get-NetTCPConnection -LocalPort 8083 -State Listen -ErrorAction SilentlyContinue
if (-not $escucha) {
  Write-Output 'MAL: el túnel NO está en marcha. Arráncalo con preview_start y el nombre "organizy-tunel".'
  exit 1
}
function Leer($respuesta) { [Text.Encoding]::UTF8.GetString($respuesta.RawContentStream.ToArray()) }
try {
  $estado = Leer (Invoke-WebRequest -UseBasicParsing -TimeoutSec 15 "$direccion/status")
} catch {
  Write-Output "MAL: el servidor está en marcha pero el túnel no responde desde internet ($($_.Exception.Message)). Reinícialo."
  exit 1
}
if ($estado -notmatch 'running') { Write-Output "MAL: respuesta rara del túnel: $estado"; exit 1 }
Write-Output "Túnel: responde en $direccion"

# 3. Pedir la app para iPhone (manifiesto + paquete de JavaScript).
$cabeceras = @{ 'expo-platform' = 'ios'; 'Accept' = 'application/expo+json,application/json' }
$manifiesto = Leer (Invoke-WebRequest -UseBasicParsing -TimeoutSec 60 -Headers $cabeceras "$direccion/") | ConvertFrom-Json
try {
  $paqueteJs = Invoke-WebRequest -UseBasicParsing -TimeoutSec 600 $manifiesto.launchAsset.url
} catch {
  Write-Output 'MAL: la app NO compila para iPhone. Mira los errores en preview_logs del túnel (busca "Metro error" o "Unable to resolve").'
  exit 1
}
Write-Output ("OK: la app compila para iPhone ({0} MB). Expo Go puede abrirla." -f [math]::Round($paqueteJs.RawContentLength / 1MB, 1))
