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
    ctx.output.info(`Reload with: source ${shell.configPath}`);
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
    'Set $SHELL or run with --shell <zsh|bash|fish>',
  );
}
