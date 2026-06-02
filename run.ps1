<#
.SYNOPSIS
    RA1 Universal Docker Launcher for Windows
.DESCRIPTION
    Start, stop, and manage all RA1 Docker services from the project root.
.PARAMETER Action
    Action to perform: up, down, build, rebuild, logs, ps, restart, clean
.PARAMETER Service
    (Optional) Specific service name for logs or restart
.EXAMPLE
    .\run.ps1 up              # Start all services
    .\run.ps1 up-min          # Start minimal stack
    .\run.ps1 up-canvas       # Start canvas + API + infra
    .\run.ps1 down            # Stop all services
    .\run.ps1 build           # Build all images
    .\run.ps1 rebuild         # Force rebuild all images
    .\run.ps1 logs            # Follow logs (all services)
    .\run.ps1 logs canvas     # Follow canvas logs only
    .\run.ps1 ps              # Show running services
    .\run.ps1 restart         # Restart all services
    .\run.ps1 clean           # Stop + remove volumes (⚠️ destroys data!)
#>

param(
    [Parameter(Position = 0)]
    [ValidateSet('up', 'up-min', 'up-canvas', 'down', 'build', 'rebuild', 'logs', 'ps', 'restart', 'clean')]
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
  up             Start all services
  up-min         Start only essentials (postgres, valkey)
  up-canvas      Start canvas + API + full infrastructure
  down           Stop all services
  build          Build all images
  rebuild        Force rebuild all images (no cache)
  logs [svc]     Tail logs (optionally for a specific service)
  ps             Show running services
  restart        Restart all services
  clean          Stop + remove ALL containers AND volumes (⚠️ DESTROYS DATA!)

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
    'up' {
        Write-Host "🚀 Starting all RA1 services..."
        docker compose up -d
    }
    'up-min' {
        Write-Host "🚀 Starting minimal stack (postgres, valkey)..."
        docker compose up -d postgres valkey
    }
    'up-canvas' {
        Write-Host "🚀 Starting canvas + API + infrastructure..."
        docker compose up -d canvas api
    }
    'down' {
        Write-Host "🛑 Stopping all RA1 services..."
        docker compose down
    }
    'build' {
        Write-Host "🔨 Building all images..."
        docker compose build
    }
    'rebuild' {
        Write-Host "🔨 Force rebuilding all images (no cache)..."
        docker compose build --no-cache
    }
    'logs' {
        if ($Service) {
            Write-Host "📋 Following logs for '$Service'..."
            docker compose logs -f $Service
        } else {
            Write-Host "📋 Following logs for all services..."
            docker compose logs -f
        }
    }
    'ps' {
        docker compose ps
    }
    'restart' {
        Write-Host "🔄 Restarting all services..."
        docker compose restart
    }
    'clean' {
        Write-Host "⚠️  WARNING: This will remove ALL containers AND volumes (DATA LOSS)!"
        $confirm = Read-Host "Are you sure? (y/N)"
        if ($confirm -eq 'y' -or $confirm -eq 'Y') {
            docker compose down -v
            Write-Host "✅ Cleaned up."
        } else {
            Write-Host "❌ Cancelled."
        }
    }
}