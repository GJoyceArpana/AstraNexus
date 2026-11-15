
# ============================================================
# ASTRA NEXUS - ARCADIA PLANITIA TERRAIN RETRIEVAL
# NASA Mars Trek WMTS Capabilities Inspector
# ============================================================

$ErrorActionPreference = "Stop"

# ------------------------------------------------------------
# 1. PROJECT CONFIGURATION
# ------------------------------------------------------------

$projectRoot = $PSScriptRoot

$layerId = "Arcadia_Planitia_CTX_BlockAdj_dd"

$baseUrl = "https://trek.nasa.gov/tiles/Mars/EQ/$layerId/1.0.0"
$capsUrl = "$baseUrl/WMTSCapabilities.xml"

$dataDir = Join-Path $projectRoot "server\data"

New-Item -ItemType Directory -Force -Path $dataDir | Out-Null

$xmlPath = Join-Path $dataDir "arcadia-planitia-ctx-capabilities.xml"

Write-Host ""
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host " ASTRA NEXUS - ARCADIA PLANITIA TERRAIN RETRIEVAL" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

Write-Host "`nProject directory: $projectRoot"
Write-Host "Output directory: $dataDir"
Write-Host "Layer ID: $layerId"

# ------------------------------------------------------------
# 2. DOWNLOAD WMTS CAPABILITIES XML
# ------------------------------------------------------------

Write-Host "`n[1/5] Requesting NASA Mars Trek capabilities..." -ForegroundColor Yellow
Write-Host $capsUrl -ForegroundColor Gray

try {

    $response = Invoke-WebRequest `
        -Uri $capsUrl `
        -UseBasicParsing `
        -TimeoutSec 45

    if ($response.StatusCode -ne 200) {
        throw "Unexpected HTTP status: $($response.StatusCode)"
    }

    $xmlContent = $response.Content

    if ([string]::IsNullOrWhiteSpace($xmlContent)) {
        throw "NASA returned an empty response."
    }

    [System.IO.File]::WriteAllText(
        $xmlPath,
        $xmlContent,
        [System.Text.Encoding]::UTF8
    )

    Write-Host "Capabilities downloaded successfully!" -ForegroundColor Green
    Write-Host "Saved: $xmlPath" -ForegroundColor Green

}
catch {

    Write-Host "`nCAPABILITIES DOWNLOAD FAILED" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Yellow

    if ($_.Exception.Response) {
        try {
            Write-Host "HTTP Status: $([int]$_.Exception.Response.StatusCode)"
        } catch {}
    }

    exit 1
}

# ------------------------------------------------------------
# 3. PARSE XML
# ------------------------------------------------------------

Write-Host "`n[2/5] Parsing WMTS XML..." -ForegroundColor Yellow

try {

    [xml]$xml = $xmlContent

    $layers = $xml.SelectNodes("//*[local-name()='Layer']")

    $layer = $null

    foreach ($item in $layers) {

        $identifier = $item.SelectSingleNode(
            "./*[local-name()='Identifier']"
        )

        if ($identifier -and $identifier.InnerText -eq $layerId) {
            $layer = $item
            break
        }
    }

    if (-not $layer) {
        throw "Arcadia Planitia CTX layer was not found."
    }

    Write-Host "Layer found!" -ForegroundColor Green
    Write-Host "Identifier: $layerId"

}
catch {

    Write-Host "`nXML PARSING FAILED" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Yellow
    exit 1
}

# ------------------------------------------------------------
# 4. EXTRACT LAYER INFORMATION
# ------------------------------------------------------------

Write-Host "`n[3/5] Extracting layer configuration..." -ForegroundColor Yellow

Write-Host "`nLAYER IDENTIFIER" -ForegroundColor Cyan
Write-Host $layerId -ForegroundColor Green

# IMAGE FORMATS

Write-Host "`nIMAGE FORMATS" -ForegroundColor Cyan

$formats = $layer.SelectNodes("./*[local-name()='Format']")

foreach ($format in $formats) {
    Write-Host " - $($format.InnerText)"
}

# STYLES

Write-Host "`nSTYLES" -ForegroundColor Cyan

$styles = $layer.SelectNodes("./*[local-name()='Style']")

foreach ($style in $styles) {

    $styleId = $style.SelectSingleNode(
        "./*[local-name()='Identifier']"
    )

    if ($styleId) {
        Write-Host " - $($styleId.InnerText)"
    }
}

# RESOURCE URL TEMPLATES

Write-Host "`nRESOURCE URL TEMPLATES" -ForegroundColor Cyan

$resources = $layer.SelectNodes("./*[local-name()='ResourceURL']")

