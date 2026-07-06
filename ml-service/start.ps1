param(
    [int]$Port = 8000,
    [switch]$Reload
)

$python = Join-Path $PSScriptRoot "venv\Scripts\python.exe"

if (-not (Test-Path -LiteralPath $python)) {
    Write-Error "Virtual environment not found. Run: python -m venv venv; .\venv\Scripts\python.exe -m pip install -r requirements.txt"
    exit 1
}

Push-Location $PSScriptRoot
try {
    $arguments = @("-m", "uvicorn", "main:app", "--port", $Port)
    if ($Reload) {
        $arguments += "--reload"
    }
    & $python @arguments
}
finally {
    Pop-Location
}
