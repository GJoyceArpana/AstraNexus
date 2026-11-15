# ============================================================
# ASTRA NEXUS - ARCADIA PLANITIA TERRAIN MOSAIC BUILDER
#
# NASA Mars Trek WMTS
# MRO CTX Arcadia Planitia Mosaic
#
# Downloads 3x3 neighbouring tiles
# Stitches them into a 768 x 768 PNG
#
# ============================================================

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

# ------------------------------------------------------------
# 1. PROJECT CONFIGURATION
# ------------------------------------------------------------

$projectRoot = $PSScriptRoot

$dataDir = Join-Path $projectRoot "server\data"

$marsDir = Join-Path $projectRoot "public\assets\game\mars"

$xmlPath = Join-Path $dataDir "arcadia-planitia-ctx-capabilities.xml"

$layerId = "Arcadia_Planitia_CTX_BlockAdj_dd"

$zoomLevel = "12"

$gridSize = 3

$radius = [math]::Floor($gridSize / 2)

# Mars 2000 sphere radius in metres.
# Used when the TileMatrixSet TopLeftCorner is in projected metres.
$marsRadius = 3396190.0

$culture = [Globalization.CultureInfo]::InvariantCulture

Write-Host ""

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host " ASTRA NEXUS - ARCADIA PLANITIA MOSAIC BUILDER" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

Write-Host "`nProject root: $projectRoot"
Write-Host "Data directory: $dataDir"
Write-Host "Mars assets: $marsDir"
Write-Host "Layer: $layerId"
Write-Host "Zoom: $zoomLevel"
Write-Host "Grid: ${gridSize}x${gridSize}"

# ------------------------------------------------------------
# 2. CHECK REQUIRED FILES
# ------------------------------------------------------------

Write-Host "`n[1/9] Checking required files..." -ForegroundColor Yellow

if (-not (Test-Path $xmlPath)) {

    throw @"
NASA WMTS capabilities XML not found.

Expected:
$xmlPath

Run Get-ArcadiaPlanitiaTerrain.ps1 first.
"@

}

New-Item -ItemType Directory -Force -Path $marsDir | Out-Null

Write-Host "Capabilities XML found." -ForegroundColor Green

# ------------------------------------------------------------
# 3. LOAD NASA WMTS CAPABILITIES
# ------------------------------------------------------------

Write-Host "`n[2/9] Loading NASA WMTS capabilities..." -ForegroundColor Yellow

[xml]$xml = Get-Content -Path $xmlPath -Raw

$layer = $null

foreach ($item in $xml.SelectNodes("//*[local-name()='Layer']")) {

    $id = $item.SelectSingleNode(
        "./*[local-name()='Identifier']"
    )

    if ($id -and $id.InnerText -eq $layerId) {

        $layer = $item

        break

    }

}

if (-not $layer) {

    throw "Arcadia Planitia CTX layer not found in capabilities XML."

}

Write-Host "Arcadia Planitia layer found." -ForegroundColor Green

# ------------------------------------------------------------
# 4. FIND THE TILE MATRIX SET
# ------------------------------------------------------------

Write-Host "`n[3/9] Finding linked tile matrix set..." -ForegroundColor Yellow

$matrixLinks = $layer.SelectNodes(
    "./*[local-name()='TileMatrixSetLink']"
)

if ($matrixLinks.Count -eq 0) {

    throw "No tile matrix set links found."

}

$matrixSet = $null

$matrixSetId = $null

foreach ($link in $matrixLinks) {

    $linkId = $link.SelectSingleNode(
        "./*[local-name()='TileMatrixSet']"
    )

    if (-not $linkId) {
        continue
    }

    foreach ($set in $xml.SelectNodes("//*[local-name()='TileMatrixSet']")) {

        $setIdentifier = $set.SelectSingleNode(
            "./*[local-name()='Identifier']"
        )

        if (
            $setIdentifier -and
            $setIdentifier.InnerText -eq $linkId.InnerText
        ) {

            $matrixSet = $set

            $matrixSetId = $linkId.InnerText

            break

        }

    }

    if ($matrixSet) {
        break
    }

}

