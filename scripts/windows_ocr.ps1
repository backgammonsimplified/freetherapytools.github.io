param(
    [Parameter(Mandatory = $true)]
    [string]$ImagePath
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Runtime.WindowsRuntime

function Await-WinRtOperation {
    param(
        [Parameter(Mandatory = $true)]$Operation,
        [Parameter(Mandatory = $true)][Type]$ResultType
    )
    $method = [System.WindowsRuntimeSystemExtensions].GetMethods() |
        Where-Object {
            $_.Name -eq "AsTask" -and $_.IsGenericMethod -and
            $_.GetParameters().Count -eq 1
        } |
        Select-Object -First 1
    $task = $method.MakeGenericMethod($ResultType).Invoke($null, @($Operation))
    $task.GetAwaiter().GetResult()
}

$resolved = (Resolve-Path -LiteralPath $ImagePath).Path
$storageFile = Await-WinRtOperation `
    ([Windows.Storage.StorageFile,Windows.Storage,ContentType=WindowsRuntime]::GetFileFromPathAsync($resolved)) `
    ([Windows.Storage.StorageFile,Windows.Storage,ContentType=WindowsRuntime])
$stream = Await-WinRtOperation `
    ($storageFile.OpenAsync([Windows.Storage.FileAccessMode]::Read)) `
    ([Windows.Storage.Streams.IRandomAccessStream,Windows.Storage.Streams,ContentType=WindowsRuntime])
$decoder = Await-WinRtOperation `
    ([Windows.Graphics.Imaging.BitmapDecoder,Windows.Graphics.Imaging,ContentType=WindowsRuntime]::CreateAsync($stream)) `
    ([Windows.Graphics.Imaging.BitmapDecoder,Windows.Graphics.Imaging,ContentType=WindowsRuntime])
$bitmap = Await-WinRtOperation `
    ($decoder.GetSoftwareBitmapAsync()) `
    ([Windows.Graphics.Imaging.SoftwareBitmap,Windows.Graphics.Imaging,ContentType=WindowsRuntime])
$language = [Windows.Globalization.Language,Windows.Globalization,ContentType=WindowsRuntime]::new("en-US")
$engine = [Windows.Media.Ocr.OcrEngine,Windows.Foundation,ContentType=WindowsRuntime]::TryCreateFromLanguage($language)
$result = Await-WinRtOperation `
    ($engine.RecognizeAsync($bitmap)) `
    ([Windows.Media.Ocr.OcrResult,Windows.Foundation,ContentType=WindowsRuntime])

$lines = foreach ($line in $result.Lines) {
    $words = @($line.Words)
    if ($words.Count -eq 0) { continue }
    $left = ($words | ForEach-Object { $_.BoundingRect.X } | Measure-Object -Minimum).Minimum
    $top = ($words | ForEach-Object { $_.BoundingRect.Y } | Measure-Object -Minimum).Minimum
    $right = ($words | ForEach-Object { $_.BoundingRect.X + $_.BoundingRect.Width } | Measure-Object -Maximum).Maximum
    $bottom = ($words | ForEach-Object { $_.BoundingRect.Y + $_.BoundingRect.Height } | Measure-Object -Maximum).Maximum
    [pscustomobject]@{
        x = [math]::Round($left, 2)
        y = [math]::Round($top, 2)
        width = [math]::Round($right - $left, 2)
        height = [math]::Round($bottom - $top, 2)
        text = $line.Text
    }
}

$lines | ConvertTo-Json -Depth 3 -Compress
