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
  const listbox = document.getElementById('open-link-recent');

  const { recentLaunches } = await chrome.storage.sync.get('recentLaunches');
  const entries = Array.isArray(recentLaunches) ? recentLaunches : [];

  if (!entries.length) {
    // Stays hidden so the popup does not show an empty list.
    return;
  }

  let selectedIndex = 0;

  entries.forEach((entry, index) => {
    const row = document.createElement('div');
    row.className = 'recent-item';
    row.setAttribute('role', 'option');
    row.dataset.index = String(index);

    const chip = document.createElement('span');
    chip.className = 'env-chip';
    // env may be absent on entries written before this was tracked.
    chip.dataset.env = entry.env || 'unknown';
    chip.textContent = ENV_LABELS[entry.env] || '—';

    const text = document.createElement('span');
    text.className = 'recent-id';
    const pageLabel = PAGE_LABELS[entry.pageUrl] || entry.pageUrl;
    text.textContent = `${pageLabel}: ${entry.id}`;

    row.append(chip, text);
    // Full text in a tooltip, since long GUIDs are visually truncated.
    row.title = `${ENV_LABELS[entry.env] || 'Unknown env'} — ${pageLabel}: ${entry.id}`;

    row.addEventListener('click', () => select(index));
    // Double-click reopens in the same environment it was launched in.
    row.addEventListener('dblclick', () => {
      if (entry.env) {
        launchRecent(entry, entry.env);
      }
    });

    listbox.appendChild(row);
  });

  function select(index) {
    selectedIndex = index;
    listbox.querySelectorAll('.recent-item').forEach((row, i) => {
      row.setAttribute('aria-selected', String(i === index));
    });
    listbox.children[index]?.scrollIntoView({ block: 'nearest' });
  }

  select(0);

  listbox.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      select(Math.min(selectedIndex + 1, entries.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      select(Math.max(selectedIndex - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const entry = entries[selectedIndex];
      if (entry?.env) {
        launchRecent(entry, entry.env);
      }
    }
  });

  async function launchRecent(entry, env) {
    await chrome.runtime.sendMessage({
      type: 'launchLink',
      options: { env, pageUrl: entry.pageUrl, guid: entry.id }
    });
    window.close();
  }

  fieldset.hidden = false;

  for (const button of fieldset.querySelectorAll('button[data-openrecent]')) {
    button.addEventListener('click', () => {
      const entry = entries[selectedIndex];
      if (entry) {
        launchRecent(entry, button.dataset.openrecent);
      }
    });
  }

  document.getElementById('clear-recent').addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ type: 'clearRecentLaunches' });
    listbox.replaceChildren();
    fieldset.hidden = true;
  });
}

init();
