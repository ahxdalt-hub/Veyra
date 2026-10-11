# crop-screenshots.ps1
# Crops the Windows window chrome (top title bar) and the taskbar (bottom)
# out of raw app screenshots, upscales for crispness, and saves ordered,
# app-only PNGs to public/product.
#
# Chrome boundaries are auto-detected per image (dark -> light at the top for
# the title bar, light -> dark at the bottom for the taskbar), so it is robust
# at any DPI. Output filenames are fixed (01-dashboard .. 06-reviews) so the
# hero showcase order is deterministic.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts\crop-screenshots.ps1

param(
    [string]$RawDir = "c:\Users\abdul\Desktop\Projects\Veyra\public\product\raw",
    [string]$OutDir = "c:\Users\abdul\Desktop\Projects\Veyra\public\product"
)

Add-Type -AssemblyName System.Drawing

$TARGET_W = 3000   # ~3x the hero's ~1000px display width => crisp on every screen

# Source file -> ordered output name.
$map = [ordered]@{
    'Screenshot 2026-10-07 221505.png' = '01-dashboard.png'
    'Screenshot 2026-10-07 002114.png' = '02-pipeline.png'
    'Screenshot 2026-10-07 002122.png' = '03-deal.png'
    'Screenshot 2026-10-07 002020.png' = '04-outreach.png'
    'Screenshot 2026-10-07 002101.png' = '05-contact.png'
    'Screenshot 2026-10-07 002143.png' = '06-reviews.png'
}

# A row is "light" (app content, cream ~235) vs "dark" (chrome, near-black).
function Test-RowLight([System.Drawing.Bitmap]$bmp, [int]$y, [int[]]$xs) {
    $sum = 0
    foreach ($x in $xs) { $c = $bmp.GetPixel($x, $y); $sum += ($c.R + $c.G + $c.B) }
    return (($sum / ($xs.Count * 3)) -gt 200)
}

if (-not (Test-Path $RawDir)) { Write-Error "Raw dir not found: $RawDir"; exit 1 }

foreach ($src in $map.Keys) {
    $path = Join-Path $RawDir $src
    if (-not (Test-Path $path)) { Write-Output "MISSING: $src"; continue }

    $bmp = New-Object System.Drawing.Bitmap $path
    $w = $bmp.Width; $h = $bmp.Height
    $xLeft = 3
    $xMid = [int]($w / 2)
    $xRight = $w - 4
    $xs = @($xLeft, $xMid, $xRight)

    # Title bar bottom: first light row scanning down from the top.
    $top = 0
    for ($y = 0; $y -lt 80; $y++) { if (Test-RowLight $bmp $y $xs) { $top = $y; break } }
    # Taskbar top: first light row scanning up from the bottom.
    $bottom = $h
    for ($y = $h - 1; $y -gt ($h - 110); $y--) { if (Test-RowLight $bmp $y $xs) { $bottom = $y + 1; break } }

    $cropH = $bottom - $top
    if ($cropH -le 0) { $cropH = $h - $top; $bottom = $h }

    $scale = $TARGET_W / $w
    $dstW = $TARGET_W
    $dstH = [int]([math]::Round($cropH * $scale))

    $out = New-Object System.Drawing.Bitmap $dstW, $dstH
    $g = [System.Drawing.Graphics]::FromImage($out)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.DrawImage($bmp, (New-Object System.Drawing.Rectangle 0, 0, $dstW, $dstH),
                       (New-Object System.Drawing.Rectangle 0, $top, $w, $cropH),
                       [System.Drawing.GraphicsUnit]::Pixel)

    $outPath = Join-Path $OutDir $map[$src]
    $out.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)

    $kb = [int]((Get-Item $outPath).Length / 1KB)
    Write-Output ("{0,-18} src {1}x{2}  crop(top -{3}, bottom -{4})  ->  {5}x{6}   {7} KB" -f `
        $map[$src], $w, $h, $top, ($h - $bottom), $dstW, $dstH, $kb)

    $g.Dispose(); $out.Dispose(); $bmp.Dispose()
}

Write-Output "`nDone. Upscaled, app-only screenshots written to: $OutDir"