if (-not $matrixSet) {

    throw "Unable to find the linked tile matrix set."

}

$crsNode = $matrixSet.SelectSingleNode(
    "./*[local-name()='SupportedCRS']"
)

if (-not $crsNode) {

    throw "Tile matrix set CRS not found."

}

$crs = $crsNode.InnerText

Write-Host "Matrix set: $matrixSetId" -ForegroundColor Green
Write-Host "CRS: $crs" -ForegroundColor Green

if ($crs -notmatch "104905") {

    throw @"
Unexpected coordinate reference system.

Expected NASA Mars equirectangular CRS EPSG:104905.
Received: $crs

Do not use the Mars projection calculation without checking
the actual matrix coordinate system.
"@

}

# ------------------------------------------------------------
# 5. FIND REQUESTED ZOOM LEVEL
# ------------------------------------------------------------

Write-Host "`n[4/9] Checking zoom level..." -ForegroundColor Yellow

$matrix = $null

foreach ($item in $matrixSet.SelectNodes("./*[local-name()='TileMatrix']")) {

    $id = $item.SelectSingleNode(
        "./*[local-name()='Identifier']"
    )

    if ($id -and $id.InnerText -eq $zoomLevel) {

        $matrix = $item

        break

    }

}

if (-not $matrix) {

    Write-Host "`nAvailable zoom levels:" -ForegroundColor Yellow

    foreach ($item in $matrixSet.SelectNodes("./*[local-name()='TileMatrix']")) {

        $id = $item.SelectSingleNode(
            "./*[local-name()='Identifier']"
        )

        if ($id) {

            Write-Host " - $($id.InnerText)"

        }

    }

    throw "Zoom level $zoomLevel is unavailable."

}

$matrixWidth = [int]$matrix.SelectSingleNode(
    "./*[local-name()='MatrixWidth']"
).InnerText

$matrixHeight = [int]$matrix.SelectSingleNode(
    "./*[local-name()='MatrixHeight']"
).InnerText

$tileWidth = [int]$matrix.SelectSingleNode(
    "./*[local-name()='TileWidth']"
).InnerText

$tileHeight = [int]$matrix.SelectSingleNode(
    "./*[local-name()='TileHeight']"
).InnerText

$scaleDenominator = [double]::Parse(
    $matrix.SelectSingleNode(
        "./*[local-name()='ScaleDenominator']"
    ).InnerText,
    $culture
)

if ($tileWidth -ne 256 -or $tileHeight -ne 256) {

    throw "Expected 256x256 tiles. Actual: ${tileWidth}x${tileHeight}"

}

if ($scaleDenominator -le 0) {

    throw "Invalid tile matrix scale denominator."

}

Write-Host "Zoom level: $zoomLevel" -ForegroundColor Green
Write-Host "Matrix: ${matrixWidth}x${matrixHeight}"
Write-Host "Tile size: ${tileWidth}x${tileHeight}"
Write-Host "Scale denominator: $scaleDenominator"

# ------------------------------------------------------------
# 6. EXTRACT GEOGRAPHIC COVERAGE
# ------------------------------------------------------------

Write-Host "`n[5/9] Reading Arcadia Planitia coverage..." -ForegroundColor Yellow

$bbox = $layer.SelectSingleNode(
    "./*[local-name()='WGS84BoundingBox']"
)

if (-not $bbox) {

    throw "WGS84 geographic bounding box not found."

}

$lowerNode = $bbox.SelectSingleNode(
    "./*[local-name()='LowerCorner']"
)

$upperNode = $bbox.SelectSingleNode(
    "./*[local-name()='UpperCorner']"
)

if (-not $lowerNode -or -not $upperNode) {

    throw "Bounding box coordinates are incomplete."

}

