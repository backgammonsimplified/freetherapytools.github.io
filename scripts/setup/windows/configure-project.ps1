[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$RepoRoot
)

$ErrorActionPreference = 'Stop'
$RepoRoot = (Resolve-Path -LiteralPath $RepoRoot).Path
Set-Location $RepoRoot

function Invoke-NativeCommand {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Command,
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Arguments
  )

  & $Command @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed with exit code ${LASTEXITCODE}: $Command $($Arguments -join ' ')"
  }
}

function Resolve-SystemTool {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name,
    [string[]]$Candidates = @(),
    [string[]]$Overrides = @()
  )

  foreach ($override in $Overrides) {
    $configured = [Environment]::GetEnvironmentVariable($override)
    if ($configured -and (Test-Path -LiteralPath $configured -PathType Leaf)) {
      return (Resolve-Path -LiteralPath $configured).Path
    }
  }
  $command = Get-Command $Name -ErrorAction SilentlyContinue
  if ($command) { return $command.Source }
  $existing = @($Candidates | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf })
  if ($existing.Count -gt 0) { return $existing[0] }
  throw "Required system tool is missing: $Name. Install it outside the repository, then rerun bash scripts/setup/windows-dev.sh."
}

function Get-FirstOutputLine {
  param([string]$Command, [string[]]$Arguments)
  $previousPreference = $ErrorActionPreference
  try {
    $ErrorActionPreference = 'Continue'
    $output = @(& $Command @Arguments 2>&1)
    $exitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousPreference
  }
  if ($exitCode -ne 0 -or -not $output) { throw "Could not execute $Command" }
  return ($output | Select-Object -First 1).ToString().Trim()
}

foreach ($required in @(
  'social_generator/requirements-social.txt',
  'social_generator/requirements-social.R',
  'scripts/setup/install-r-dependencies.R',
  'scripts/setup/preflight.py',
  'site/_quarto.yml'
)) {
  if (-not (Test-Path -LiteralPath $required -PathType Leaf)) {
    throw "Missing repository dependency source: $required"
  }
}

$localPrograms = Join-Path $env:LOCALAPPDATA 'Programs'
$git = Resolve-SystemTool -Name 'git'
$bash = Resolve-SystemTool -Name 'bash' -Overrides @('BASH_BIN') -Candidates @(
  (Join-Path $env:ProgramFiles 'Git/bin/bash.exe')
)
$nodeCandidates = @(
  (Join-Path $localPrograms 'nodejs/node.exe')
) + @(Get-ChildItem (Join-Path $localPrograms 'nodejs/node-v*/node.exe') -ErrorAction SilentlyContinue | ForEach-Object FullName | Sort-Object -Descending) + @(
  (Join-Path $env:ProgramFiles 'nodejs/node.exe')
)
$node = Resolve-SystemTool -Name 'node' -Overrides @('NODE_BIN') -Candidates $nodeCandidates
$quartoCandidates = @(
  (Join-Path $localPrograms 'Quarto/bin/quarto.exe')
) + @(Get-ChildItem (Join-Path $localPrograms 'Quarto/*/bin/quarto.exe') -ErrorAction SilentlyContinue | ForEach-Object FullName | Sort-Object -Descending) + @(
  (Join-Path $env:ProgramFiles 'Quarto/bin/quarto.exe')
)
$quarto = Resolve-SystemTool -Name 'quarto' -Overrides @('QUARTO_BIN') -Candidates $quartoCandidates
$rscriptCandidates = @(
  Get-ChildItem (Join-Path $localPrograms 'R/R-*/bin/Rscript.exe') -ErrorAction SilentlyContinue
  Get-ChildItem (Join-Path $env:ProgramFiles 'R/R-*/bin/Rscript.exe') -ErrorAction SilentlyContinue
) | Sort-Object {
  [version]($_.Directory.Parent.Name -replace '^R-', '')
} -Descending | ForEach-Object FullName
$rscript = Resolve-SystemTool -Name 'Rscript' -Overrides @('RSCRIPT_BIN', 'RSCRIPT') -Candidates $rscriptCandidates
$r = Join-Path (Split-Path -Parent $rscript) 'R.exe'
if (-not (Test-Path -LiteralPath $r -PathType Leaf)) {
  $r = Resolve-SystemTool -Name 'R'
}

