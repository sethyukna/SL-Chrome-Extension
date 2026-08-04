/*
  chrome.extension.getBackgroundPage() does not exist in MV3, so the popup
  talks to the service worker over chrome.runtime.sendMessage.
*/

function init() {
  document.querySelector('.guid')?.focus();

  for (const button of document.querySelectorAll(
    '#open-in-environment button[data-openin]'
  )) {
    button.addEventListener('click', async (event) => {
      event.preventDefault();
      await chrome.runtime.sendMessage({
        type: 'redirectPage',
        env: button.dataset.openin
      });
      window.close();
    });
  }

  for (const button of document.querySelectorAll(
    '.open-with-id button[data-openin]'
  )) {
    button.addEventListener('click', async (event) => {
      // These buttons live inside a <form>; without this the popup submits
      // and reloads instead of opening the tab.
      event.preventDefault();

      const fieldset = button.closest('.open-with-id');
      const guid = fieldset.querySelector('.guid').value.trim();

      if (!guid) {
        fieldset.querySelector('.guid').focus();
        return;
      }

      await chrome.runtime.sendMessage({
        type: 'launchLink',
        options: {
          env: button.dataset.openin,
          pageUrl: button.dataset.pageurl,
          guid
        }
      });
      window.close();
    });
  }

  // Enter in a text field triggers that fieldset's Dev button.
  for (const input of document.querySelectorAll('.guid')) {
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        input.closest('.open-with-id')?.querySelector('button[data-openin]')?.click();
      }
    });
  }

  initRecentLaunches();
}

const PAGE_LABELS = {
  'locker-manager-edit': 'Locker',
  'order-management': 'Order'
};

const ENV_LABELS = {
  dev: 'Dev',
  qa: 'QA',
  prod: 'Prod',
  local: 'Local'
};

async function initRecentLaunches() {
  const fieldset = document.getElementById('open-recent');
  const list = document.getElementById('open-link-recent');

  const { recentLaunches } = await chrome.storage.sync.get('recentLaunches');
  const entries = Array.isArray(recentLaunches) ? recentLaunches : [];

  // Entries from before the env was tracked cannot be reopened by a single
  // click, since there is no environment to open them in.
  const openable = entries.filter((entry) => entry.env);

  if (!openable.length) {
    // Stays hidden so the popup does not show an empty list.
    return;
  }

  for (const entry of openable) {
    const pageLabel = PAGE_LABELS[entry.pageUrl] || entry.pageUrl;
    const envLabel = ENV_LABELS[entry.env];

    // A real button, so focus and Enter/Space activation come for free.
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'recent-item';
    row.title = `Open in ${envLabel} — ${pageLabel}: ${entry.id}`;

    const chip = document.createElement('span');
    chip.className = 'env-chip';
    chip.dataset.env = entry.env;
    chip.textContent = envLabel;

    const text = document.createElement('span');
    text.className = 'recent-id';
    text.textContent = `${pageLabel}: ${entry.id}`;

    row.append(chip, text);
    row.addEventListener('click', async () => {
      await chrome.runtime.sendMessage({
        type: 'launchLink',
        options: { env: entry.env, pageUrl: entry.pageUrl, guid: entry.id }
      });
      window.close();
    });

    list.appendChild(row);
  }

  fieldset.hidden = false;

  document.getElementById('clear-recent').addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ type: 'clearRecentLaunches' });
    list.replaceChildren();
    fieldset.hidden = true;
  });
}

init();
