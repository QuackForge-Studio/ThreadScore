export interface ExtensionConfig {
  webUrl: string;
  adminKey: string;
}

const CONFIG_KEY = 'threadscore_config';
const DEFAULTS: ExtensionConfig = { webUrl: '', adminKey: '' };

export async function getConfig(): Promise<ExtensionConfig> {
  const result = await chrome.storage.local.get(CONFIG_KEY);
  return { ...DEFAULTS, ...(result[CONFIG_KEY] as Partial<ExtensionConfig> | undefined) };
}

export async function setConfig(cfg: ExtensionConfig): Promise<void> {
  await chrome.storage.local.set({ [CONFIG_KEY]: cfg });
}
