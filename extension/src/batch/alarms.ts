import { getConfig } from '../lib/storage';
import { getUsage, isCooldownActive, getCooldownReason } from '../lib/policy';
import { runBackgroundBatch } from './background';

const ALARM_NAME = 'ts-auto-batch';
const INTERVAL_MINUTES = 15;

chrome.runtime.onInstalled.addListener(() => {
  void setupAlarm();
  if (chrome.sidePanel?.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
  }
});

chrome.runtime.onStartup.addListener(() => {
  void setupAlarm();
  if (chrome.sidePanel?.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
  }
});

if (chrome.action?.onClicked) {
  chrome.action.onClicked.addListener((tab) => {
    if (tab?.id && chrome.sidePanel?.open) {
      chrome.sidePanel.open({ tabId: tab.id }).catch(() => {});
    }
  });
}

// Khi popup bật/tắt auto, lắng nghe message để cập nhật alarm ngay
chrome.runtime.onMessage.addListener((message: { type?: string }, _sender, sendResponse) => {
  if (message.type === 'TS_SETUP_ALARM') {
    void setupAlarm().then(() => sendResponse({ ok: true }));
    return true;
  }
  if (message.type === 'TS_CLEAR_ALARM') {
    void chrome.alarms.clear(ALARM_NAME).then(() => sendResponse({ ok: true }));
    return true;
  }
  return false;
});

async function setupAlarm(): Promise<void> {
  const config = await getConfig();
  if (!config.autoEnabled || !config.webUrl || !config.adminKey) {
    await chrome.alarms.clear(ALARM_NAME);
    return;
  }
  // periodInMinutes tối thiểu của Chrome là 1; 15 phút/lần là hợp lý cho việc cào nhẹ nhàng
  await chrome.alarms.create(ALARM_NAME, { periodInMinutes: INTERVAL_MINUTES });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== ALARM_NAME) return;
  void runBackgroundBatch();
});

// Giữ service worker sống lâu hơn khi có batch đang chạy (alarm handler thường bị kill sớm)
let keepAlivePort: chrome.runtime.Port | null = null;
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'ts-keepalive') {
    keepAlivePort = port;
    port.onDisconnect.addListener(() => { keepAlivePort = null; });
  }
});
