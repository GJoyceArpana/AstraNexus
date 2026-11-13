
# ============================================================
# ASTRA NEXUS - NASA JEZERO TILE VERIFICATION
# Calculates a tile from the downloaded WMTS capabilities
# Downloads and validates the actual PNG response
# ============================================================

$ErrorActionPreference = "Stop"

$projectRoot = $PSScriptRoot
$dataDir = Join-Path $projectRoot "server\data"
$publicMarsDir = Join-Path $projectRoot "public\assets\game\mars"

$xmlPath = Join-Path $dataDir "jezero-ctx-capabilities.xml"

$zoomLevel = "13"

Write-Host ""
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host " ASTRA NEXUS - JEZERO TILE VERIFICATION" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

# ------------------------------------------------------------
# 1. CHECK CAPABILITIES FILE
# ------------------------------------------------------------

if (-not (Test-Path $xmlPath)) {
    throw "Capabilities XML not found: $xmlPath. Run Get-JezeroTerrain.ps1 first."
}

[xml]$xml = Get-Content -Path $xmlPath -Raw

$layerId = "JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0"

$layer = $null

foreach ($item in $xml.SelectNodes("//*[local-name()='Layer']")) {
    $id = $item.SelectSingleNode("./*[local-name()='Identifier']")

    if ($id -and $id.InnerText -eq $layerId) {
        $layer = $item
        break
    }
}

if (-not $layer) {
    throw "Jezero layer not found in capabilities XML."
}

# ------------------------------------------------------------
# 2. READ THE CONFIRMED TILE MATRIX SET
# ------------------------------------------------------------

$matrixLink = $layer.SelectSingleNode(
    "./*[local-name()='TileMatrixSetLink']/*[local-name()='TileMatrixSet']"
)

if (-not $matrixLink) {
    throw "No linked tile matrix set found."
}

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
    throw "Linked tile matrix set definition not found."
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
    throw "Zoom level $zoomLevel was not found."
}

$matrixWidth = [double]$matrix.SelectSingleNode(
    "./*[local-name()='MatrixWidth']"
).InnerText

$matrixHeight = [double]$matrix.SelectSingleNode(
    "./*[local-name()='MatrixHeight']"
).InnerText

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

# ------------------------------------------------------------
# 3. READ JEZERO COVERAGE BOUNDING BOX
# ------------------------------------------------------------

$bbox = $layer.SelectSingleNode(
    ".//*[local-name()='BoundingBox']"
)

if (-not $bbox) {
    throw "Geographic bounding box not found."
}

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

# Select the centre of the actual coverage area.
$centerLon = ($minLon + $maxLon) / 2
$centerLat = ($minLat + $maxLat) / 2

# ------------------------------------------------------------
# 4. CALCULATE TILE ROW AND COLUMN
# ------------------------------------------------------------

# This calculation uses the geographic matrix dimensions
# and the geographic top-left origin reported by NASA.

$tileColumn = [math]::Floor(
    (($centerLon - $originX) / 360.0) * $matrixWidth
)

$tileRow = [math]::Floor(
    (($originY - $centerLat) / 180.0) * $matrixHeight
)

if (
    $tileColumn -lt 0 -or
    $tileColumn -ge $matrixWidth -or
    $tileRow -lt 0 -or
    $tileRow -ge $matrixHeight
) {
    throw "Calculated tile is outside the reported matrix dimensions."
}

Write-Host "`nJEZERO COVERAGE CENTRE" -ForegroundColor Cyan
Write-Host "Longitude: $centerLon"
Write-Host "Latitude:  $centerLat"

Write-Host "`nTILE MATRIX" -ForegroundColor Cyan
Write-Host "Matrix set: $matrixSetId"
Write-Host "Zoom:       $zoomLevel"
Write-Host "Width:      $matrixWidth"
Write-Host "Height:     $matrixHeight"

Write-Host "`nCALCULATED TILE" -ForegroundColor Green
Write-Host "Tile column: $tileColumn"
Write-Host "Tile row:    $tileRow"

# ------------------------------------------------------------
# 5. BUILD URL FROM NASA RESOURCE TEMPLATE
# ------------------------------------------------------------

$resource = $layer.SelectSingleNode(
    "./*[local-name()='ResourceURL'][@resourceType='tile']"
)

if (-not $resource) {
    throw "NASA tile ResourceURL template not found."
}

$tileUrl = $resource.GetAttribute("template")

$tileUrl = $tileUrl.Replace(
    "{Style}",
    "default"
)

$tileUrl = $tileUrl.Replace(
    "{TileMatrixSet}",
    $matrixSetId
)

$tileUrl = $tileUrl.Replace(
    "{TileMatrix}",
    $zoomLevel
)

$tileUrl = $tileUrl.Replace(
    "{TileRow}",
    [string]$tileRow
)

$tileUrl = $tileUrl.Replace(
    "{TileCol}",
    [string]$tileColumn
)

Write-Host "`nNASA TILE URL" -ForegroundColor Cyan
Write-Host $tileUrl

# ------------------------------------------------------------
# 6. DOWNLOAD TILE
# ------------------------------------------------------------

New-Item -ItemType Directory -Force -Path $publicMarsDir | Out-Null

$tileFileName = "jezero-ctx-z$zoomLevel-r$tileRow-c$tileColumn.png"
$tilePath = Join-Path $publicMarsDir $tileFileName

Write-Host "`nDownloading NASA terrain tile..." -ForegroundColor Yellow

try {

    $response = Invoke-WebRequest `
        -Uri $tileUrl `
        -UseBasicParsing `
        -OutFile $tilePath `
        -PassThru `
        -TimeoutSec 60

    Write-Host "HTTP status: $([int]$response.StatusCode)"

}
catch {

    Write-Host "`nTILE DOWNLOAD FAILED" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Yellow

    if ($_.Exception.Response) {
        try {
            Write-Host "HTTP status: $([int]$_.Exception.Response.StatusCode)"
        } catch {}
    }

    exit 1
}

# ------------------------------------------------------------
# 7. VERIFY PNG FILE
# ------------------------------------------------------------

if (-not (Test-Path $tilePath)) {
    throw "Tile file was not created."
}

$fileInfo = Get-Item $tilePath

if ($fileInfo.Length -lt 8) {
    throw "Downloaded file is too small to be a valid PNG."
}

$bytes = [System.IO.File]::ReadAllBytes($tilePath)

$pngSignature = @(137, 80, 78, 71, 13, 10, 26, 10)

$isPng = $true

for ($i = 0; $i -lt 8; $i++) {
    if ($bytes[$i] -ne $pngSignature[$i]) {
        $isPng = $false
        break
    }
}

if (-not $isPng) {
    Write-Host "`nThe response is not a valid PNG image." -ForegroundColor Red
    Write-Host "First bytes: $($bytes[0..([math]::Min(31, $bytes.Length - 1))] -join ', ')"
    throw "NASA response could not be validated as PNG."
}

# Read PNG width and height from IHDR.
$width = [System.Net.IPAddress]::NetworkToHostOrder(
    [BitConverter]::ToInt32($bytes, 16)
)

$height = [System.Net.IPAddress]::NetworkToHostOrder(
    [BitConverter]::ToInt32($bytes, 20)
)

Write-Host "`n==============================================" -ForegroundColor Green
Write-Host " NASA TILE DOWNLOADED AND PNG SIGNATURE VERIFIED" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green

Write-Host "File:       $tilePath"
Write-Host "Size:       $($fileInfo.Length) bytes"
Write-Host "Dimensions: $width x $height pixels"

Write-Host "`nNext: inspect the image and integrate it into ASTRA NEXUS."
