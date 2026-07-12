$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$sourceLogoPath = Join-Path $repoRoot 'public\Logo Mark-ChOkOwGe.png'
$buildDir = Join-Path $repoRoot 'build'
$iconPath = Join-Path $buildDir 'icon.ico'
$sidebarPath = Join-Path $buildDir 'installerSidebar.bmp'
$uninstallerSidebarPath = Join-Path $buildDir 'uninstallerSidebar.bmp'
$headerPath = Join-Path $buildDir 'installerHeader.bmp'

if (-not (Test-Path $sourceLogoPath)) {
    throw "Installer logo not found at $sourceLogoPath"
}

if (-not (Test-Path $buildDir)) {
    New-Item -ItemType Directory -Path $buildDir | Out-Null
}

function New-BrandBitmap {
    param(
        [string] $DestinationPath,
        [int] $Width,
        [int] $Height,
        [string] $Subtitle
    )

    $bitmap = [System.Drawing.Bitmap]::new($Width, $Height)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $logo = [System.Drawing.Image]::FromFile($sourceLogoPath)
    $accent = [System.Drawing.Color]::FromArgb(17, 94, 89)
    $accentSoft = [System.Drawing.Color]::FromArgb(240, 253, 250)
    $surface = [System.Drawing.Color]::FromArgb(255, 255, 255)
    $text = [System.Drawing.Color]::FromArgb(15, 23, 42)
    $muted = [System.Drawing.Color]::FromArgb(71, 85, 105)

    try {
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.Clear($surface)

        $backgroundRect = [System.Drawing.Rectangle]::new(0, 0, $Width, $Height)
        $backgroundBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
            $backgroundRect,
            $accentSoft,
            [System.Drawing.Color]::FromArgb(230, 255, 255, 255),
            90
        )

        try {
            $graphics.FillRectangle($backgroundBrush, $backgroundRect)
        }
        finally {
            $backgroundBrush.Dispose()
        }

        $panelMargin = 14
        $panelRect = [System.Drawing.RectangleF]::new(
            [single] $panelMargin,
            [single] $panelMargin,
            [single] ($Width - ($panelMargin * 2)),
            [single] ($Height - ($panelMargin * 2))
        )
        $panelPath = New-Object System.Drawing.Drawing2D.GraphicsPath
        $radius = 22.0
        $diameter = $radius * 2
        $panelPath.AddArc($panelRect.X, $panelRect.Y, $diameter, $diameter, 180, 90)
        $panelPath.AddArc($panelRect.Right - $diameter, $panelRect.Y, $diameter, $diameter, 270, 90)
        $panelPath.AddArc($panelRect.Right - $diameter, $panelRect.Bottom - $diameter, $diameter, $diameter, 0, 90)
        $panelPath.AddArc($panelRect.X, $panelRect.Bottom - $diameter, $diameter, $diameter, 90, 90)
        $panelPath.CloseFigure()

        $panelBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(245, 255, 255, 255))
        $panelBorder = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(210, 203, 213, 225), 1)

        try {
            $graphics.FillPath($panelBrush, $panelPath)
            $graphics.DrawPath($panelBorder, $panelPath)
        }
        finally {
            $panelBrush.Dispose()
            $panelBorder.Dispose()
            $panelPath.Dispose()
        }

        if ($Height -ge 250) {
            $logoSize = 74
            $logoX = [int] (($Width - $logoSize) / 2)
            $logoY = 34

            $logoShadowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(25, 15, 23, 42))
            $logoShadowRect = [System.Drawing.Rectangle]::new($logoX + 2, $logoY + 4, $logoSize, $logoSize)
            $logoRect = [System.Drawing.Rectangle]::new($logoX, $logoY, $logoSize, $logoSize)
            $accentBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(20, $accent.R, $accent.G, $accent.B))
            $accentPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(70, $accent.R, $accent.G, $accent.B), 1)

            try {
                $graphics.FillEllipse($logoShadowBrush, $logoShadowRect)
                $graphics.FillEllipse($accentBrush, $logoRect)
                $graphics.DrawEllipse($accentPen, $logoRect)
            }
            finally {
                $logoShadowBrush.Dispose()
                $accentBrush.Dispose()
                $accentPen.Dispose()
            }

            $graphics.DrawImage($logo, $logoRect)

            $titleFont = New-Object System.Drawing.Font('Segoe UI', 16, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
            $subtitleFont = New-Object System.Drawing.Font('Segoe UI', 10, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
            $footerFont = New-Object System.Drawing.Font('Segoe UI', 9, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
            $textBrush = New-Object System.Drawing.SolidBrush($text)
            $mutedBrush = New-Object System.Drawing.SolidBrush($muted)
            $stringFormat = New-Object System.Drawing.StringFormat
            $stringFormat.Alignment = [System.Drawing.StringAlignment]::Center
            $stringFormat.LineAlignment = [System.Drawing.StringAlignment]::Near

            try {
                $graphics.DrawString('Nexa', $titleFont, $textBrush, [System.Drawing.RectangleF]::new(18, 122, $Width - 36, 24), $stringFormat)
                $graphics.DrawString('Attendance', $titleFont, $textBrush, [System.Drawing.RectangleF]::new(18, 144, $Width - 36, 24), $stringFormat)
                $graphics.DrawString('Monitor', $titleFont, $textBrush, [System.Drawing.RectangleF]::new(18, 166, $Width - 36, 24), $stringFormat)
                $graphics.DrawString($Subtitle, $subtitleFont, $mutedBrush, [System.Drawing.RectangleF]::new(22, 214, $Width - 44, 42), $stringFormat)
                $graphics.DrawString('Safe upgrade. Data kept.', $footerFont, $mutedBrush, [System.Drawing.RectangleF]::new(18, $Height - 44, $Width - 36, 20), $stringFormat)
            }
            finally {
                $titleFont.Dispose()
                $subtitleFont.Dispose()
                $footerFont.Dispose()
                $textBrush.Dispose()
                $mutedBrush.Dispose()
                $stringFormat.Dispose()
            }
        }
        else {
            $headerBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
                [System.Drawing.Rectangle]::new(0, 0, $Width, $Height),
                [System.Drawing.Color]::FromArgb(245, 255, 255, 255),
                $accentSoft,
                0
            )

            try {
                $graphics.FillRectangle($headerBrush, 0, 0, $Width, $Height)
            }
            finally {
                $headerBrush.Dispose()
            }

            $titleFont = New-Object System.Drawing.Font('Segoe UI', 11, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
            $subtitleFont = New-Object System.Drawing.Font('Segoe UI', 8, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
            $textBrush = New-Object System.Drawing.SolidBrush($text)
            $mutedBrush = New-Object System.Drawing.SolidBrush($muted)

            try {
                $graphics.DrawString('Nexa Setup', $titleFont, $textBrush, 12, 12)
                $graphics.DrawString('Fast and safe install', $subtitleFont, $mutedBrush, 13, 29)
            }
            finally {
                $titleFont.Dispose()
                $subtitleFont.Dispose()
                $textBrush.Dispose()
                $mutedBrush.Dispose()
            }

            $logoSize = 28
            $logoRect = [System.Drawing.Rectangle]::new($Width - $logoSize - 14, 14, $logoSize, $logoSize)
            $accentBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(24, $accent.R, $accent.G, $accent.B))
            $accentPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(80, $accent.R, $accent.G, $accent.B), 1)

            try {
                $graphics.FillEllipse($accentBrush, $logoRect)
                $graphics.DrawEllipse($accentPen, $logoRect)
            }
            finally {
                $accentBrush.Dispose()
                $accentPen.Dispose()
            }

            $graphics.DrawImage($logo, $logoRect)
        }

        $bitmap.Save($DestinationPath, [System.Drawing.Imaging.ImageFormat]::Bmp)
    }
    finally {
        $logo.Dispose()
        $graphics.Dispose()
        $bitmap.Dispose()
    }
}

New-BrandBitmap -DestinationPath $sidebarPath -Width 164 -Height 314 -Subtitle 'Install the latest desktop app with a guided setup experience.'
New-BrandBitmap -DestinationPath $uninstallerSidebarPath -Width 164 -Height 314 -Subtitle 'Remove the app cleanly while preserving the data you want to keep.'
New-BrandBitmap -DestinationPath $headerPath -Width 150 -Height 57 -Subtitle ''

Write-Host "Prepared installer assets in $buildDir"
