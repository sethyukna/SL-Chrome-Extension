<#
    Packages the extension into dist/sl-utility-<version>.zip

    Only the files listed in $Include are packaged, so local leftovers
    (stray images, notes, .git) never reach the published zip.

    Usage:  pwsh -File build.ps1
#>

$ErrorActionPreference = 'Stop'

$root = $PSScriptRoot
$manifest = Get-Content (Join-Path $root 'manifest.json') -Raw | ConvertFrom-Json
$version = $manifest.version

$Include = @(
    'manifest.json',
    'background.js',
    'popup.html',
    'popup.js',
    'popup.css',
    'options.html',
    'options.js',
    'options.css',
    'SL.png'
)

# Fail loudly if the manifest references a file that is not there.
$missing = $Include | Where-Object { -not (Test-Path (Join-Path $root $_)) }
if ($missing) {
    throw "Missing required file(s): $($missing -join ', ')"
}

$dist = Join-Path $root 'dist'
if (-not (Test-Path $dist)) {
    New-Item -ItemType Directory $dist | Out-Null
}

# Stage into a clean folder so the zip has no nested parent directory.
$staging = Join-Path $dist "staging-$version"
if (Test-Path $staging) {
    Remove-Item $staging -Recurse -Force
}
New-Item -ItemType Directory $staging | Out-Null

foreach ($file in $Include) {
    Copy-Item (Join-Path $root $file) (Join-Path $staging $file)
}

$zip = Join-Path $dist "sl-utility-$version.zip"
if (Test-Path $zip) {
    Remove-Item $zip -Force
}

Compress-Archive -Path (Join-Path $staging '*') -DestinationPath $zip
Remove-Item $staging -Recurse -Force

$sizeKb = [math]::Round((Get-Item $zip).Length / 1KB, 1)
Write-Output "Packaged $($Include.Count) files -> dist/sl-utility-$version.zip ($sizeKb KB)"
