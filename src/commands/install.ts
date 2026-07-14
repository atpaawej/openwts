/**
 * install — cross-platform shell integration for openwts.
 *
 * Installs a shell wrapper function that intercepts the `switch` command
 * and does a directory change (cd / Set-Location) instead of just
 * printing the path.
 *
 * Supports: bash, zsh, fish, PowerShell (Windows)
 */

import type { Command } from './command.js';
import { OpenwtError } from '../types.js';
import type { ShellConfig } from '../types.js';

export const installCommand: Command = {
  name: 'install',
  description: 'Install shell integration for switch support',
  arguments: [],
  aliases: [],

  async run(_args, ctx) {
    const shell = await detectShell(ctx.system);
    const functionDef = getShellFunction(shell.type);
    const marker = `# openwts shell integration`;

    // Check if already installed
    try {
      const existing = await ctx.system.readFile(shell.configPath);
      if (existing.includes(marker)) {
        ctx.output.info('Shell integration already installed');
        ctx.output.info(`Config file: ${shell.configPath}`);
        return;
      }
    } catch {
      // File doesn't exist — we'll create it
    }

    // Append the function
    const content = `\n${marker}\n${functionDef}\n`;
    await ctx.system.appendFile(shell.configPath, content);

    ctx.output.success(`Shell integration installed`);
    ctx.output.info(`Config file: ${shell.configPath}`);
    ctx.output.info(`Reload with:`);
    if (shell.type === 'powershell') {
      ctx.output.info(`  . $PROFILE`);
    } else {
      ctx.output.info(`  source ${shell.configPath}`);
    }
    ctx.output.info(`\nNow you can use: openwts switch <name>`);
  },
};

function getShellFunction(type: string): string {
  const alias = 'owt';
  switch (type) {
    case 'fish':
      return `
function ${alias} --description "openwts — worktree manager for opencode"
    if test "$argv[1]" = "switch"
        cd (openwts $argv)
    else
        openwts $argv
    end
end
`;
    case 'powershell':
      return `
function ${alias} {
  param(
    [Parameter(Position=0)]
    [string] $Command,
    [Parameter(ValueFromRemainingArguments=$true)]
    [string[]] $Args
  )

  if ($Command -eq "switch") {
    $path = & "openwts" $Command $Args
    if ($LASTEXITCODE -eq 0 -and $path) {
      Set-Location $path
    }
  } else {
    $argsList = @($Command) + $Args
    & "openwts" $argsList
  }
}
`;
    default:
      // bash / zsh
      return `
${alias}() {
  if [ "\$1" = "switch" ]; then
    cd "\$(openwts "\$@")"
  else
    openwts "\$@"
  fi
}
`;
  }
}

async function detectShell(system: {
  exec: (cmd: string, args: string[]) => Promise<{ exitCode: number; stdout: string }>;
  homeDir: () => Promise<string>;
  exists: (path: string) => Promise<boolean>;
}): Promise<ShellConfig> {
  // Detect PowerShell on Windows
  const isWindows = process.platform === 'win32';
  if (isWindows || process.env.PSModulePath) {
    // Check if we're running in PowerShell by looking at env vars
    const psHome = process.env.PSModulePath || '';
    if (psHome.includes('PowerShell') || psHome.includes('powershell') || isWindows) {
      // PowerShell profile paths:
      // CurrentUserCurrentHost: $HOME\Documents\WindowsPowerShell\Profile.ps1 (WindowsPowerShell)
      //                        $HOME\Documents\PowerShell\Profile.ps1 (PowerShell 7)
      const home = await system.homeDir();
      const ps7Profile = `${home}/Documents/PowerShell/Microsoft.PowerShell_profile.ps1`;
      const ps5Profile = `${home}/Documents/WindowsPowerShell/Microsoft.PowerShell_profile.ps1`;

      if (await system.exists(ps7Profile)) {
        return { type: 'powershell', configPath: ps7Profile };
      }
      if (await system.exists(ps5Profile)) {
        return { type: 'powershell', configPath: ps5Profile };
      }
      // Default to PowerShell 7 profile path (most common)
      return { type: 'powershell', configPath: ps7Profile };
    }
  }

  // Try to detect from $SHELL
  const shellResult = await system.exec('echo', ['$SHELL']);
  const shellPath = shellResult.stdout.trim();

  const home = await system.homeDir();

  if (shellPath.includes('zsh')) {
    const configPath = `${home}/.zshrc`;
    return { type: 'zsh', configPath };
  }
  if (shellPath.includes('bash')) {
    // Prefer .bashrc, fallback to .bash_profile
    const bashrc = `${home}/.bashrc`;
    if (await system.exists(bashrc)) {
      return { type: 'bash', configPath: bashrc };
    }
    return { type: 'bash', configPath: `${home}/.bash_profile` };
  }
  if (shellPath.includes('fish')) {
    return { type: 'fish', configPath: `${home}/.config/fish/config.fish` };
  }

  // Fallback — try common paths
  if (await system.exists(`${home}/.zshrc`)) {
    return { type: 'zsh', configPath: `${home}/.zshrc` };
  }
  if (await system.exists(`${home}/.bashrc`)) {
    return { type: 'bash', configPath: `${home}/.bashrc` };
  }

  throw new OpenwtError(
    'Could not detect shell config file',
    'Set $SHELL or run with --shell <zsh|bash|fish|powershell>',
  );
}
