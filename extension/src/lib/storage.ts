export interface ExtensionConfig {
  webUrl: string;
  adminKey: string;
  autoEnabled: boolean; // chạy batch tự động theo lịch (chrome.alarms)
}

const CONFIG_KEY = 'threadscore_config';
const DEFAULTS: ExtensionConfig = { webUrl: 'https://threadscore.quackforge.io.vn', adminKey: '', autoEnabled: false };

export async function getConfig(): Promise<ExtensionConfig> {
  const result = await chrome.storage.local.get(CONFIG_KEY);
  const stored = result[CONFIG_KEY] as Partial<ExtensionConfig> | undefined;
  return { ...DEFAULTS, ...(stored ?? {}) };
}

export async function setConfig(cfg: ExtensionConfig): Promise<void> {
  await chrome.storage.local.set({ [CONFIG_KEY]: cfg });
}

export async function setAutoEnabled(enabled: boolean): Promise<void> {
  const cfg = await getConfig();
  cfg.autoEnabled = enabled;
  await setConfig(cfg);
}
