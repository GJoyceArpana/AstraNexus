
# ============================================================
# ASTRA NEXUS - JEZERO CRATER TERRAIN MOSAIC BUILDER
# Downloads 3x3 neighbouring NASA Mars Trek WMTS tiles
# Stitches them into a 768 x 768 PNG
# ============================================================

$ErrorActionPreference = "Stop"

$projectRoot = $PSScriptRoot
$dataDir = Join-Path $projectRoot "server\data"
$marsDir = Join-Path $projectRoot "public\assets\game\mars"

$xmlPath = Join-Path $dataDir "jezero-ctx-capabilities.xml"

$layerId = "JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0"
$zoomLevel = "13"

$gridSize = 3
$tileSize = 256
$radius = [math]::Floor($gridSize / 2)

Write-Host ""
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host " ASTRA NEXUS - JEZERO MOSAIC BUILDER" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

# ------------------------------------------------------------
# 1. CHECK REQUIRED FILES
# ------------------------------------------------------------

if (-not (Test-Path $xmlPath)) {
    throw "NASA capabilities XML not found. Run Get-JezeroTerrain.ps1 first."
}

New-Item -ItemType Directory -Force -Path $marsDir | Out-Null

# ------------------------------------------------------------
# 2. LOAD NASA WMTS CAPABILITIES
# ------------------------------------------------------------

[xml]$xml = Get-Content -Path $xmlPath -Raw

$layer = $null

foreach ($item in $xml.SelectNodes("//*[local-name()='Layer']")) {
    $id = $item.SelectSingleNode("./*[local-name()='Identifier']")

    if ($id -and $id.InnerText -eq $layerId) {
        $layer = $item
        break
    }
}

if (-not $layer) {
    throw "Jezero terrain layer not found."
}

$matrixLink = $layer.SelectSingleNode(
    "./*[local-name()='TileMatrixSetLink']/*[local-name()='TileMatrixSet']"
)

$matrixSetId = $matrixLink.InnerText

$matrixSet = $null

foreach ($set in $xml.SelectNodes("//*[local-name()='TileMatrixSet']")) {
    $id = $set.SelectSingleNode("./*[local-name()='Identifier']")

    if ($id -and $id.InnerText -eq $matrixSetId) {
        $matrixSet = $set
        break
    }
}

if (-not $matrixSet) {
    throw "Tile matrix set not found."
}

$matrix = $null

foreach ($item in $matrixSet.SelectNodes("./*[local-name()='TileMatrix']")) {
    $id = $item.SelectSingleNode("./*[local-name()='Identifier']")

    if ($id -and $id.InnerText -eq $zoomLevel) {
        $matrix = $item
        break
    }
}

if (-not $matrix) {
    throw "Zoom level not found."
}

$matrixWidth = [int]$matrix.SelectSingleNode(
    "./*[local-name()='MatrixWidth']"
).InnerText

$matrixHeight = [int]$matrix.SelectSingleNode(
    "./*[local-name()='MatrixHeight']"
).InnerText

# ------------------------------------------------------------
# 3. CALCULATE CENTRE TILE FROM NASA COVERAGE
# ------------------------------------------------------------

$bbox = $layer.SelectSingleNode(
    ".//*[local-name()='BoundingBox']"
)

$lower = $bbox.SelectSingleNode(
    "./*[local-name()='LowerCorner']"
).InnerText -split '\s+'

$upper = $bbox.SelectSingleNode(
    "./*[local-name()='UpperCorner']"
).InnerText -split '\s+'

$minLon = [double]::Parse(
    $lower[0],
    [Globalization.CultureInfo]::InvariantCulture
)

$minLat = [double]::Parse(
    $lower[1],
    [Globalization.CultureInfo]::InvariantCulture
)

$maxLon = [double]::Parse(
    $upper[0],
    [Globalization.CultureInfo]::InvariantCulture
)

$maxLat = [double]::Parse(
    $upper[1],
    [Globalization.CultureInfo]::InvariantCulture
)

$centerLon = ($minLon + $maxLon) / 2
$centerLat = ($minLat + $maxLat) / 2

$topLeft = $matrix.SelectSingleNode(
    "./*[local-name()='TopLeftCorner']"
).InnerText -split '\s+'

$originX = [double]::Parse(
    $topLeft[0],
    [Globalization.CultureInfo]::InvariantCulture
)

$originY = [double]::Parse(
    $topLeft[1],
    [Globalization.CultureInfo]::InvariantCulture
)

$centerCol = [int][math]::Floor(
    (($centerLon - $originX) / 360.0) * $matrixWidth
)

$centerRow = [int][math]::Floor(
    (($originY - $centerLat) / 180.0) * $matrixHeight
)

$minCol = $centerCol - $radius
$maxCol = $centerCol + $radius
$minRow = $centerRow - $radius
$maxRow = $centerRow + $radius

