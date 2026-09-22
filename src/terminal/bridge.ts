import unixHost from '../../bridge/pty_host.py';
import windowsHost from '../../bridge/windows_host.py';
import processes from '../../bridge/processes.py';

/** Obsidian installs three assets; keep the Python transport inside main.js. */
const BOOTSTRAP = `import json, sys, types
sources = json.loads(sys.argv.pop(1))
module = types.ModuleType("processes")
sys.modules["processes"] = module
exec(sources["processes"], module.__dict__)
exec(sources["host"], {"__name__": "__main__"})`;

export function bridgeArguments(config: object, windows: boolean): string[] {
  return [
    '-u',
    '-c',
    BOOTSTRAP,
    JSON.stringify({ host: windows ? windowsHost : unixHost, processes }),
    JSON.stringify(config),
  ];
}
