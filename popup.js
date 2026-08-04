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
}

init();