if (
    $minCol -lt 0 -or
    $maxCol -ge $matrixWidth -or
    $minRow -lt 0 -or
    $maxRow -ge $matrixHeight
) {
    throw "The requested mosaic extends outside the tile matrix."
}

Write-Host "`nCentre tile: Row $centerRow, Column $centerCol" -ForegroundColor Green
Write-Host "Grid: $gridSize x $gridSize"
Write-Host "Zoom: $zoomLevel"

# ------------------------------------------------------------
# 4. GET NASA TILE URL TEMPLATE
# ------------------------------------------------------------

$resource = $layer.SelectSingleNode(
    "./*[local-name()='ResourceURL'][@resourceType='tile']"
)

if (-not $resource) {
    throw "NASA tile URL template not found."
}

$urlTemplate = $resource.GetAttribute("template")

# ------------------------------------------------------------
# 5. DOWNLOAD ALL NINE TILES
# ------------------------------------------------------------

Write-Host "`nDownloading neighbouring NASA tiles..." -ForegroundColor Yellow

$tileFiles = @{}

for ($row = $minRow; $row -le $maxRow; $row++) {

    for ($col = $minCol; $col -le $maxCol; $col++) {

        $tileName = "jezero-z$zoomLevel-r$row-c$col.png"
        $tilePath = Join-Path $marsDir $tileName

        $tileUrl = $urlTemplate
        $tileUrl = $tileUrl.Replace("{Style}", "default")
        $tileUrl = $tileUrl.Replace("{TileMatrixSet}", $matrixSetId)
        $tileUrl = $tileUrl.Replace("{TileMatrix}", $zoomLevel)
        $tileUrl = $tileUrl.Replace("{TileRow}", [string]$row)
        $tileUrl = $tileUrl.Replace("{TileCol}", [string]$col)

        Write-Host "Downloading row $row, column $col..." -NoNewline

        try {

            Invoke-WebRequest `
                -Uri $tileUrl `
                -UseBasicParsing `
                -OutFile $tilePath `
                -TimeoutSec 60

            $bytes = [System.IO.File]::ReadAllBytes($tilePath)

            $signature = @(137,80,78,71,13,10,26,10)

            if ($bytes.Length -lt 8) {
                throw "Downloaded file is too small."
            }

            for ($i = 0; $i -lt 8; $i++) {
                if ($bytes[$i] -ne $signature[$i]) {
                    throw "Response is not a valid PNG."
                }
            }

            $tileFiles["$row,$col"] = $tilePath

            Write-Host " OK" -ForegroundColor Green

        }
        catch {

            Write-Host " FAILED" -ForegroundColor Red
            Write-Host $_.Exception.Message -ForegroundColor Yellow
            throw "Unable to retrieve tile row $row, column $col."
        }
    }
}

# ------------------------------------------------------------
# 6. STITCH THE NINE PNG TILES
# ------------------------------------------------------------

Write-Host "`nStitching terrain images..." -ForegroundColor Yellow

Add-Type -AssemblyName System.Drawing

$outputWidth = $gridSize * $tileSize
$outputHeight = $gridSize * $tileSize

$bitmap = New-Object System.Drawing.Bitmap(
    $outputWidth,
    $outputHeight
)

$graphics = [System.Drawing.Graphics]::FromImage($bitmap)

try {

    $graphics.Clear([System.Drawing.Color]::Black)

    for ($row = $minRow; $row -le $maxRow; $row++) {

        for ($col = $minCol; $col -le $maxCol; $col++) {

            $key = "$row,$col"
            $tilePath = $tileFiles[$key]

            $tileImage = [System.Drawing.Image]::FromFile($tilePath)

            try {

                $x = ($col - $minCol) * $tileSize
                $y = ($row - $minRow) * $tileSize

                $graphics.DrawImage(
                    $tileImage,
                    [int]$x,
                    [int]$y,
                    $tileSize,
                    $tileSize
                )

            }
            finally {
                $tileImage.Dispose()
            }
        }
    }

    $outputPath = Join-Path $marsDir "jezero-ctx-mosaic-3x3.png"

    $bitmap.Save(
        $outputPath,
        [System.Drawing.Imaging.ImageFormat]::Png
    )

}
finally {

    $graphics.Dispose()
    $bitmap.Dispose()

}

# ------------------------------------------------------------
# 7. COMPLETION
# ------------------------------------------------------------

Write-Host ""
Write-Host "==============================================" -ForegroundColor Green
Write-Host " JEZERO MOSAIC CREATED SUCCESSFULLY" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green

Write-Host "Output: $outputPath"
Write-Host "Dimensions: $outputWidth x $outputHeight"
Write-Host "Tiles downloaded: $($tileFiles.Count)"
Write-Host "`nOpen the mosaic PNG and inspect the terrain."
