[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$RepoRoot,
  [switch]$WithSocialCards
)

$ErrorActionPreference = 'Stop'
$RepoRoot = (Resolve-Path -LiteralPath $RepoRoot).Path
$python = Join-Path $RepoRoot '.venv/Scripts/python.exe'
if (-not (Test-Path -LiteralPath $python -PathType Leaf)) {
  throw 'Repository .venv is missing. Run bash scripts/setup/windows-dev.sh.'
}
$arguments = @((Join-Path $RepoRoot 'scripts/setup/preflight.py'), '--repo-root', $RepoRoot)
if ($WithSocialCards) { $arguments += '--with-social-cards' }
& $python @arguments
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