foreach ($resource in $resources) {

    Write-Host "Format: $($resource.GetAttribute('format'))"
    Write-Host "Resource type: $($resource.GetAttribute('resourceType'))"
    Write-Host "Template: $($resource.GetAttribute('template'))"
    Write-Host ""
}

# TILE MATRIX SET LINKS

Write-Host "TILE MATRIX SET LINKS" -ForegroundColor Cyan

$matrixLinks = $layer.SelectNodes(
    "./*[local-name()='TileMatrixSetLink']"
)

$linkedMatrixSetIds = @()

foreach ($link in $matrixLinks) {

    $matrixSet = $link.SelectSingleNode(
        "./*[local-name()='TileMatrixSet']"
    )

    if ($matrixSet) {

        $linkedMatrixSetIds += $matrixSet.InnerText

        Write-Host " - $($matrixSet.InnerText)" -ForegroundColor Green
    }
}

# GEOGRAPHIC COVERAGE

Write-Host "`nGEOGRAPHIC COVERAGE" -ForegroundColor Cyan

$coverage = $layer.SelectSingleNode(
    "./*[local-name()='WGS84BoundingBox']"
)

if (-not $coverage) {
    $coverage = $layer.SelectSingleNode(
        "./*[local-name()='BoundingBox']"
    )
}

if ($coverage) {

    Write-Host $coverage.OuterXml

}
else {

    Write-Host "No bounding box found." -ForegroundColor Yellow

}

# ------------------------------------------------------------
# 5. EXTRACT TILE MATRIX INFORMATION
# ------------------------------------------------------------

Write-Host "`n[4/5] Extracting tile matrix details..." -ForegroundColor Yellow

$matrixSets = $xml.SelectNodes("//*[local-name()='TileMatrixSet']")

$matrixResults = @()

foreach ($set in $matrixSets) {

    $setId = $set.SelectSingleNode(
        "./*[local-name()='Identifier']"
    )

    if (-not $setId) {
        continue
    }

    if ($linkedMatrixSetIds -notcontains $setId.InnerText) {
        continue
    }

    $crs = $set.SelectSingleNode(
        "./*[local-name()='SupportedCRS']"
    )

    Write-Host "`nMATRIX SET: $($setId.InnerText)" -ForegroundColor Cyan

    if ($crs) {
        Write-Host "CRS: $($crs.InnerText)"
    }

    $matrices = $set.SelectNodes(
        "./*[local-name()='TileMatrix']"
    )

    foreach ($matrix in $matrices) {

        $values = [ordered]@{}

        foreach ($field in @(
            "Identifier",
            "ScaleDenominator",
            "TopLeftCorner",
            "TileWidth",
            "TileHeight",
            "MatrixWidth",
            "MatrixHeight"
        )) {

            $node = $matrix.SelectSingleNode(
                "./*[local-name()='$field']"
            )

            if ($node) {
                $values[$field] = $node.InnerText
            }
        }

        $matrixResults += [PSCustomObject]$values

        Write-Host ($values | ConvertTo-Json -Compress)
    }
}

# ------------------------------------------------------------
# 6. SAVE METADATA
# ------------------------------------------------------------

$metadata = [PSCustomObject]@{
    source = "NASA Mars Trek"
    location = "Arcadia Planitia"
    layer = $layerId
    capabilitiesUrl = $capsUrl

    formats = @(
        $formats | ForEach-Object { $_.InnerText }
    )

    styles = @(
        $styles | ForEach-Object {
            $id = $_.SelectSingleNode(
                "./*[local-name()='Identifier']"
            )
            if ($id) { $id.InnerText }
        }
    )

    matrixSets = $linkedMatrixSetIds
    matrices = $matrixResults

    retrievedAt = (Get-Date).ToUniversalTime().ToString("o")
}

$metadataPath = Join-Path $dataDir "arcadia-planitia-ctx-metadata.json"

$metadata | ConvertTo-Json -Depth 10 |
    Set-Content -Path $metadataPath -Encoding UTF8

Write-Host "`nMetadata saved: $metadataPath" -ForegroundColor Green

# ------------------------------------------------------------
# 7. COMPLETION
# ------------------------------------------------------------

Write-Host "`n[5/5] CAPABILITIES INSPECTION COMPLETE" -ForegroundColor Green

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "ARCADIA PLANITIA WMTS: SUCCESSFULLY RETRIEVED" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Cyan

Write-Host "`nFiles created:"
Write-Host "1. $xmlPath"
Write-Host "2. $metadataPath"

Write-Host "`nAvailable tile matrix levels are listed above."
Write-Host "Next step: calculate valid Arcadia Planitia tile coordinates."

Write-Host "`nPlease inspect the complete terminal output." -ForegroundColor Yellow