$pythonCandidates = @(
  foreach ($registryRoot in @('HKCU:\Software\Python\PythonCore', 'HKLM:\Software\Python\PythonCore')) {
    if (Test-Path $registryRoot) {
      Get-ChildItem $registryRoot | ForEach-Object {
        if ($_.PSChildName -match '^(?<major>\d+)\.(?<minor>\d+)$') {
          $installPath = (Get-ItemProperty "$($_.PSPath)\InstallPath" -ErrorAction SilentlyContinue).'(default)'
          if ($installPath) {
            $candidatePath = Join-Path $installPath 'python.exe'
            if (Test-Path -LiteralPath $candidatePath -PathType Leaf) {
              [pscustomobject]@{ Version = [version]"$($Matches.major).$($Matches.minor)"; Path = $candidatePath }
            }
          }
        }
      }
    }
  }
  Get-ChildItem (Join-Path $localPrograms 'Python/Python*/python.exe') -ErrorAction SilentlyContinue | ForEach-Object {
    if ($_.Directory.Name -match '^Python(?<major>\d)(?<minor>\d+)$') {
      [pscustomobject]@{ Version = [version]"$($Matches.major).$($Matches.minor)"; Path = $_.FullName }
    }
  }
)
$selectedPython = $pythonCandidates |
  Where-Object { $_.Version -ge [version]'3.11' } |
  Sort-Object Version -Descending |
  Select-Object -First 1
if (-not $selectedPython) {
  throw 'Python 3.11+ is required; no qualifying registered or per-user installation was found.'
}

$quartoVersion = Get-FirstOutputLine -Command $quarto -Arguments @('--version')
if ($quartoVersion -ne '1.10.15') {
  throw "Quarto 1.10.15 is required; found $quartoVersion at $quarto"
}

Write-Host "Repository: $RepoRoot"
Write-Host "Git:       $(Get-FirstOutputLine -Command $git -Arguments @('--version')) ($git)"
Write-Host "Git Bash:  $(Get-FirstOutputLine -Command $bash -Arguments @('--version')) ($bash)"
Write-Host "Python:    $($selectedPython.Version) ($($selectedPython.Path))"
Write-Host "Node:      $(Get-FirstOutputLine -Command $node -Arguments @('--version')) ($node)"
Write-Host "Quarto:    $quartoVersion ($quarto)"
Write-Host "R:         $(Get-FirstOutputLine -Command $r -Arguments @('--version')) ($r)"
Write-Host "Rscript:   $(Get-FirstOutputLine -Command $rscript -Arguments @('--version')) ($rscript)"

$venv = Join-Path $RepoRoot '.venv'
$python = Join-Path $venv 'Scripts/python.exe'
if (-not (Test-Path -LiteralPath $python -PathType Leaf)) {
  Write-Host 'Creating repository .venv...'
  Invoke-NativeCommand $selectedPython.Path -m venv $venv
} else {
  Write-Host 'Reusing repository .venv.'
}

Invoke-NativeCommand $python -m pip install --upgrade pip
Invoke-NativeCommand $python -m pip install -r 'social_generator/requirements-social.txt'
Invoke-NativeCommand $python -m pip check
Invoke-NativeCommand $python -m playwright install chromium

$rLibrary = Join-Path $RepoRoot '.r-library'
New-Item -ItemType Directory -Force -Path $rLibrary | Out-Null
$env:R_LIBS_USER = $rLibrary
$env:RSCRIPT_BIN = $rscript
$env:NODE_BIN = $node
$env:QUARTO_BIN = $quarto
$env:BASH_BIN = $bash
Invoke-NativeCommand $rscript --vanilla 'scripts/setup/install-r-dependencies.R' $rLibrary 'social_generator/requirements-social.R'

Invoke-NativeCommand $python 'scripts/setup/preflight.py' --repo-root $RepoRoot --with-social-cards
Write-Host 'Project configuration completed.'
