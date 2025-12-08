// js/emoticon-replacer.js
// Converts typed emoticon shortcuts into Unicode emoji OR into BBCode / [img] BBCode.
// - Configurable mode via storage.bitcointalk.emoticonReplacementMode = 'unicode' | 'bbcode' | 'img'
// - If mode === 'img', imagesUrlBase must point to a public HTTPS URL where images are hosted
//   (chrome-extension:// URLs won't work when the forum renders posts).
//
// Default: 'unicode' (best compatibility).
//
// Usage: to switch mode persistently from popup or console:
//   chrome.storage.local.get('bitcointalk', s => { s = s.bitcointalk||{}; s.emoticonReplacementMode = 'bbcode'; chrome.storage.local.set({ bitcointalk: s }); });
//   // or set to 'img' and set emoticonImageBase to "https://your.cdn.example/emojis/"
//
// Notes about [img] mode:
// - If you use image URLs hosted on your extension (chrome.runtime.getURL), those URLs are chrome-extension:// and
//   will not be accessible to the forum when rendering other users' posts. Use a public https URL (CDN, GitHub raw, etc.)
//
// The rest of this file is the replacer logic (improved, uses existing token-detection from previous version).

(function () {
  if (window.__bt_emoticon_replacer_with_modes) return;
  window.__bt_emoticon_replacer_with_modes = true;

  // Base mapping from shortcut -> unicode (used as canonical list)
  const BASE_MAP = {
    '>:D': '😈',
    '^-^': '😊',
    'O0': '😳',
    'C:-)': '😇',
    '0:)': '😇',
    ':)': '🙂',
    ':-)': '🙂',
    ':D': '😄',
    ':(': '☹️',
    ':/': '😕',
    ';)': '😉'
  };

  // public image basename mapping (filename per shortcut) — used for 'img' mode to build URLs
  const IMAGE_NAME_FOR = {
    '>:D': 'evil-grin.png',
    '^-^': 'smile.png',
    'O0': 'flushed.png',
    'C:-)': 'innocent.png',
    '0:)': 'innocent.png',
    ':)': 'blush.png',
    ':-)': 'blush.png',
    ':D': 'smile.png',
    ':(': 'sad.png',
    ':/': 'confused.png',
    ';)': 'wink.png'
  };

  // Default public base for emoji images (change to your CDN/GitHub raw URL if you want 'img' mode)
  const DEFAULT_IMAGE_BASE = 'https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/'; // expects codepoints as filenames if used
  // Example if you host your own: 'https://yourdomain.com/extension-emojis/'

  // Maximum token length considered
  const MAX_TOKEN_LEN = 24;

  // Build the active EMOTICON_MAP based on chosen mode and image base.
  function buildMapForMode(mode, imageBase) {
    const map = {};
    for (const k of Object.keys(BASE_MAP)) {
      if (mode === 'unicode') {
        map[k] = BASE_MAP[k];
      } else if (mode === 'bbcode') {
        // Insert BBCode using the unicode as visible fallback text (e.g. [b]:)[/b] is arbitrary — here we use plain unicode inside BBCode img is optional)
        // Example: replace ":)" -> ":)" replaced by "😊" wrapped in nothing (BBCode commonly used is [img]...[/img] for images)
        // For bbcode mode we insert plain text BBCode token - here we choose to insert the unicode inside the text (you can change)
        map[k] = BASE_MAP[k]; // simplest: use unicode even for bbcode mode (forum will show emoji)
      } else if (mode === 'img') {
        const fname = IMAGE_NAME_FOR[k];
        if (!fname) {
          // fallback to unicode if we don't have an image
          map[k] = BASE_MAP[k];
        } else {
          // If your imageBase points directly to raw files with those filenames, build full URL.
          // IMPORTANT: Use a public HTTPS URL so the forum can fetch the image when rendering posts.
          const url = (imageBase || DEFAULT_IMAGE_BASE).replace(/\/+$/, '') + '/' + fname;
          // Insert BBCode [img]...[/img]
          map[k] = `[img]${url}[/img]`;
        }
      }
    }
    return map;
  }

  // --- token detection & replacement helpers (textarea / contentEditable) ---
  function getTokenBeforeCaretTextarea(el) {
    const pos = el.selectionStart;
    const value = el.value;
    let i = pos - 1, steps = 0;
    while (i >= 0 && steps < MAX_TOKEN_LEN && !/\s/.test(value[i])) { i--; steps++; }
    const start = i + 1;
    const token = value.slice(start, pos);
    return { start, end: pos, token };
  }

  function replaceTokenInTextarea(el, start, end, replacement) {
    const v = el.value;
    const newValue = v.slice(0, start) + replacement + v.slice(end);
    const newPos = start + replacement.length;
    el.value = newValue;
    try { el.setSelectionRange(newPos, newPos); } catch (e) {}
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function getTokenRangeBeforeCaretContentEditable() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    const range = sel.getRangeAt(0).cloneRange();
    let { startContainer, startOffset } = range;
    if (startContainer.nodeType !== Node.TEXT_NODE) {
      // try to find a nearby text node preceding the caret
      let node = startContainer;
      if (startContainer.childNodes && startContainer.childNodes[startOffset - 1]) {
        node = startContainer.childNodes[startOffset - 1];
        while (node && node.nodeType !== Node.TEXT_NODE && node.lastChild) node = node.lastChild;
      } else {
        let prev = startContainer.childNodes && startContainer.childNodes[startOffset - 1] ? startContainer.childNodes[startOffset - 1] : startContainer.previousSibling;
        let nodeFound = prev;
        while (nodeFound && nodeFound.nodeType !== Node.TEXT_NODE) {
          nodeFound = nodeFound && nodeFound.lastChild ? nodeFound.lastChild : nodeFound.previousSibling;
        }
        node = nodeFound;
      }
      if (!node || node.nodeType !== Node.TEXT_NODE) return null;
      startContainer = node;
      startOffset = node.nodeValue ? node.nodeValue.length : 0;
    }
    const text = startContainer.nodeValue || '';
    let i = startOffset - 1, steps = 0;
    while (i >= 0 && steps < MAX_TOKEN_LEN && !/\s/.test(text[i])) { i--; steps++; }
    const tokenStart = i + 1;
    const token = text.slice(tokenStart, startOffset);
    const tokenRange = document.createRange();
    tokenRange.setStart(startContainer, tokenStart);
    tokenRange.setEnd(startContainer, startOffset);
    return { range: tokenRange, token };
  }

  function replaceTokenInContentEditableRange(tokenRange, replacement) {
    try {
      // If replacement contains BBCode like [img]...[/img] we should insert as text node.
      const node = document.createTextNode(replacement);
      tokenRange.deleteContents();
      tokenRange.insertNode(node);
      const sel = window.getSelection();
      const newRange = document.createRange();
      newRange.setStartAfter(node);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
      // Fire input on nearest contentEditable ancestor
      let anc = node.parentNode;
      while (anc && !anc.isContentEditable) anc = anc.parentNode;
      if (anc && anc.isContentEditable) anc.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    } catch (err) {
      console.warn('replaceTokenInContentEditableRange failed', err);
      return false;
    }
  }

  // Attempt replace on an editable target using the provided map
  function attemptReplaceInTextLike(target, map) {
    if (!target) return;
    if (target.tagName === 'TEXTAREA' || (target.tagName === 'INPUT' && target.type === 'text')) {
      const info = getTokenBeforeCaretTextarea(target);
      if (!info || !info.token) return;
      const replacement = map[info.token];
      if (replacement !== undefined) replaceTokenInTextarea(target, info.start, info.end, replacement);
      return;
    }
    if (target.isContentEditable || (target.closest && target.closest('[contenteditable="true"]'))) {
      const found = getTokenRangeBeforeCaretContentEditable();
      if (!found || !found.token) return;
      const replacement = map[found.token];
      if (replacement !== undefined) replaceTokenInContentEditableRange(found.range, replacement);
    }
  }

  // Attach listeners to elements
  function attachListenersTo(el, mapGetter) {
    if (!el || el.__bt_emoticon_listener_modes) return;
    el.__bt_emoticon_listener_modes = true;

    el.addEventListener('input', (e) => { attemptReplaceInTextLike(e.target, mapGetter()); }, { passive: true });
    el.addEventListener('keyup', (e) => {
      const k = e.key;
      if (!k || (k.length === 1) || k === 'Backspace' || k === 'Enter' || k === ' ') {
        attemptReplaceInTextLike(e.target, mapGetter());
      }
    });
    el.addEventListener('paste', (e) => { setTimeout(() => attemptReplaceInTextLike(e.target, mapGetter()), 30); });
    el.addEventListener('blur', (e) => attemptReplaceInTextLike(e.target, mapGetter()));
  }

  function scanAndAttach(mapGetter) {
    const nodes = document.querySelectorAll('textarea, input[type="text"], [contenteditable="true"]');
    nodes.forEach(el => {
      try {
        if ((el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && el.offsetWidth && el.offsetWidth < 120) return;
      } catch (e) {}
      attachListenersTo(el, mapGetter);
    });
  }

  function startMutationObserver(mapGetter) {
    if (window.__bt_emoticon_modes_mu) return;
    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'childList' && m.addedNodes.length) {
          m.addedNodes.forEach(n => { if (n.nodeType === 1) scanAndAttach(mapGetter); });
        }
      }
    });
    mo.observe(document.documentElement || document.body, { childList: true, subtree: true });
    window.__bt_emoticon_modes_mu = mo;
  }

  // Build and return the current map according to stored mode
  function getActiveMapSync(storage) {
    const s = storage && storage.bitcointalk ? storage.bitcointalk : {};
    const mode = (s.emoticonReplacementMode || 'unicode').toLowerCase();
    const imageBase = s.emoticonImageBase || ''; // optional base for img mode
    return buildMapForMode(mode, imageBase);
  }

  // init: read storage and attach listeners with map getter
  function initFromSetting() {
    chrome.storage.local.get('bitcointalk', (storage) => {
      const s = storage && storage.bitcointalk ? storage.bitcointalk : {};
      const enabled = s.enableEmoticonReplacer !== false; // default true
      if (!enabled) {
        // disconnect observer if present
        if (window.__bt_emoticon_modes_mu) {
          try { window.__bt_emoticon_modes_mu.disconnect(); } catch (e) {}
          window.__bt_emoticon_modes_mu = null;
        }
        return;
      }

      // Build a map getter which always returns the latest map based on storage snapshot
      let currentMap = getActiveMapSync(storage);
      const mapGetter = () => currentMap;

      // attach to existing fields
      scanAndAttach(mapGetter);
      startMutationObserver(mapGetter);

      // Watch for storage changes to update currentMap
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local') return;
        if (changes.bitcointalk) {
          const newS = changes.bitcointalk.newValue || {};
          const mode = (newS.emoticonReplacementMode || 'unicode').toLowerCase();
          const imageBase = newS.emoticonImageBase || '';
          currentMap = buildMapForMode(mode, imageBase);
        } else {
          // If a direct key was changed (legacy), rebuild based on full storage
          chrome.storage.local.get('bitcointalk', (st) => { currentMap = getActiveMapSync({ bitcointalk: st.bitcointalk || {} }); });
        }
      });
    });
  }

  // Fallback: replace on submit to catch any remaining tokens
  document.addEventListener('submit', (e) => {
    try {
      chrome.storage.local.get('bitcointalk', (storage) => {
        const map = getActiveMapSync(storage);
        const form = e.target;
        const tnodes = form.querySelectorAll('textarea, input[type="text"], [contenteditable="true"]');
        tnodes.forEach(node => {
          if (node.tagName === 'TEXTAREA' || (node.tagName === 'INPUT' && node.type === 'text')) {
            let v = node.value;
            Object.keys(map).forEach(k => {
              const esc = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              v = v.replace(new RegExp(`(?<=\\s|^)${esc}(?=\\s|$)`, 'g'), map[k]);
            });
            if (v !== node.value) {
              node.value = v;
              node.dispatchEvent(new Event('input', { bubbles: true }));
            }
          } else {
            const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null, false);
            const textNodes = [];
            while (walker.nextNode()) textNodes.push(walker.currentNode);
            textNodes.forEach(tn => {
              let tv = tn.nodeValue;
              Object.keys(map).forEach(k => {
                const esc = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                tv = tv.replace(new RegExp(`(?<=\\s|^)${esc}(?=\\s|$)`, 'g'), map[k]);
              });
              if (tv !== tn.nodeValue) tn.nodeValue = tv;
            });
          }
        });
      });
    } catch (err) { /* non-fatal */ }
  }, true);

  // start
  initFromSetting();

})();