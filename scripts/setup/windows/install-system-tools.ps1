[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

Write-Host 'Install these system tools using their official installers; this script does not install anything:'
@(
  'Git (git)',
  'Git for Windows Bash (bash)',
  'Python 3 (py)',
  'Node.js (node)',
  'Quarto 1.10.15 (quarto)',
  'R (Rscript)'
) | ForEach-Object { Write-Host " - $_" }

Write-Host 'Then run from Git Bash: bash scripts/setup/windows-dev.sh'
