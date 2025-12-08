// js/emoji-toolbar.js
// Updated toolbar:
// - icons display at 16x16
// - insert Unicode emoji (mapping) on click (no filenames)
// - attach only to message textarea (heuristic: textarea with height/rows sufficiently large)
// - responds to storage.bitcointalk.emojiToolbarList and enableEmojiToolbar

(function () {
  if (window.__bt_emoji_toolbar_installed) return;
  window.__bt_emoji_toolbar_installed = true;

  // Map filenames -> Unicode (used for insertion)
  const UNICODE_MAP = {
    'evil-grin.png': '😈',
    'smile.png': '😊',
    'flushed.png': '😳',
    'innocent.png': '😇',
    'joy.png': '😂',
    'sad.png': '😢',
    'angry.png': '😠',
    'love.png': '😍',
    'surprised.png': '😲',
    'thinking.png': '🤔',
    'cry.png': '😭',
    'thumbs-up.png': '👍',
    'thumbs-down.png': '👎',
    'wink.png': '😉',
    'laugh.png': '😆',
    'bored.png': '🙄',
    'sleepy.png': '😴',
    'party.png': '🎉',
    'cool.png': '😎',
    'blush.png': '🙂'
  };

  function getDefaultToolbarList() {
    return ['evil-grin.png','smile.png','joy.png','love.png','laugh.png','thumbs-up.png','sad.png','angry.png','surprised.png','wink.png','cry.png','thinking.png'];
  }

  function buildItemsFromList(list) {
    const arr = Array.isArray(list) && list.length ? list : getDefaultToolbarList();
    return arr.map(fn => ({
      filename: fn,
      imgSrc: chrome.runtime.getURL(`images/emojis/${fn}`),
      unicode: UNICODE_MAP[fn] || ''
    }));
  }

  const STYLE_ID = 'bt-emoji-toolbar-style';
  if (!document.getElementById(STYLE_ID)) {
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
      .bt-emoji-toolbar { display:inline-flex !important; gap:6px !important; align-items:center !important; margin:4px 0 !important; }
      .bt-emoji-btn {
        display:inline-flex !important;
        align-items:center !important;
        justify-content:center !important;
        cursor:pointer !important;
        border:1px solid rgba(0,0,0,0.06) !important;
        background:#fff !important;
        padding:2px !important;
        border-radius:4px !important;
        width:20px !important;
        height:20px !important;
        box-shadow:0 1px 1px rgba(0,0,0,0.04) !important;
        box-sizing:border-box !important;
      }
      .bt-emoji-btn img { width:16px !important; height:16px !important; max-width:16px !important; max-height:16px !important; object-fit:contain !important; display:block !important; }
      .bt-emoji-btn:hover { background:#f5f6f8 !important; transform: translateY(-1px) !important; }
      .bt-emoji-toolbar.inline-after { margin-left:6px !important; vertical-align:middle !important; display:inline-flex !important; }
    `;
    document.head.appendChild(s);
  }

  // Heuristic: attach only to message textarea elements (large textareas)
  function isLargeTextarea(ta) {
    if (!ta || ta.tagName !== 'TEXTAREA') return false;
    // prefer ones with rows >= 3 or visible height > 80px
    try {
      const rows = parseInt(ta.getAttribute('rows') || '0');
      if (rows >= 3) return true;
      const rect = ta.getBoundingClientRect();
      if (rect && rect.height && rect.height > 80) return true;
    } catch (e) {}
    return false;
  }

  function createToolbar(items) {
    const wrapper = document.createElement('div');
    wrapper.className = 'bt-emoji-toolbar';
    items.forEach(item => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'bt-emoji-btn';
      btn.title = item.filename.replace(/\.[^.]+$/, '');
      const img = document.createElement('img');
      img.src = item.imgSrc;
      img.alt = item.filename.replace(/\.[^.]+$/, '');
      img.decoding = 'async';
      img.addEventListener('error', () => {
        if (btn.contains(img)) btn.removeChild(img);
        btn.textContent = item.unicode || '⍰';
      });
      btn.appendChild(img);
      btn.dataset.unicode = item.unicode || '';
      wrapper.appendChild(btn);
    });
    return wrapper;
  }

  function insertIntoTextInput(el, text) {
    try {
      el.focus();
      const start = el.selectionStart ?? el.value.length;
      const end = el.selectionEnd ?? start;
      const v = el.value || '';
      const newValue = v.slice(0, start) + text + v.slice(end);
      el.value = newValue;
      const pos = start + text.length;
      el.setSelectionRange(pos, pos);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    } catch (err) {
      console.warn('bt-emoji: insertIntoTextInput failed', err);
    }
  }

  function attachToolbarTo(target, items) {
    if (!target || target.__bt_has_toolbar) return;
    if (!isLargeTextarea(target)) return;

    target.__bt_has_toolbar = true;
    const toolbar = createToolbar(items);
    toolbar.classList.add('inline-after');

    try {
      // place toolbar above the textarea (so it visually relates to message area)
      target.insertAdjacentElement('beforebegin', toolbar);
    } catch (err) {
      const parent = target.parentNode;
      if (parent) parent.appendChild(toolbar);
    }

    toolbar.addEventListener('click', (ev) => {
      const btn = ev.target.closest('.bt-emoji-btn');
      if (!btn) return;
      const unicode = btn.dataset.unicode || '';
      if (!unicode) return;
      insertIntoTextInput(target, unicode);
    });
  }

  function removeAllToolbars() {
    document.querySelectorAll('.bt-emoji-toolbar').forEach(el => el.remove());
    document.querySelectorAll('textarea').forEach(n => {
      try { n.__bt_has_toolbar = false; } catch (e) {}
    });
  }

  function scanAndAttach(items, root = document) {
    const nodes = root.querySelectorAll('textarea');
    nodes.forEach(n => attachToolbarTo(n, items));
  }

  // Read settings and init
  function initFromStorage() {
    chrome.storage.local.get('bitcointalk', (res) => {
      const s = res && res.bitcointalk ? res.bitcointalk : {};
      const enabled = s.enableEmojiToolbar !== false;
      const list = Array.isArray(s.emojiToolbarList) && s.emojiToolbarList.length ? s.emojiToolbarList : getDefaultToolbarList();
      const items = buildItemsFromList(list);
      removeAllToolbars();
      if (enabled) {
        scanAndAttach(items);
        if (!window.__bt_toolbar_mu) {
          const mo = new MutationObserver(muts => {
            for (const m of muts) {
              if (m.type === 'childList' && m.addedNodes.length) {
                m.addedNodes.forEach(node => {
                  if (node.nodeType !== 1) return;
                  scanAndAttach(items, node);
                });
              }
            }
          });
          mo.observe(document.documentElement || document.body, { childList: true, subtree: true });
          window.__bt_toolbar_mu = mo;
        }
      } else {
        if (window.__bt_toolbar_mu) {
          try { window.__bt_toolbar_mu.disconnect(); } catch (e) {}
          window.__bt_toolbar_mu = null;
        }
      }
    });
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.bitcointalk) initFromStorage();
  });

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg && (msg.type === 'emoji-toolbar-update' || (msg.type && msg.type.indexOf('enableEmojiToolbar') !== -1))) {
      initFromStorage();
    }
  });

  // initial
  initFromStorage();
})();