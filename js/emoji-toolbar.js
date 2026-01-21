// js/emoji-toolbar.js
// Updated toolbar:
// - icons display at 16x16
// - insert Unicode emoji (mapping) on click (no filenames)
// - attach only to message textarea (heuristic: textarea with height/rows sufficiently large)
// - responds to storage.bitcointalk.emojiToolbarList and enableEmojiToolbar

(function () {
  if (window.__bt_emoji_toolbar_installed) return;

  function isTrustPage() {
    try {
      var h = location.href || '';
      var p = location.pathname || '';
      if (/action=trust(?:[;?&]|$)/i.test(h)) return true;
      if (/\/trust(?:[/?#]|$)/i.test(p)) return true;
    } catch (e) { }
    return false;
  }

  // If this is a Bitcointalk "trust" page or a subpage, do NOT install the emoji toolbar
  // but ensure any image-upload UI is hidden/disabled to avoid exposing upload functionality.
  if (isTrustPage()) {
    try {
      const HIDE_SELECTORS = [
        '.ql-image',
        'button.ql-image',
        'button[id*="image"]',
        'button[title*="Image"]',
        'button[aria-label*="Image"]',
        'input[type="file"][accept*="image"]',
        '.insert_image',
        '.image-upload',
        '.bt-image-upload'
      ];

      function hideImageElements(root) {
        try {
          const docRoot = root || document;
          HIDE_SELECTORS.forEach(sel => {
            try {
              docRoot.querySelectorAll(sel).forEach(el => {
                try {
                  if (el.dataset && el.dataset.__bt_hidden) return;
                  el.dataset.__bt_hidden = '1';
                  try { el.__bt_prev_display = el.style.display || ''; } catch (e) { }
                  try { el.style.display = 'none'; } catch (e) { }
                  try { el.disabled = true; } catch (e) { }
                } catch (e) { }
              });
            } catch (e) { }
          });
        } catch (e) { }
      }

      hideImageElements(document);
      // Observe DOM for dynamically-added upload buttons and hide them as they appear
      try {
        if (!window.__bt_hide_image_mu) {
          const mo = new MutationObserver(muts => {
            for (const m of muts) {
              if (m.addedNodes && m.addedNodes.length) hideImageElements(m.target || document);
            }
          });
          mo.observe(document.documentElement || document.body, { childList: true, subtree: true });
          window.__bt_hide_image_mu = mo;
        }
      } catch (e) { }
    } catch (e) { }
    return;
  }

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
    return [
      'smile.png', 'joy.png', 'laugh.png', 'love.png', 'party.png', 'thumbs-up.png', 'thumbs-down.png',
      'wink.png', 'evil-grin.png', 'cool.png', 'blush.png', 'bored.png', 'sleepy.png', 'innocent.png',
      'flushed.png', 'surprised.png', 'thinking.png', 'cry.png', 'sad.png', 'angry.png'
    ];
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
      /* Toolbar aligned left above the editor; toolbar container uses default cursor */
      .bt-emoji-toolbar { display:flex !important; gap:6px !important; align-items:center !important; justify-content:flex-start !important; width:100% !important; margin:6px 0 !important; cursor:default !important; }
      .bt-emoji-btn {
        display:inline-flex !important;
        align-items:center !important;
        justify-content:center !important;
        cursor:pointer !important;
        border:1px solid rgba(0,0,0,0.06) !important;
        background:#fff !important;
        padding:2px !important;
        border-radius:4px !important;
        width:24px !important;
        height:24px !important;
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
      // Avoid frequent layout reads: cache the computed "large" result for 1000ms
      const now = Date.now();
      const cacheKey = '__bt_large_cache';
      const cacheTimeKey = '__bt_large_cache_time';
      const cachedTime = ta[cacheTimeKey] || 0;
      if (ta[cacheKey] !== undefined && (now - cachedTime) < 1000) {
        return !!ta[cacheKey];
      }
      const rect = ta.getBoundingClientRect();
      const isLarge = !!(rect && rect.height && rect.height > 80);
      try { ta[cacheKey] = isLarge; ta[cacheTimeKey] = now; } catch (e) { }
      if (isLarge) return true;
    } catch (e) { }
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
      // If an SCEditor instance exists for this textarea, insert via the editor
      let inst = null;
      if (window.sceditor && typeof sceditor.instance === 'function') {
        try { inst = sceditor.instance(el); } catch (e) { inst = null; }
      }
      if (inst && typeof inst.insert === 'function') {
        try { inst.insert(text); } catch (e) { /* ignore */ }
        try { inst.updateOriginal(); } catch (e) { /* ignore */ }
        try { inst.focus(); } catch (e) { /* ignore */ }
        return;
      }

      // Fallback to inserting into the native textarea
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

    // If SCEditor instance exists, attach next to the editor content container.
    let attachElement = target;
    if (window.sceditor && typeof sceditor.instance === 'function') {
      try {
        const inst = sceditor.instance(target);
        if (inst && typeof inst.getContentAreaContainer === 'function') {
          const container = inst.getContentAreaContainer();
          if (container) attachElement = container;
        }
      } catch (e) {
        /* ignore - fall back to textarea */
      }
    }

    // Only attach if the target (or editor container) is visible or the textarea is large
    try {
      if (attachElement === target && !isLargeTextarea(target)) return;
    } catch (e) { /* ignore */ }

    target.__bt_has_toolbar = true;
    const toolbar = createToolbar(items);
    // Place toolbar above the editor/textarea, left-aligned
    toolbar.classList.remove('inline-after');

    try {
      // Insert above the attachment point so it appears above the editor
      attachElement.insertAdjacentElement('beforebegin', toolbar);
    } catch (err) {
      const parent = attachElement.parentNode;
      if (parent) parent.insertBefore(toolbar, attachElement);
      else document.body.appendChild(toolbar);
    }

    // If an SCEditor instance exists for this textarea, cache it on the toolbar
    try {
      if (window.sceditor && typeof sceditor.instance === 'function') {
        try {
          const inst = sceditor.instance(target);
          if (inst) toolbar._bt_inst = inst;
        } catch (e) { /* ignore */ }
      }
    } catch (e) { /* ignore */ }

    toolbar.addEventListener('click', (ev) => {
      const btn = ev.target.closest('.bt-emoji-btn');
      if (!btn) return;
      const unicode = btn.dataset.unicode || '';
      if (!unicode) return;

      // Prefer cached instance, otherwise try to get one dynamically
      let inst = toolbar._bt_inst || null;
      if (!inst && window.sceditor && typeof sceditor.instance === 'function') {
        try { inst = sceditor.instance(target); } catch (e) { inst = null; }
      }

      if (inst && typeof inst.insert === 'function') {
        try { inst.insert(unicode); } catch (e) { /* ignore */ }
        try { inst.updateOriginal(); } catch (e) { /* ignore */ }
        try { inst.focus(); } catch (e) { /* ignore */ }
        return;
      }

      // Fallback
      insertIntoTextInput(target, unicode);
    });
  }

  function removeAllToolbars() {
    document.querySelectorAll('.bt-emoji-toolbar').forEach(el => el.remove());
    document.querySelectorAll('textarea').forEach(n => {
      try { n.__bt_has_toolbar = false; } catch (e) { }
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
      // If no emojiToolbarList is stored, persist the default list for stability
      const shouldPersistDefault = !Array.isArray(s.emojiToolbarList) || !s.emojiToolbarList.length;
      const list = shouldPersistDefault ? getDefaultToolbarList() : s.emojiToolbarList;
      if (shouldPersistDefault) {
        try { s.emojiToolbarList = list; chrome.storage.local.set({ bitcointalk: s }); } catch (e) { /* ignore */ }
      }
      const items = buildItemsFromList(list);
      removeAllToolbars();
      if (enabled) {
        scanAndAttach(items);
        if (!window.__bt_toolbar_mu) {
          // Debounced scanner to avoid heavy work on rapid DOM mutations (reduces reflow/scroll jank)
          let scanTimer = null;
          const scheduleScan = (rootNode) => {
            if (scanTimer) clearTimeout(scanTimer);
            scanTimer = setTimeout(() => { scanAndAttach(items, rootNode || document); scanTimer = null; }, 120);
          };
          const mo = new MutationObserver(muts => {
            // if many mutations happen, schedule a single scan after quiet period
            for (const m of muts) {
              if (m.type === 'childList' && m.addedNodes.length) {
                scheduleScan(m.target || document);
                return;
              }
            }
          });
          mo.observe(document.documentElement || document.body, { childList: true, subtree: true });
          window.__bt_toolbar_mu = mo;
        }
      } else {
        if (window.__bt_toolbar_mu) {
          try { window.__bt_toolbar_mu.disconnect(); } catch (e) { }
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