import { readFile, realpath } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

export const applicationRoot = fileURLToPath(new URL('..', import.meta.url));
export const projectRoot = path.resolve(applicationRoot, '../..');
export const configurationPath = 'app/clean-electron/protoflow.config.json';

export async function resolveEngineEntry(args = process.argv.slice(2)) {
  let value = process.env.PROTOFLOW_ENGINE_ENTRY;
  for (let index = 0; index < args.length; index++) {
    if (args[index] !== '--engine' || !args[index + 1]) throw new Error('Expected --engine /absolute/path/to/shared/src/index.js');
    value = args[++index];
  }
  if (typeof value !== 'string' || !path.isAbsolute(value)) throw new Error('Set PROTOFLOW_ENGINE_ENTRY or pass --engine with the absolute shared SDK entry path');
  return realpath(value);
}

// Load this committed root-relative module configuration, preserving the legacy root configuration.
export async function loadModuleConfig(rootOrOptions = projectRoot, version) {
  const { root = projectRoot, engineEntry: suppliedEntry } = typeof rootOrOptions === 'string'
    ? { root: rootOrOptions } : rootOrOptions;
  let engineEntry = suppliedEntry;
  engineEntry ??= await resolveEngineEntry();
  const entryUrl = pathToFileURL(engineEntry);
  const sdk = await import(entryUrl.href);
  if (typeof sdk.acceptanceClient !== 'function' || typeof sdk.runAcceptanceCommand !== 'function' || !sdk.configSchema) throw new Error('The shared SDK must provide the acceptance client and configuration schema');
  // The acceptance SDK also exposes this generic API in its adjacent module on older releases.
  const runAcceptanceAdapter = sdk.runAcceptanceAdapter ?? (await import(new URL('./acceptance.js', entryUrl).href)).runAcceptanceAdapter;
  if (typeof runAcceptanceAdapter !== 'function') throw new Error('The shared SDK must provide runAcceptanceAdapter');
  const config = JSON.parse(await readFile(path.join(root, configurationPath), 'utf8'));
  if (version && config.source?.startSha !== version.replace(/^git-/, '')) throw new Error('Requested version does not match the committed module configuration');
  const Ajv = createRequire(entryUrl)('ajv');
  const validate = new Ajv({ allErrors: true, strict: false }).compile(sdk.configSchema);
  if (!validate(config)) throw new Error(`Invalid module configuration: ${JSON.stringify(validate.errors)}`);
  return { config, sdk, runAcceptanceAdapter, engineEntry };
}
