# Simple HTTP server for testing the Vite build
# Run this script to serve the built React app locally

$port = 4173
$buildPath = "D:\Development\simple-cloud-kit-oss\simple-cloud-kit\sck-core-ui\dist"

Write-Host "Starting HTTP server on port $port..."
Write-Host "Serving files from: $buildPath"
Write-Host "Open browser to: http://localhost:$port"
Write-Host "Press Ctrl+C to stop the server"

# Try Vite preview first (recommended for Vite projects)
if (Get-Command npx -ErrorAction SilentlyContinue) {
    Write-Host "Using Vite preview server..."
    npx vite preview --port $port
} elseif (Get-Command python -ErrorAction SilentlyContinue) {
    Write-Host "Using Python HTTP server..."
    Set-Location $buildPath
    python -m http.server $port
} else {
    Write-Host "Install Node.js/npx or Python to run a local server"
    Write-Host "Or use: npx serve -s $buildPath -l $port"
}
