(function () {
   var _me = this;

  _me.init = function () {
    document.querySelector('.guid').focus();

    chrome.storage.sync.get('recentLaunches', function (data) {

      var recentSelect = document.querySelector('#open-link-recent');
      var count = 0;
      for (var key in data.recentLaunches) {

        var label = data.recentLaunches[key];

        var newOption = document.createElement('option');
        newOption.text = label;
        newOption.value = key;
        recentSelect.add(newOption);
        count++;
        if (count > 10) {
          break;
        }
      }
    });

    var e = document.querySelectorAll('#open-in-environment >* button[data-openin]');

    for (var i = 0; i < e.length; i++) {
      var c = e[i];
      c.addEventListener('click', function () {
        var env = this.getAttribute('data-openin');
        chrome.extension.getBackgroundPage().redirectPage(env);
        window.close();
      });
    }

    var openConst = document.querySelectorAll('.open-with-guid >* button[data-openin]');
    for (var i = 0; i < openConst.length; i++) {
      var c = openConst[i];
      c.addEventListener('click', function () {
        var env = this.getAttribute('data-openin');
        var pageId = this.getAttribute('data-pageid');
        var guid = this.parentElement.parentElement.parentElement.querySelector('.guid').value;
        var options = { 'env': env, 'pageId': pageId, 'guid': guid };
        chrome.extension.getBackgroundPage().launchLink(options);
        window.close();
      });
    }

    var openRecent = document.querySelectorAll('#open-recent >* button[data-openin]');
    for (var i = 0; i < openRecent.length; i++) {
      var c = openRecent[i];
      c.addEventListener('click', function () {
        var env = this.getAttribute('data-openin');
        var options = { 'env': env, 'pageLinkInfo': document.querySelector('#open-link-recent').value };
        chrome.extension.getBackgroundPage().launchLink(options);
        window.close();
      });
    }
  }
  _me.init();

})();
