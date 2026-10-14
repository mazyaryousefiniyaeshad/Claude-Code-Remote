$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12

$Repo = "mazyaryousefiniyaeshad/cc-remote"
$NodeMajor = 22
$DataDir = if ($env:CC_REMOTE_HOME) { $env:CC_REMOTE_HOME } else { Join-Path $env:USERPROFILE ".cc-remote" }
$AppDir = Join-Path $DataDir "app"
$NodeDir = Join-Path $DataDir "node"
$BinDir = Join-Path $DataDir "bin"

function Test-Node([string]$Exe) {
  try {
    & $Exe -e "process.exit(Number(process.versions.node.split('.')[0]) >= $NodeMajor ? 0 : 1)" 2>$null
    return $LASTEXITCODE -eq 0
  } catch {
    return $false
  }
}

function Invoke-Npm([string]$Dir, [string[]]$NpmArgs) {
  Push-Location $Dir
  try {
    & $Npm @NpmArgs --no-audit --no-fund --no-update-notifier --loglevel=error | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "npm $($NpmArgs -join ' ') failed in $Dir" }
  } finally {
    Pop-Location
  }
}

$Tmp = Join-Path ([IO.Path]::GetTempPath()) ("cc-remote-" + [guid]::NewGuid())
New-Item -ItemType Directory -Path $Tmp | Out-Null

try {
  $Node = $null
  $Bundled = Join-Path $NodeDir "node.exe"
  $System = Get-Command node -ErrorAction SilentlyContinue
  if ((Test-Path $Bundled) -and (Test-Node $Bundled)) {
    $Node = $Bundled
  } elseif ($System -and (Test-Node $System.Source)) {
    $Node = $System.Source
  } else {
    Write-Host "Downloading Node.js $NodeMajor..."
    $Arch = if ($env:PROCESSOR_ARCHITECTURE -eq "ARM64") { "arm64" } else { "x64" }
    $Base = "https://nodejs.org/dist/latest-v$NodeMajor.x"
    $Sums = (Invoke-WebRequest -UseBasicParsing "$Base/SHASUMS256.txt").Content -split "`n"
    $Line = $Sums | Where-Object { $_ -match "node-v[\d.]+-win-$Arch\.zip$" } | Select-Object -First 1
    if (-not $Line) { throw "No Node.js build for win-$Arch" }
    $Hash, $File = $Line.Trim() -split "\s+"
    $Zip = Join-Path $Tmp $File
    Invoke-WebRequest -UseBasicParsing "$Base/$File" -OutFile $Zip
    if ((Get-FileHash $Zip -Algorithm SHA256).Hash -ne $Hash.ToUpper()) { throw "Node.js download is corrupt, try again" }
    tar -xf $Zip -C $Tmp
    if ($LASTEXITCODE -ne 0) { throw "Could not unpack Node.js" }
    if (Test-Path $NodeDir) { Remove-Item $NodeDir -Recurse -Force }
    New-Item -ItemType Directory -Path $DataDir -Force | Out-Null
    Move-Item (Join-Path $Tmp ($File -replace "\.zip$", "")) $NodeDir
    $Node = $Bundled
  }

  $NodeBin = Split-Path $Node
  $env:Path = "$NodeBin;$env:Path"
  $Npm = Join-Path $NodeBin "npm.cmd"
  if (-not (Test-Path $Npm)) { $Npm = "npm" }

  Write-Host "Downloading Remote for Claude Code..."
  $Prebuilt = $true
  $Archive = Join-Path $Tmp "cc-remote.tgz"
  if ($env:CC_REMOTE_SOURCE) {
    Copy-Item $env:CC_REMOTE_SOURCE $Archive
    tar -xzf $Archive -C $Tmp
    $Source = Join-Path $Tmp "cc-remote"
  } else {
    try {
      Invoke-WebRequest -UseBasicParsing "https://github.com/$Repo/releases/latest/download/cc-remote.tgz" -OutFile $Archive
      tar -xzf $Archive -C $Tmp
      $Source = Join-Path $Tmp "cc-remote"
    } catch {
      $Prebuilt = $false
      $SourceZip = Join-Path $Tmp "source.zip"
      Invoke-WebRequest -UseBasicParsing "https://codeload.github.com/$Repo/zip/refs/heads/master" -OutFile $SourceZip
      Expand-Archive $SourceZip -DestinationPath $Tmp
      $Source = Join-Path $Tmp "cc-remote-master"
    }
  }
  if (-not (Test-Path $Source)) { throw "Could not unpack the download" }

  $Cli = Join-Path $AppDir "bin\cc-remote.js"
  if (Test-Path $Cli) { & $Node $Cli stop | Out-Null }

  Write-Host "Installing..."
  New-Item -ItemType Directory -Path $DataDir -Force | Out-Null
  $Staged = "$AppDir.new"
  if (Test-Path $Staged) { Remove-Item $Staged -Recurse -Force }
  Move-Item $Source $Staged
  Invoke-Npm $Staged @("ci", "--omit=dev")
  if (-not $Prebuilt) {
    Write-Host "Building the web app..."
    $Web = Join-Path $Staged "app"
    Invoke-Npm $Web @("ci")
    Invoke-Npm $Web @("run", "build")
    Remove-Item (Join-Path $Web "node_modules") -Recurse -Force
  }
  if (Test-Path $AppDir) { Remove-Item $AppDir -Recurse -Force }
  Move-Item $Staged $AppDir

  New-Item -ItemType Directory -Path $BinDir -Force | Out-Null
  $Launcher = Join-Path $BinDir "cc-remote.cmd"
  $NodeRef = if ($Node -eq $Bundled) { "%~dp0..\node\node.exe" } else { $Node }
  Set-Content -Path $Launcher -Encoding ASCII -Value "@echo off`r`n`"$NodeRef`" `"%~dp0..\app\bin\cc-remote.js`" %*"

  $UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
  $OnPath = ($UserPath -split ";") -contains $BinDir
  if (-not $OnPath) {
    [Environment]::SetEnvironmentVariable("Path", (@($BinDir, $UserPath) | Where-Object { $_ }) -join ";", "User")
  }
  $env:Path = "$BinDir;$env:Path"

  Write-Host ""
  if ($env:CC_REMOTE_UPDATE -eq "1") {
    & $Launcher setup --yes
  } else {
    & $Launcher setup @args
  }

  if (-not $OnPath) {
    Write-Host ""
    Write-Host "Open a new terminal to use the cc-remote command."
  }
} finally {
  Remove-Item $Tmp -Recurse -Force -ErrorAction SilentlyContinue
}
