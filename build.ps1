# Build my nodejs app for production for serving static pages

# Set error action preference to stop on any error
$ErrorActionPreference = "Stop"

# Function to write colored output
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    } else {
        $input | Write-Output
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

# Function to log messages with timestamp
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    switch ($Level) {
        "INFO"  { Write-ColorOutput Cyan "[$timestamp] [INFO] $Message" }
        "WARN"  { Write-ColorOutput Yellow "[$timestamp] [WARN] $Message" }
        "ERROR" { Write-ColorOutput Red "[$timestamp] [ERROR] $Message" }
        "SUCCESS" { Write-ColorOutput Green "[$timestamp] [SUCCESS] $Message" }
    }
}

# Set variables
$PROJECT_DIR = Get-Location
$BUILD_DIR = Join-Path $PROJECT_DIR "dist"  # Vite uses 'dist' by default
$NODE_MODULES_DIR = Join-Path $PROJECT_DIR "node_modules"

Write-Log "Starting Vite React application build process..." "INFO"
Write-Log "Project directory: $PROJECT_DIR" "INFO"

try {
    # Check if package.json exists
    if (-not (Test-Path "package.json")) {
        throw "package.json not found in current directory. Are you in the correct React project folder?"
    }

    # Check if Node.js is installed
    Write-Log "Checking Node.js installation..." "INFO"
    try {
        $nodeVersion = node --version
        Write-Log "Node.js version: $nodeVersion" "INFO"
    }
    catch {
        throw "Node.js is not installed or not in PATH. Please install Node.js first."
    }

    # Check if yarn is available
    try {
        $yarnVersion = yarn --version
        Write-Log "yarn version: $yarnVersion" "INFO"
    }
    catch {
        throw "yarn is not available. Please install yarn globally with: npm install -g yarn"
    }

    # Clean previous builds
    Write-Log "Cleaning previous builds..." "INFO"
    if (Test-Path $BUILD_DIR) {
        Remove-Item -Path $BUILD_DIR -Recurse -Force
        Write-Log "Removed existing dist directory" "INFO"
    }
    
    # Clean Vite cache and temp files
    if (Test-Path "node_modules\.vite") {
        Remove-Item -Path "node_modules\.vite" -Recurse -Force -ErrorAction SilentlyContinue
        Write-Log "Cleaned Vite cache" "INFO"
    }

    # Install dependencies if node_modules doesn't exist OR force install
    Write-Log "Installing/updating dependencies..." "INFO"
    # Clean install to fix potential Vite version conflicts
    if (Test-Path $NODE_MODULES_DIR) {
        Remove-Item -Path $NODE_MODULES_DIR -Recurse -Force
        Write-Log "Removed existing node_modules directory" "INFO"
    }
    
    if (Test-Path "yarn.lock") {
        Remove-Item -Path "yarn.lock" -Force
        Write-Log "Removed yarn.lock for clean install" "INFO"
    }
    
    if (Test-Path "package-lock.json") {
        Remove-Item -Path "package-lock.json" -Force -ErrorAction SilentlyContinue
        Write-Log "Removed package-lock.json (npm artifact)" "INFO"
    }
    
    if (Test-Path ".vite") {
        Remove-Item -Path ".vite" -Recurse -Force -ErrorAction SilentlyContinue
        Write-Log "Removed .vite cache directory" "INFO"
    }
    
    # Clear yarn cache
    Write-Log "Clearing yarn cache..." "INFO"
    yarn cache clean
     
    # Fresh install
    Write-Log "Performing fresh yarn install..." "INFO"
    yarn install
    if ($LASTEXITCODE -ne 0) {
        throw "yarn install failed"
    }
    
    # Verify Vite installation
    npx vite --version
    Write-Log "Dependencies installed successfully" "SUCCESS"

    # NODE_ENV is handled by Vite's --mode flag
    Write-Log "Using Vite production mode" "INFO"

    # Run the build command using yarn
    Write-Log "Building Vite React application for production..." "INFO"
    
    # Standard Vite build with yarn
    yarn build
    if ($LASTEXITCODE -ne 0) {
        Write-Log "yarn build failed, trying npx vite build..." "WARN"
        npx vite build
        if ($LASTEXITCODE -ne 0) {
            throw "Both yarn build and npx vite build failed"
        }
    }
    
    Write-Log "Build completed successfully!" "SUCCESS"
     
    # Verify build output (Vite uses 'dist' folder by default)
    if (Test-Path $BUILD_DIR) {
        $buildSize = (Get-ChildItem -Path $BUILD_DIR -Recurse | Measure-Object -Property Length -Sum).Sum
        $buildSizeMB = [math]::Round($buildSize / 1MB, 2)
        Write-Log "Build completed successfully!" "SUCCESS"
        Write-Log "Build directory: $BUILD_DIR" "INFO"
        Write-Log "Build size: $buildSizeMB MB" "INFO"
        
        # List main build files
        Write-Log "Build contents:" "INFO"
        Get-ChildItem -Path $BUILD_DIR | ForEach-Object {
            Write-Log "  - $($_.Name)" "INFO"
        }
    } else {
        throw "Build directory not found after build process"
    }

    # Create a simple HTTP server script for testing (updated for Vite/dist)
    $serverScript = @"
# Simple HTTP server for testing the Vite build
# Run this script to serve the built React app locally

`$port = 4173
`$buildPath = "$BUILD_DIR"

Write-Host "Starting HTTP server on port `$port..."
Write-Host "Serving files from: `$buildPath"
Write-Host "Open browser to: http://localhost:`$port"
Write-Host "Press Ctrl+C to stop the server"

# Try Vite preview first (recommended for Vite projects)
if (Get-Command npx -ErrorAction SilentlyContinue) {
    Write-Host "Using Vite preview server..."
    npx vite preview --port `$port
} elseif (Get-Command python -ErrorAction SilentlyContinue) {
    Write-Host "Using Python HTTP server..."
    Set-Location `$buildPath
    python -m http.server `$port
} else {
    Write-Host "Install Node.js/npx or Python to run a local server"
    Write-Host "Or use: npx serve -s `$buildPath -l `$port"
}
"@

    $serverScript | Out-File -FilePath "serve-build.ps1" -Encoding UTF8
    Write-Log "Created serve-build.ps1 for testing the build locally" "INFO"

    # Build summary
    Write-Log "======================================" "SUCCESS"
    Write-Log "Vite React Build Summary:" "SUCCESS"
    Write-Log "✓ Dependencies installed/updated" "SUCCESS"
    Write-Log "✓ Previous builds cleaned" "SUCCESS"
    Write-Log "✓ Production build created with Vite" "SUCCESS"
    Write-Log "✓ Build verification passed" "SUCCESS"
    Write-Log "======================================" "SUCCESS"
    Write-Log "" "INFO"
    Write-Log "Next steps:" "INFO"
    Write-Log "1. Test the build locally: .\serve-build.ps1" "INFO"
    Write-Log "2. Deploy the '$BUILD_DIR' folder to your web server" "INFO"
    Write-Log "3. Configure your web server to serve index.html for all routes (SPA routing)" "INFO"

} catch {
    Write-Log "Build failed: $($_.Exception.Message)" "ERROR"
    exit 1
}

# Copy build to FastAPI static folder with error handling
$STATIC_DIRS = @(
    "..\..\sck-core-api\core_api\static",
    "..\..\sck-core-docker-server\static", 
    "..\..\sck-core-docker\static"
)

Write-Log "Copying build files to multiple static directories..." "INFO"

foreach ($STATIC_DIR in $STATIC_DIRS) {
    Write-Log "Processing directory: $STATIC_DIR" "INFO"
    
    try {
        # Create static directory if it doesn't exist
        if (-not (Test-Path $STATIC_DIR)) {
            New-Item -ItemType Directory -Path $STATIC_DIR -Force | Out-Null
            Write-Log "Created static directory: $STATIC_DIR" "INFO"
        }
        
        # Clean existing static files
        if (Test-Path $STATIC_DIR) {
            Get-ChildItem -Path $STATIC_DIR -Recurse | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue
            Write-Log "Cleaned existing static files in: $STATIC_DIR" "INFO"
        }
        
        # Copy new build files
        Copy-Item -Path "$BUILD_DIR\*" -Destination $STATIC_DIR -Recurse -Force
        Write-Log "Successfully copied build files to: $STATIC_DIR" "SUCCESS"
        
        # Verify copy
        $staticFiles = Get-ChildItem -Path $STATIC_DIR -Recurse | Measure-Object
        Write-Log "Copied $($staticFiles.Count) files to: $STATIC_DIR" "INFO"
        
    } catch {
        Write-Log "Warning: Failed to copy to $STATIC_DIR - $($_.Exception.Message)" "WARN"
    }
}

Write-Log "Completed copying to all static directories!" "SUCCESS"

# Create ZIP package and upload to Nexus
Write-Log "Creating ZIP package for distribution..." "INFO"

try {
    # Get version from package.json
    $packageJson = Get-Content "package.json" | ConvertFrom-Json
    $version = $packageJson.version
    $zipFileName = "sck-core-ui-$version.zip"
    $zipFilePath = Join-Path $PROJECT_DIR $zipFileName
    
    Write-Log "Package version: $version" "INFO"
    Write-Log "Creating ZIP file: $zipFileName" "INFO"
    
    # Remove existing ZIP if it exists
    if (Test-Path $zipFilePath) {
        Remove-Item -Path $zipFilePath -Force
        Write-Log "Removed existing ZIP file" "INFO"
    }
    
    # Create ZIP file from dist directory contents
    Compress-Archive -Path "$BUILD_DIR\*" -DestinationPath $zipFilePath -CompressionLevel Optimal
    
    # Verify ZIP creation
    if (Test-Path $zipFilePath) {
        $zipSize = (Get-Item $zipFilePath).Length
        $zipSizeMB = [math]::Round($zipSize / 1MB, 2)
        Write-Log "ZIP file created successfully: $zipSizeMB MB" "SUCCESS"
        
        # Upload to Nexus if environment variables are set
        if ($Env:NEXUS_SERVER -and $Env:NEXUS_USERNAME -and $Env:NEXUS_PASSWORD) {
            $nexusUrl = "$($Env:NEXUS_SERVER)/repository/files/sck/$zipFileName"
            Write-Log "Uploading to Nexus: $nexusUrl" "INFO"
            
            # Create credentials for Basic Auth
            $credentials = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($Env:NEXUS_USERNAME):$($Env:NEXUS_PASSWORD)"))
            
            # Upload using Invoke-WebRequest
            $headers = @{
                "Authorization" = "Basic $credentials"
                "Content-Type" = "application/zip"
            }
            
            Invoke-WebRequest -Uri $nexusUrl -Method PUT -InFile $zipFilePath -Headers $headers
            Write-Log "Successfully uploaded to Nexus!" "SUCCESS"
        } else {
            Write-Log "Nexus environment variables not set. Skipping upload." "WARN"
            Write-Log "ZIP file saved locally: $zipFilePath" "INFO"
        }

        # Remove the local ZIP file after upload
        Remove-Item -Path $zipFilePath -Force
        
    } else {
        throw "Failed to create ZIP file"
    }
    
} catch {
    Write-Log "Warning: Failed to create ZIP or upload to Nexus - $($_.Exception.Message)" "WARN"
}