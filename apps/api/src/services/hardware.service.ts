import { execSync } from "node:child_process";
import { cpus, totalmem, freemem } from "node:os";

export interface HardwareProfile {
  cpu: {
    model: string;
    cores: number;
    load_percent: number;
  };
  memory: {
    total_gb: number;
    free_gb: number;
    used_percent: number;
  };
  gpu: {
    available: boolean;
    name: string | null;
    vram_total_gb: number;
    vram_free_gb: number;
  };
  platform: string;
}

let _cachedProfile: HardwareProfile | null = null;
let _cachedAt = 0;

async function getGpuInfo(): Promise<{
  available: boolean;
  name: string | null;
  vram_total_gb: number;
  vram_free_gb: number;
}> {
  // Try nvidia-smi first (NVIDIA GPUs)
  try {
    const output = execSync(
      'nvidia-smi --query-gpu=name,memory.total,memory.free --format=csv,noheader,nounits 2>&1',
      { encoding: 'utf8', timeout: 5000 }
    ).trim();

    const lines = output.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length > 0) {
      const first = lines[0]!;
      const parts = first.split(', ').map(p => p.trim());
      if (parts.length >= 3) {
        const name = parts[0] || null;
        const vramTotal = parseInt(parts[1] || '0', 10);
        const vramFree = parseInt(parts[2] || '0', 10);
        return {
          available: true,
          name,
          vram_total_gb: Math.round(vramTotal / 1024 * 100) / 100,
          vram_free_gb: Math.round(vramFree / 1024 * 100) / 100,
        };
      }
    }
  } catch {
    // nvidia-smi not available
  }

  // Try ROCm (AMD GPUs)
  try {
    const output = execSync('rocm-smi --showmeminfo vram 2>&1', { encoding: 'utf8', timeout: 5000 }).trim();
    if (output.includes('VRAM')) {
      // Parse ROCm output - simplified
      return {
        available: true,
        name: 'AMD GPU (ROCm)',
        vram_total_gb: 8,
        vram_free_gb: 4,
      };
    }
  } catch {
    // rocm-smi not available
  }

  return {
    available: false,
    name: null,
    vram_total_gb: 0,
    vram_free_gb: 0,
  };
}

export async function scan(): Promise<HardwareProfile> {
  const now = Date.now();
  // Cache for 30 seconds
  if (_cachedProfile && (now - _cachedAt) < 30_000) {
    return _cachedProfile;
  }

  const cpuInfo = cpus();
  const cpuModel = cpuInfo.length > 0 ? cpuInfo[0]?.model || 'unknown' : 'unknown';
  const cpuCores = cpuInfo.length;

  // Simple CPU load
  const totalMem = totalmem();
  const freeMem = freemem();

  const gpu = await getGpuInfo();

  _cachedProfile = {
    cpu: {
      model: cpuModel,
      cores: cpuCores,
      load_percent: 0, // would need a more involved calculation
    },
    memory: {
      total_gb: Math.round(totalMem / (1024 ** 3) * 100) / 100,
      free_gb: Math.round(freeMem / (1024 ** 3) * 100) / 100,
      used_percent: Math.round((1 - freeMem / totalMem) * 10000) / 100,
    },
    gpu,
    platform: process.platform,
  };

  _cachedAt = now;
  return _cachedProfile;
}

export function canRun(
  hw: HardwareProfile,
  model: { min_ram_gb?: number; min_vram_gb?: number }
): { can_run: boolean; reason: string; performance_tier: 'fast' | 'standard' | 'slow' | null } {
  const { min_ram_gb = 0, min_vram_gb = 0 } = model;

  // Check RAM
  if (hw.memory.free_gb < min_ram_gb) {
    return {
      can_run: false,
      reason: `Insufficient RAM: ${hw.memory.free_gb}GB free, need ${min_ram_gb}GB`,
      performance_tier: null,
    };
  }

  // Check VRAM
  if (min_vram_gb > 0) {
    if (!hw.gpu.available) {
      return {
        can_run: false,
        reason: 'GPU required but not available',
        performance_tier: null,
      };
    }
    if (hw.gpu.vram_free_gb < min_vram_gb) {
      return {
        can_run: false,
        reason: `Insufficient VRAM: ${hw.gpu.vram_free_gb}GB free, need ${min_vram_gb}GB`,
        performance_tier: null,
      };
    }
  }

  // Determine performance tier
  let tier: 'fast' | 'standard' | 'slow' | null = 'standard';
  if (hw.gpu.available && hw.gpu.vram_total_gb >= 24) {
    tier = 'fast';
  } else if (hw.gpu.available && hw.gpu.vram_total_gb >= 12) {
    tier = 'standard';
  } else if (!hw.gpu.available && min_vram_gb > 0) {
    tier = 'slow';
  } else {
    tier = 'standard';
  }

  return {
    can_run: true,
    reason: 'Hardware meets requirements',
    performance_tier: tier,
  };
}