$lower = $lowerNode.InnerText.Trim() -split '\s+'

$upper = $upperNode.InnerText.Trim() -split '\s+'

$minLon = [double]::Parse($lower[0], $culture)

$minLat = [double]::Parse($lower[1], $culture)

$maxLon = [double]::Parse($upper[0], $culture)

$maxLat = [double]::Parse($upper[1], $culture)

$centerLon = ($minLon + $maxLon) / 2.0

$centerLat = ($minLat + $maxLat) / 2.0

Write-Host "`nArcadia geographic coverage:" -ForegroundColor Cyan

Write-Host "Minimum longitude: $minLon"
Write-Host "Maximum longitude: $maxLon"
Write-Host "Minimum latitude: $minLat"
Write-Host "Maximum latitude: $maxLat"

Write-Host "`nCoverage centre:" -ForegroundColor Green

Write-Host "Longitude: $centerLon"
Write-Host "Latitude: $centerLat"

# ------------------------------------------------------------
# 7. INSPECT TOPLEFTCORNER & CALCULATE WMTS TILE COORDINATES
# ------------------------------------------------------------

Write-Host "`n[6/9] Calculating WMTS tile coordinates..." -ForegroundColor Yellow

$topLeft = $matrix.SelectSingleNode(
    "./*[local-name()='TopLeftCorner']"
)

if (-not $topLeft) {

    throw "Tile matrix TopLeftCorner not found."

}

$origin = $topLeft.InnerText.Trim() -split '\s+'

$rawOrigin0 = [double]::Parse($origin[0], $culture)

$rawOrigin1 = [double]::Parse($origin[1], $culture)

Write-Host "TopLeftCorner raw: $rawOrigin0 $rawOrigin1"

# Determine whether TopLeftCorner is in decimal degrees (e.g. -180 90 or 90 -180)
# or projected Mars equirectangular metres (e.g. -10669445.55 5334722.78).
$isDegreeMatrix = ([math]::Abs($rawOrigin0) -le 360.0) -and ([math]::Abs($rawOrigin1) -le 360.0)

if ($isDegreeMatrix) {

    # Handle axis order: (Lon, Lat) = (-180, 90) vs (Lat, Lon) = (90, -180)
    if ([math]::Abs($rawOrigin0) -eq 90.0 -and [math]::Abs($rawOrigin1) -eq 180.0) {
        $originY = $rawOrigin0   # +90 deg latitude
        $originX = $rawOrigin1   # -180 deg longitude
    }
    else {
        $originX = $rawOrigin0   # -180 deg longitude
        $originY = $rawOrigin1   # +90 deg latitude
    }

    # Normalize longitude to match matrix origin convention (-180..180 vs 0..360)
    $targetLon = $centerLon
    if ($originX -ge 0.0 -and $targetLon -lt 0.0) {
        $targetLon += 360.0
    }
    elseif ($originX -lt 0.0 -and $targetLon -gt 180.0) {
        $targetLon -= 360.0
    }

    $targetLat = $centerLat

    $tileSpanX = 360.0 / [double]$matrixWidth
    $tileSpanY = 180.0 / [double]$matrixHeight

    Write-Host "Matrix units: Decimal Degrees (originX=$originX, originY=$originY)" -ForegroundColor Green
    Write-Host "Degrees per tile: X=$tileSpanX, Y=$tileSpanY"

    $centerCol = [int][math]::Floor(
        ($targetLon - $originX) / $tileSpanX
    )

    $centerRow = [int][math]::Floor(
        ($originY - $targetLat) / $tileSpanY
    )

}
else {

    # Projected Mars equirectangular metres:
    # X = R * longitude in radians, Y = R * latitude in radians
    $originX = $rawOrigin0
    $originY = $rawOrigin1

    $centerX = $marsRadius * ($centerLon * [math]::PI / 180.0)
    $centerY = $marsRadius * ($centerLat * [math]::PI / 180.0)

    # WMTS standard pixel size: 0.28 mm
    $metersPerPixel = $scaleDenominator * 0.00028
    $tileSpanX = $metersPerPixel * $tileWidth
    $tileSpanY = $metersPerPixel * $tileHeight

    Write-Host "Matrix units: Projected Metres (originX=$originX, originY=$originY)" -ForegroundColor Green
    Write-Host "Projected X: $centerX metres"
    Write-Host "Projected Y: $centerY metres"
    Write-Host "Metres per pixel: $metersPerPixel"

    $centerCol = [int][math]::Floor(
        ($centerX - $originX) / $tileSpanX
    )

    $centerRow = [int][math]::Floor(
        ($originY - $centerY) / $tileSpanY
    )

}

