(function () {
  try {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      var url = (tabs && tabs[0] && tabs[0].url) ? tabs[0].url : '';
      var root = document.getElementById('popup-root');
      if (/\bbitcointalk\.org\b/.test(url)) {
        // load scripts only when on bitcointalk
        if (!window.jQuery) {
          var s1 = document.createElement('script');
          s1.src = 'js/jquery-3.3.1.min.js';
          s1.onload = function () {
            var s2 = document.createElement('script');
            s2.src = 'js/popup.js';
            document.body.appendChild(s2);
          };
          document.body.appendChild(s1);
        } else {
          var s2 = document.createElement('script');
          s2.src = 'js/popup.js';
          document.body.appendChild(s2);
        }
      } else {
        // show a simple, non-interactive message (no buttons)
        if (root) {
          root.innerHTML = '<div style="font-family: Arial, Helvetica, sans-serif; padding:24px; box-sizing:border-box; width:100%; height:100%; display:flex; align-items:center; justify-content:center;">'
            + '<div style="max-width:360px; text-align:center;">'
            + '<h2 style="margin:0 0 8px 0; font-size:18px;">This extension is exclusively for BitcoinTalk.</h2>'
            + '<p style="margin:0; color:#444;">Open bitcointalk.org to view the extension tools.</p>'
            + '</div></div>';
        } else {
          document.body.innerText = 'This extension is exclusively for BitcoinTalk.';
        }
      }
    });
  } catch (e) {
    // fallback: load popup scripts (best-effort)
    if (!window.jQuery) {
      var s1 = document.createElement('script');
      s1.src = 'js/jquery-3.3.1.min.js';
      s1.onload = function () { var s2 = document.createElement('script'); s2.src = 'js/popup.js'; document.body.appendChild(s2); };
      document.body.appendChild(s1);
    } else {
      var s2 = document.createElement('script'); s2.src = 'js/popup.js'; document.body.appendChild(s2);
    }
  }
})();
