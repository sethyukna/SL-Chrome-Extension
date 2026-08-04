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

async function initRecentLaunches() {
  const fieldset = document.getElementById('open-recent');
  const select = document.getElementById('open-link-recent');

  const { recentLaunches } = await chrome.storage.sync.get('recentLaunches');
  const entries = Array.isArray(recentLaunches) ? recentLaunches : [];

  if (!entries.length) {
    // Stays hidden so the popup does not show an empty dropdown.
    return;
  }

  for (const entry of entries) {
    const option = document.createElement('option');
    const label = PAGE_LABELS[entry.pageUrl] || entry.pageUrl;
    option.textContent = `${label}: ${entry.id}`;
    // Both fields are needed to relaunch, and option values are strings.
    option.value = JSON.stringify({ id: entry.id, pageUrl: entry.pageUrl });
    select.appendChild(option);
  }

  fieldset.hidden = false;

  for (const button of fieldset.querySelectorAll('button[data-openrecent]')) {
    button.addEventListener('click', async () => {
      if (!select.value) {
        return;
      }
      const { id, pageUrl } = JSON.parse(select.value);
      await chrome.runtime.sendMessage({
        type: 'launchLink',
        options: { env: button.dataset.openrecent, pageUrl, guid: id }
      });
      window.close();
    });
  }

  document.getElementById('clear-recent').addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ type: 'clearRecentLaunches' });
    select.replaceChildren();
    fieldset.hidden = true;
  });
}

init();
