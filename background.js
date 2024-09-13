/*
  Add right click copy functions
      recordid
  Add right click open in new tab
     all links?

*/

chrome.runtime.onInstalled.addListener(function () {
  chrome.storage.sync.set({
    'envPaths': {
      "DEV": "https://crm-dev.advancement.brown.edu/BBdevl/webui/webshellpage.aspx?databasename=BBDevl#",
      "QA": "https://qa-crm.advancement.brown.edu/BBStaging/webui/webshellpage.aspx?databasename=BBStaging#",
      "PROD": "https://phenix.advancement.brown.edu/BBPhenix/webui/webshellpage.aspx?databasename=BBPhenix#",
      "LOCAL": ""
    }
  });
  chrome.storage.sync.set({
    'recentLaunches': {}
  });
  // chrome.contextMenus.create({
  //   "id": "sampleContextMenu",
  //   "title": "Sample Context Menu",
  //   "contexts": ["selection"]
  // });
});


chrome.contextMenus.removeAll();
chrome.contextMenus.create({
  "title": "Open in", "id": "openin",
  "documentUrlPatterns": ["*://*/*webshellpage.aspx*"]
});

chrome.contextMenus.create({
  "title": "Copy record id", "id": "copyitem",
  "documentUrlPatterns": ["*://*/*webshellpage.aspx*"]
});
chrome.contextMenus.create({ "title": "Dev", "id": "dev", parentId: "openin" })

chrome.contextMenus.create({ "title": "Qa", "id": "qa", parentId: "openin" })

chrome.contextMenus.create({ "title": "Prod", "id": "prod", parentId: "openin" })

chrome.contextMenus.create({ "title": "Local", "id": "local", parentId: "openin" })

chrome.contextMenus.onClicked.addListener(function callback(info, tab) {
  if (info.parentMenuItemId == 'openin') {
    redirectPage(info.menuItemId);
  } else {
    copyValueFromQueryString('recordid');
  }
});

chrome.commands.onCommand.addListener(function (command) {
  if (command != 'copyrecordid') {
    redirectPage(command);
  } else {
    copyValueFromQueryString('recordid');
  }

});

function redirectPage(env) {
  getBaseUrl(env, function (base) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (t) {
      var tab = t[0];
      if (!tab) { return; }
      chrome.tabs.create({
        "url": base + (tab.url.split('#')[1] || ''),
        "active": false,
        "index": tab.index + 1
      });
    });
  });
};

function copyText(text) {
  const input = document.createElement('input');
  document.body.appendChild(input);
  input.value = text || '';
  input.focus();
  input.select();
  const result = document.execCommand('copy');
};

function copyValueFromQueryString(variable) {
  chrome.tabs.query({ active: true, currentWindow: true }, function (t) {
    if (!t || t.length == 0) {
      return;
    }
    var split = t[0].url.split('#');
    if (split.length < 2) {
      return;
    }
    var query = split[1];

    var vars = query.split('&');
    for (var i = 0; i < vars.length; i++) {
      var pair = vars[i].split('=');
      if (decodeURIComponent(pair[0].toLocaleLowerCase()) == variable) {

        copyText(decodeURIComponent(pair[1] || ''));
        return;

      }
    }
  });
};

function launchLink(options) { //env, guid, pageId, pageLinkInfo) {

  getBaseUrl(options.env, function (base) {


    chrome.tabs.query({ active: true, currentWindow: true }, function (t) {
      if (!t) {
        return;
      }
      var tabIndex = t[0].index + 1;
      var url = 'pageType=p&pageId=' + (options.pageId || '') + '&recordId=' + (options.guid || '');
      if(options.pageLinkInfo) { 
        url = options.pageLinkInfo;
      }
      chrome.tabs.create({
        "url": base + url,
        "active": false,
        "index": tabIndex
      }
        , function (tabInfo) {
          setTimeout(function () {

            chrome.storage.sync.get('recentLaunches', function (data) {
              var launches = data.recentLaunches;

              chrome.tabs.get(tabInfo.id, function (tab) {
                if (tab.title && (tab.title.indexOf('not found') > 0 || tab.title.indexOf('error') > 0 || tab.title == 'Blackbaud CRM')) {
                  return;
                }
                var updatedLaunches = launches;
                updatedLaunches[tab.url.split('#')[1].toLocaleString()] = tab.title.split("-")[0];
                chrome.storage.sync.set({
                  'recentLaunches': updatedLaunches
                });

              });
            });

          }, 5000);
        });
    });

  });
};

function getBaseUrl(env, callback) {
  chrome.storage.sync.get('envPaths', function (data) {
    var base = '';
    if (env == 'dev') {
      base = data.envPaths.DEV;
    } else if (env == 'qa') {
      base = data.envPaths.QA;
    } else if (env == 'local') {
      base = data.envPaths.LOCAL;
    } else {
      base = data.envPaths.PROD;
    }
    callback(base);
  });
};