$minCol = $centerCol - $radius

$maxCol = $centerCol + $radius

$minRow = $centerRow - $radius

$maxRow = $centerRow + $radius

Write-Host "`nCentre tile:" -ForegroundColor Green

Write-Host "Row: $centerRow"
Write-Host "Column: $centerCol"

Write-Host "`nRequested tile range:" -ForegroundColor Cyan

Write-Host "Rows: $minRow to $maxRow"
Write-Host "Columns: $minCol to $maxCol"

# Validate matrix boundaries.

if (
    $minCol -lt 0 -or
    $maxCol -ge $matrixWidth -or
    $minRow -lt 0 -or
    $maxRow -ge $matrixHeight
) {

    throw "Requested mosaic extends outside the tile matrix (valid rows: 0..$($matrixHeight - 1), valid cols: 0..$($matrixWidth - 1))."

}

# ------------------------------------------------------------
# 8. GET NASA TILE URL TEMPLATE
# ------------------------------------------------------------

Write-Host "`n[7/9] Reading NASA tile URL template..." -ForegroundColor Yellow

$resource = $layer.SelectSingleNode(
    "./*[local-name()='ResourceURL'][@resourceType='tile']"
)

if (-not $resource) {

    throw "NASA REST tile URL template not found."

}

$urlTemplate = $resource.GetAttribute("template")

if ([string]::IsNullOrWhiteSpace($urlTemplate)) {

    throw "NASA tile URL template is empty."

}

$styleNode = $layer.SelectSingleNode(
    "./*[local-name()='Style']/*[local-name()='Identifier']"
)

if (-not $styleNode) {

    throw "NASA tile style identifier not found."

}

$style = $styleNode.InnerText

$format = $resource.GetAttribute("format")

if ([string]::IsNullOrWhiteSpace($format)) {

    throw "Tile image format is missing."

}

Write-Host "Style: $style"
Write-Host "Format: $format"
Write-Host "Template: $urlTemplate"

# ------------------------------------------------------------
# 9. DOWNLOAD NINE NASA TILES
# ------------------------------------------------------------

Write-Host "`nDownloading Arcadia Planitia tiles..." -ForegroundColor Yellow

$tileFiles = @{}

$totalTiles = $gridSize * $gridSize

$downloaded = 0

