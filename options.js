const FIELDS = {
  DEV: 'dev-base-url',
  QA: 'qa-base-url',
  PROD: 'prod-base-url',
  LOCAL: 'local-base-url'
};

function stripTrailingSlash(value) {
  return value.trim().replace(/\/+$/, '');
}

document.getElementById('submitOptions').addEventListener('click', async () => {
  const envPaths = {};
  for (const [env, id] of Object.entries(FIELDS)) {
    envPaths[env] = stripTrailingSlash(document.getElementById(id).value);
  }

  await chrome.storage.sync.set({ envPaths });

  const status = document.getElementById('status');
  status.textContent = 'Saved.';
  setTimeout(() => {
    status.textContent = '';
  }, 2000);
});

async function load() {
  const { envPaths } = await chrome.storage.sync.get('envPaths');
  const paths = envPaths || {};

  for (const [env, id] of Object.entries(FIELDS)) {
    document.getElementById(id).value = paths[env] || '';
  }
}

load();
