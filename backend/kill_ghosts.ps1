# Kill all Python processes to clear ghost Uvicorn instances
$pythonProcesses = Get-Process -Name python -ErrorAction SilentlyContinue
if ($pythonProcesses) {
    Write-Host "Found $($pythonProcesses.Count) Python processes. Cleaning up..." -ForegroundColor Yellow
    foreach ($proc in $pythonProcesses) {
        try {
            Stop-Process -Id $proc.Id -Force
            Write-Host "Killed process $($proc.Id)" -ForegroundColor Green
        } catch {
            Write-Host "Failed to kill process $($proc.Id): $($_.Exception.Message)" -ForegroundColor Red
        }
    }
} else {
    Write-Host "No Python processes found. Port 8000 should be clear." -ForegroundColor Green
}

# Clear any potential lock files if they exist
$lockFile = "app.db.lock" # Example if using sqlite locks
if (Test-Path $lockFile) {
    Remove-Item $lockFile -Force
    Write-Host "Cleared DB lock file." -ForegroundColor Green
}

Write-Host "System Cleanup Complete. You can now run '.\run_app.ps1' for a fresh start." -ForegroundColor Cyan
