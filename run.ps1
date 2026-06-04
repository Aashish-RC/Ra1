<#
.SYNOPSIS
    RA1 Universal Docker Launcher for Windows
.DESCRIPTION
    Start, stop, and manage all RA1 Docker services from the project root.
.PARAMETER Action
    Action to perform: init, dev, status, up, down, build, rebuild, logs, ps, restart, clean
.PARAMETER Service
    (Optional) Specific service name for logs or restart
.EXAMPLE
    .\run.ps1 init              # First-time setup: copy .env and generate secrets
    .\run.ps1 dev               # Start dev stack and open browser
    .\run.ps1 status            # Show health of all running services
    .\run.ps1 up                # Start all services
    .\run.ps1 up-min            # Start minimal stack
    .\run.ps1 up-canvas         # Start canvas + API + infra
    .\run.ps1 down              # Stop all services
    .\run.ps1 build             # Build all images
    .\run.ps1 rebuild           # Force rebuild all images
    .\run.ps1 logs              # Follow logs (all services)
    .\run.ps1 logs canvas       # Follow canvas logs only
    .\run.ps1 ps                # Show running services
    .\run.ps1 restart           # Restart all services
    .\run.ps1 clean             # Stop + remove volumes (WARNING: destroys data!)
#>

param(
    [Parameter(Position = 0)]
    [ValidateSet('help', 'init', 'dev', 'status', 'up', 'up-min', 'up-canvas', 'down', 'build', 'rebuild', 'logs', 'ps', 'restart', 'clean')]
    [string]$Action = 'help',

    [Parameter(Position = 1)]
    [string]$Service = ''
)

function Show-Help {
    Write-Host @"

========================================
  RA1 Universal Docker Launcher (PowerShell)
========================================

Usage:
  .\run.ps1 <action> [service]

Actions:
  init           First-time setup: copy .env and generate required secrets
  dev            Start dev stack (canvas + api + postgres + valkey + litellm) and open browser
  status         Show health of all running services
  up             Start all services
  up-min         Start only essentials (postgres, valkey)
  up-canvas      Start canvas + API + full infrastructure
  down           Stop all services
  build          Build all images
  rebuild        Force rebuild all images (no cache)
  logs [svc]     Tail logs (optionally for a specific service)
  ps             Show running services
  restart        Restart all services
  clean          Stop + remove ALL containers AND volumes (WARNING: DESTROYS DATA!)

Examples:
  .\run.ps1 up               # Start everything
  .\run.ps1 up-min           # Start only postgres + valkey
  .\run.ps1 logs canvas      # Follow canvas logs only

"@
}

switch ($Action) {
    'help' {
        Show-Help
    }
    'init' {
        Write-Host "Initialising RA1..."

        if (-not (Test-Path ".env")) {
            Copy-Item ".env.example" ".env"
            Write-Host "Created .env from .env.example"
        } else {
            Write-Host ".env already exists - skipping copy"
        }

        function Auto-Fill($key, $val) {
            $content = Get-Content ".env" -Raw
            if ($content -match "(?m)^${key}=\s*$") {
                $content = $content -replace "(?m)^${key}=.*", "${key}=${val}"
                Set-Content ".env" $content -NoNewline
                Write-Host "  Generated $key"
            }
        }

        $hex16 = -join ((1..16) | ForEach-Object { '{0:x2}' -f (Get-Random -Max 256) })
        $hex32 = -join ((1..32) | ForEach-Object { '{0:x2}' -f (Get-Random -Max 256) })
        $hex12 = -join ((1..12) | ForEach-Object { '{0:x2}' -f (Get-Random -Max 256) })

        Auto-Fill "POSTGRES_PASSWORD"        $hex16
        Auto-Fill "JWT_SECRET"               $hex32
        Auto-Fill "INFISICAL_ENCRYPTION_KEY" $hex16
        Auto-Fill "INFISICAL_AUTH_SECRET"    $hex32

        $content = Get-Content ".env" -Raw
        if ($content -match "(?m)^LITELLM_MASTER_KEY=\s*$") {
            $content = $content -replace "(?m)^LITELLM_MASTER_KEY=.*", "LITELLM_MASTER_KEY=sk-ra1-${hex12}"
            Set-Content ".env" $content -NoNewline
            Write-Host "  Generated LITELLM_MASTER_KEY"
        }

        Write-Host ""
        Write-Host "Init complete. Run '.\run.ps1 dev' to start."
    }
    'dev' {
        if (-not (Test-Path ".env")) {
            Write-Host "No .env found. Run '.\run.ps1 init' first."
            exit 1
        }

        Write-Host "Starting RA1 dev stack (canvas, api, postgres, valkey, litellm)..."
        docker compose up -d canvas api postgres valkey litellm

        Write-Host ""
        Write-Host "Waiting for API to be healthy..."
        $attempts = 0
        do {
            Start-Sleep -Seconds 2
            $attempts++
            Write-Host -NoNewline "."
            try {
                $r = Invoke-WebRequest -Uri "http://localhost:3001/health/live" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
                $healthy = $r.StatusCode -eq 200
            } catch { $healthy = $false }
        } while (-not $healthy -and $attempts -lt 30)

        Write-Host ""
        Write-Host "RA1 is running:"
        Write-Host "   Canvas  -> http://localhost:5173"
        Write-Host "   API     -> http://localhost:3001"
        Write-Host "   LiteLLM -> http://localhost:4000"
        Write-Host ""
        Write-Host "   Open Model Test -> http://localhost:5173 (click 'Model Test' tab)"

        Start-Process "http://localhost:5173"
    }
    'status' {
        Write-Host ""
        Write-Host "================================"
        Write-Host "  RA1 Service Status"
        Write-Host "================================"

        function Check-Url($name, $url, $label) {
            try {
                Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop | Out-Null
                Write-Host "  OK $name  $label"
            } catch {
                Write-Host "  FAIL $name  $label (not reachable)"
            }
        }

        Check-Url "Canvas  " "http://localhost:5173"         "-> http://localhost:5173"
        Check-Url "API     " "http://localhost:3001/health"  "-> http://localhost:3001/health"
        Check-Url "LiteLLM " "http://localhost:4000"         "-> http://localhost:4000"

        Write-Host ""
        docker compose ps
        Write-Host ""
    }
    'up' {
        Write-Host "Starting all RA1 services..."
        docker compose up -d
    }
    'up-min' {
        Write-Host "Starting minimal stack (postgres, valkey)..."
        docker compose up -d postgres valkey
    }
    'up-canvas' {
        Write-Host "Starting canvas + API + infrastructure..."
        docker compose up -d canvas api
    }
    'down' {
        Write-Host "Stopping all RA1 services..."
        docker compose down
    }
    'build' {
        Write-Host "Building all images..."
        docker compose build
    }
    'rebuild' {
        Write-Host "Force rebuilding all images (no cache)..."
        docker compose build --no-cache
    }
    'logs' {
        if ($Service) {
            Write-Host "Following logs for '$Service'..."
            docker compose logs -f $Service
        } else {
            Write-Host "Following logs for all services..."
            docker compose logs -f
        }
    }
    'ps' {
        docker compose ps
    }
    'restart' {
        Write-Host "Restarting all services..."
        docker compose restart
    }
    'clean' {
        Write-Host "WARNING: This will remove ALL containers AND volumes (DATA LOSS)!"
        $confirm = Read-Host "Are you sure? (y/N)"
        if ($confirm -eq 'y' -or $confirm -eq 'Y') {
            docker compose down -v
            Write-Host "Cleaned up."
        } else {
            Write-Host "Cancelled."
        }
    }
}