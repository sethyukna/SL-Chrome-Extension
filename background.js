/*
  MV3 service worker.

  Two things differ from the old persistent background page:
  1. There is no DOM here, so clipboard writes are injected into the active
     tab with chrome.scripting instead of using document.execCommand.
  2. The worker is torn down when idle, so context menus are built in
     onInstalled and popup calls arrive as messages rather than through
     chrome.extension.getBackgroundPage().
*/

const DEFAULT_ENV_PATHS = {
  DEV: 'https://homefield-client-dev.squadlocker.com',
  QA: 'https://homefield-client-qa.squadlocker.com',
  PROD: 'https://homefield.squadlocker.com',
  LOCAL: ''
};

const EDIT_PATH_PATTERN = ['*://*/*locker-manager-edit*'];

const MAX_RECENT_LAUNCHES = 15;

// Friendly names for the pageUrl segments the popup can launch.
const PAGE_LABELS = {
  'locker-manager-edit': 'Locker',
  'order-management': 'Order'
};

chrome.runtime.onInstalled.addListener(async () => {
  // Merge rather than overwrite so an upgrade keeps any custom URLs the
  // user set on the options page.
  const { envPaths, recentLaunches } = await chrome.storage.sync.get([
    'envPaths',
    'recentLaunches'
  ]);

  await chrome.storage.sync.set({
    envPaths: { ...DEFAULT_ENV_PATHS, ...(envPaths || {}) }
  });

  // v1 stored this as an object keyed by id; it is a list now. Anything that
  // is not already an array gets reset rather than half-read.
  if (!Array.isArray(recentLaunches)) {
    await chrome.storage.sync.set({ recentLaunches: [] });
  }

  buildContextMenus();
});

function buildContextMenus() {
  // removeAll before create, otherwise re-running onInstalled after an
  // update throws "duplicate id".
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      title: 'Open in',
      id: 'openin',
      documentUrlPatterns: EDIT_PATH_PATTERN
    });

    chrome.contextMenus.create({
      title: 'Copy record id',
      id: 'copyitem',
      documentUrlPatterns: EDIT_PATH_PATTERN
    });

    for (const env of ['dev', 'qa', 'prod', 'local']) {
      chrome.contextMenus.create({
        title: env === 'qa' ? 'QA' : env.charAt(0).toUpperCase() + env.slice(1),
        id: env,
        parentId: 'openin'
      });
    }
  });
}

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.parentMenuItemId === 'openin') {
    redirectPage(info.menuItemId);
  } else if (info.menuItemId === 'copyitem') {
    copyValueFromQueryString('recordid');
  }
});

chrome.commands.onCommand.addListener((command) => {
  if (command === 'copyrecordid') {
    copyValueFromQueryString('recordid');
  } else {
    redirectPage(command);
  }
});

// The popup can no longer reach these functions directly, so it sends a
// message instead. Returning true keeps the response channel open for the
// async handler.
const MESSAGE_HANDLERS = {
  redirectPage: (message) => redirectPage(message.env),
  launchLink: (message) => launchLink(message.options),
  clearRecentLaunches: () => chrome.storage.sync.set({ recentLaunches: [] })
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const handler = MESSAGE_HANDLERS[message?.type];

  if (!handler) {
    sendResponse({ ok: false, error: `Unknown message type: ${message?.type}` });
    return false;
  }

  Promise.resolve(handler(message))
    .then(() => sendResponse({ ok: true }))
    .catch((error) => sendResponse({ ok: false, error: error.message }));

  return true;
});

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function getBaseUrl(env) {
  const { envPaths } = await chrome.storage.sync.get('envPaths');
  const paths = { ...DEFAULT_ENV_PATHS, ...(envPaths || {}) };

  switch (env) {
    case 'dev':
      return paths.DEV;
    case 'qa':
      return paths.QA;
    case 'local':
      return paths.LOCAL;
    default:
      return paths.PROD;
  }
}

async function redirectPage(env) {
  const tab = await getActiveTab();
  if (!tab?.url) {
    return;
  }

  const base = await getBaseUrl(env);
  if (!base) {
    // LOCAL is blank until it is set on the options page.
    return;
  }

  await chrome.tabs.create({
    url: base + (tab.url.split('/locker-manager-edit/')[1] || ''),
    active: false,
    index: tab.index + 1
  });
}

async function launchLink(options) {
  const base = await getBaseUrl(options.env);
  if (!base) {
    return;
  }

  const id = (options.guid || '').trim();
  if (!id || !options.pageUrl) {
    return;
  }

  const tab = await getActiveTab();

  await chrome.tabs.create({
    url: `${base}/${options.pageUrl}/${id}`,
    active: false,
    index: tab ? tab.index + 1 : undefined
  });

  // Recorded here rather than after the tab loads: the old version waited 5s
  // on a timer to inspect the tab title, which a suspended worker never runs.
  await recordRecentLaunch({ id, pageUrl: options.pageUrl });
}

async function recordRecentLaunch({ id, pageUrl }) {
  const { recentLaunches } = await chrome.storage.sync.get('recentLaunches');
  const existing = Array.isArray(recentLaunches) ? recentLaunches : [];

  // Same record launched again moves to the top instead of duplicating.
  const deduped = existing.filter(
    (entry) => !(entry.id === id && entry.pageUrl === pageUrl)
  );

  deduped.unshift({ id, pageUrl, launchedAt: Date.now() });

  await chrome.storage.sync.set({
    recentLaunches: deduped.slice(0, MAX_RECENT_LAUNCHES)
  });
}

async function copyValueFromQueryString(variable) {
  const tab = await getActiveTab();
  if (!tab?.url || !tab.id) {
    return;
  }

  // Values live in the hash fragment, e.g. #recordid=<guid>&...
  const hash = tab.url.split('#')[1];
  if (!hash) {
    return;
  }

  const value = new URLSearchParams(hash).get(variable);
  if (!value) {
    return;
  }

  await copyTextInTab(tab.id, value);
}

async function copyTextInTab(tabId, text) {
  await chrome.scripting.executeScript({
    target: { tabId },
    func: async (value) => {
      try {
        await navigator.clipboard.writeText(value);
      } catch {
        // navigator.clipboard needs a focused document; fall back to a
        // temporary textarea when the page is not focused.
        const area = document.createElement('textarea');
        area.value = value;
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        document.execCommand('copy');
        area.remove();
      }
    },
    args: [text]
  });
}