for ($row = $minRow; $row -le $maxRow; $row++) {

    for ($col = $minCol; $col -le $maxCol; $col++) {

        $downloaded++

        $tileName = "arcadia-planitia-z$zoomLevel-r$row-c$col.png"

        $tilePath = Join-Path $marsDir $tileName

        $tileUrl = $urlTemplate

        $tileUrl = $tileUrl.Replace("{Style}", $style)

        $tileUrl = $tileUrl.Replace("{TileMatrixSet}", $matrixSetId)

        $tileUrl = $tileUrl.Replace("{TileMatrix}", $zoomLevel)

        $tileUrl = $tileUrl.Replace("{TileRow}", [string]$row)

        $tileUrl = $tileUrl.Replace("{TileCol}", [string]$col)

        Write-Host "`n[$downloaded/$totalTiles] Row $row, Column $col" -ForegroundColor Cyan

        Write-Host $tileUrl -ForegroundColor Gray

        try {

            Invoke-WebRequest `
                -Uri $tileUrl `
                -UseBasicParsing `
                -OutFile $tilePath `
                -TimeoutSec 90

            if (-not (Test-Path $tilePath)) {

                throw "Tile file was not created."

            }

            if ((Get-Item $tilePath).Length -eq 0) {

                throw "Downloaded tile is empty."

            }

            $tileImage = [System.Drawing.Image]::FromFile($tilePath)

            try {

                if (
                    $tileImage.Width -ne $tileWidth -or
                    $tileImage.Height -ne $tileHeight
                ) {

                    throw "Unexpected image dimensions: $($tileImage.Width)x$($tileImage.Height)"

                }

            }
            finally {

                $tileImage.Dispose()

            }

            $tileFiles["$row,$col"] = $tilePath

            Write-Host "Download successful." -ForegroundColor Green

        }
        catch {

            if (Test-Path $tilePath) {

                Remove-Item $tilePath -Force -ErrorAction SilentlyContinue

            }

            Write-Host "DOWNLOAD FAILED" -ForegroundColor Red

            Write-Host $_.Exception.Message -ForegroundColor Yellow

            throw "Failed to download tile row $row, column $col."

        }

    }

}

if ($tileFiles.Count -ne $totalTiles) {

    throw "Not all required tiles were downloaded."

}

# ------------------------------------------------------------
# 10. STITCH THE NINE TILES
# ------------------------------------------------------------

Write-Host "`n[8/9] Stitching terrain images..." -ForegroundColor Yellow

$outputWidth = $gridSize * $tileWidth

$outputHeight = $gridSize * $tileHeight

$outputPath = Join-Path $marsDir "arcadia-planitia-ctx-mosaic-3x3.png"

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

            if (-not $tilePath) {

                throw "Missing downloaded tile: $key"

            }

            $tileImage = [System.Drawing.Image]::FromFile($tilePath)

            try {

                $x = ($col - $minCol) * $tileWidth

                $y = ($row - $minRow) * $tileHeight

                $graphics.DrawImage(
                    $tileImage,
                    [int]$x,
                    [int]$y,
                    $tileWidth,
                    $tileHeight
                )

                Write-Host "Placed tile: $key" -ForegroundColor Green

            }
            finally {

                $tileImage.Dispose()

            }

        }

    }

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
# 11. VERIFY FINAL MOSAIC
# ------------------------------------------------------------

Write-Host "`n[9/9] Verifying final mosaic..." -ForegroundColor Yellow

if (-not (Test-Path $outputPath)) {

    throw "Final mosaic image was not created."

}

$finalImage = [System.Drawing.Image]::FromFile($outputPath)

try {

    if (
        $finalImage.Width -ne $outputWidth -or
        $finalImage.Height -ne $outputHeight
    ) {

        throw "Final mosaic dimensions are incorrect."

    }

    Write-Host "Final image dimensions verified." -ForegroundColor Green

}
finally {

    $finalImage.Dispose()

}

# ------------------------------------------------------------
# 12. COMPLETION
# ------------------------------------------------------------

Write-Host ""

Write-Host "====================================================" -ForegroundColor Green
Write-Host " ARCADIA PLANITIA MOSAIC CREATED SUCCESSFULLY" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Green

Write-Host "`nLocation: Arcadia Planitia"

Write-Host "Layer: $layerId"

Write-Host "Zoom level: $zoomLevel"

Write-Host "Centre row: $centerRow"

Write-Host "Centre column: $centerCol"

Write-Host "Tiles downloaded: $($tileFiles.Count)"

Write-Host "Output dimensions: ${outputWidth}x${outputHeight}"

Write-Host "`nOUTPUT IMAGE:" -ForegroundColor Cyan

Write-Host $outputPath -ForegroundColor Green

Write-Host "`nTerrain mosaic successfully generated!" -ForegroundColor Green

Write-Host "`nOpen the PNG and inspect the Arcadia terrain."