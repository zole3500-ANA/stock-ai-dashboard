param(
  [Parameter(Mandatory=$true)]
  [string]$RepoUrl
)

if (-not (Test-Path ".git")) {
  git init
}

git add .
git commit -m "Initial Stock AI Dashboard"
git branch -M main

$origin = git remote get-url origin 2>$null
if ($LASTEXITCODE -eq 0) {
  git remote set-url origin $RepoUrl
} else {
  git remote add origin $RepoUrl
}

git push -u origin main
