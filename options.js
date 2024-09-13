document.getElementById('submitOptions').addEventListener('click', function () {
  chrome.storage.sync.set({ 'envPaths': {
    "DEV":   document.getElementById("dev-base-url").value
    , "QA":document.getElementById("qa-base-url").value 
    , "PROD":document.getElementById("prod-base-url").value 
    , "LOCAL": document.getElementById("local-base-url").value
  }});

}, function () {
    console.log('local is ' + document.getElementById("localEnvironment").value);
  });

chrome.storage.sync.get('envPaths', function (data) {
  
  document.getElementById("dev-base-url").value = data.envPaths.DEV || '';
  document.getElementById("qa-base-url").value = data.envPaths.QA || '';
  document.getElementById("prod-base-url").value = data.envPaths.PROD || '';
  document.getElementById("local-base-url").value = data.envPaths.LOCAL || '';
});