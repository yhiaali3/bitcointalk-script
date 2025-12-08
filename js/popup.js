// js/popup.js
// Popup logic: modern UI, emoji catalog selection, collapsible emoji panel,
// theme buttons restored, ON/OFF visual states (green/red) and persistent storage.

const EMOJI_CATALOG = [
  { id: 'evil-grin', filename: 'evil-grin.png', label: 'Mischievous', unicode: '😈' },
  { id: 'smile', filename: 'smile.png', label: 'Happy', unicode: '😊' },
  { id: 'flushed', filename: 'flushed.png', label: 'Embarrassed', unicode: '😳' },
  { id: 'innocent', filename: 'innocent.png', label: 'Innocent', unicode: '😇' },
  { id: 'joy', filename: 'joy.png', label: 'Joy', unicode: '😂' },
  { id: 'sad', filename: 'sad.png', label: 'Sad', unicode: '😢' },
  { id: 'angry', filename: 'angry.png', label: 'Angry', unicode: '😠' },
  { id: 'love', filename: 'love.png', label: 'Love', unicode: '😍' },
  { id: 'surprised', filename: 'surprised.png', label: 'Surprised', unicode: '😲' },
  { id: 'thinking', filename: 'thinking.png', label: 'Thinking', unicode: '🤔' },
  { id: 'cry', filename: 'cry.png', label: 'Crying', unicode: '😭' },
  { id: 'thumbs-up', filename: 'thumbs-up.png', label: 'Thumbs Up', unicode: '👍' },
  { id: 'thumbs-down', filename: 'thumbs-down.png', label: 'Thumbs Down', unicode: '👎' },
  { id: 'wink', filename: 'wink.png', label: 'Wink', unicode: '😉' },
  { id: 'laugh', filename: 'laugh.png', label: 'Laugh', unicode: '😆' },
  { id: 'bored', filename: 'bored.png', label: 'Bored', unicode: '🙄' },
  { id: 'sleepy', filename: 'sleepy.png', label: 'Sleepy', unicode: '😴' },
  { id: 'party', filename: 'party.png', label: 'Party', unicode: '🎉' },
  { id: 'cool', filename: 'cool.png', label: 'Cool', unicode: '😎' },
  { id: 'blush', filename: 'blush.png', label: 'Blush', unicode: '🙂' }
];

function getDefaultToolbarList() {
  return ['evil-grin.png','smile.png','joy.png','love.png','laugh.png','thumbs-up.png','sad.png','angry.png','surprised.png','wink.png','cry.png','thinking.png'];
}

$(function () {
  const $emojiGrid = $('#emoji-grid');
  const $enableEmoji = $('#enableEmoji');
  const $enableReplacer = $('#enableReplacer');
  const $zoomSlider = $('#zoomSlider');
  const $zoomValue = $('#zoomValue');
  const $emojiBody = $('#emojiBody');
  const $toggleEmojiPanel = $('#toggleEmojiPanel');
  const $emojiStatus = $('#emojiStatus');
  const $replacerStatus = $('#replacerStatus');

  // build emoji grid
  EMOJI_CATALOG.forEach(e => {
    const imgUrl = chrome.runtime.getURL(`images/emojis/${e.filename}`);
    const $tile = $(`
      <div class="emoji-tile" data-filename="${e.filename}" data-unicode="${e.unicode}" title="${e.label}">
        <img src="${imgUrl}" alt="${e.label}">
      </div>
    `);
    $emojiGrid.append($tile);
  });

  // load settings
  chrome.storage.local.get('bitcointalk', (result) => {
    const s = result && result.bitcointalk ? result.bitcointalk : {};
    // emoji toolbar toggle (default true)
    const enabledEmoji = s.enableEmojiToolbar !== false;
    $enableEmoji.prop('checked', enabledEmoji);
    updateStatusBadge($emojiStatus, enabledEmoji);

    // replacer toggle (default true)
    const enabledReplacer = s.enableEmoticonReplacer !== false;
    $enableReplacer.prop('checked', enabledReplacer);
    updateStatusBadge($replacerStatus, enabledReplacer);

    // emoji panel collapsed state default false (expanded)
    const collapsed = !!s.emojiPanelCollapsed;
    if (collapsed) $emojiBody.hide();
    $toggleEmojiPanel.text(collapsed ? '▸' : '▾');

    // zoom
    let zoom = 100;
    if (s && s.zoom && !isNaN(parseInt(s.zoom))) zoom = parseInt(s.zoom);
    $zoomSlider.val(zoom);
    $zoomValue.text(zoom + '%');
    updateRangeBackground($zoomSlider[0]);

    // theme / button states
    if (s) {
      Object.keys(s).forEach(k => {
        const v = s[k];
        // mark theme button active
        $(`button[data-key="${k}"][data-value="${v}"]`).addClass('active');
        // toggle style for on/off type keys
        if (['signature','avatar','price','pins','direction'].includes(k)) {
          setToggleButtonVisual(k, v);
        }
      });
    }

    // emoji toolbar list selections
    const chosen = Array.isArray(s.emojiToolbarList) && s.emojiToolbarList.length ? s.emojiToolbarList : getDefaultToolbarList();
    $emojiGrid.find('.emoji-tile').each(function () {
      const fn = $(this).data('filename');
      if (chosen.includes(fn)) $(this).addClass('selected');
    });
  });

  // helper: save bitcointalk object partially
  function saveKeyValue(key, value) {
    chrome.storage.local.get('bitcointalk', (res) => {
      const existing = res && res.bitcointalk ? res.bitcointalk : {};
      existing[key] = value;
      chrome.storage.local.set({ bitcointalk: existing }, () => {
        // notify active tab that settings changed
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          for (const tab of tabs) {
            chrome.tabs.sendMessage(tab.id, { type: key + '-toggle', value }, () => {});
            if (key === 'emojiToolbarList') chrome.tabs.sendMessage(tab.id, { type: 'emoji-toolbar-update' }, () => {});
          }
        });
      });
    });
  }

  // emoji tile click -> toggle selection
  $emojiGrid.on('click', '.emoji-tile', function () {
    $(this).toggleClass('selected');
    // gather selected filenames
    const selected = $emojiGrid.find('.emoji-tile.selected').map(function () { return $(this).data('filename'); }).get();
    // if none selected, fall back to default
    const list = selected.length ? selected : getDefaultToolbarList();
    saveKeyValue('emojiToolbarList', list);
  });

  // toggles
  $enableEmoji.on('change', function () {
    const val = $(this).prop('checked');
    saveKeyValue('enableEmojiToolbar', val);
    updateStatusBadge($emojiStatus, val);
    // show/hide compact body
    // no immediate UI change needed in popup except status
  });
  $enableReplacer.on('change', function () {
    const val = $(this).prop('checked');
    saveKeyValue('enableEmoticonReplacer', val);
    updateStatusBadge($replacerStatus, val);
  });

  // panel collapse control
  $toggleEmojiPanel.on('click', function () {
    $emojiBody.toggle();
    const collapsed = $emojiBody.is(':hidden');
    $toggleEmojiPanel.text(collapsed ? '▸' : '▾');
    saveKeyValue('emojiPanelCollapsed', collapsed);
  });

  // theme / other buttons
  $('button[data-key]').click(function () {
    const key = $(this).attr('data-key');
    const value = $(this).attr('data-value');

    // visual for theme buttons (only one theme at a time)
    if (key === 'theme') {
      $(`button[data-key="theme"]`).removeClass('active');
      $(this).addClass('active');
    } else if (['signature','avatar','price','pins','direction'].includes(key)) {
      // update visual state for toggle groups: mark the clicked value visually
      setToggleButtonVisual(key, value);
    }

    saveKeyValue(key, value);
    // notify content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      for (const tab of tabs) chrome.tabs.sendMessage(tab.id, { key: key, value: value }, () => {});
    });
  });

  // zoom slider
  $zoomSlider.on('input change', function () {
    const val = parseInt(this.value);
    $zoomValue.text(val + '%');
    updateRangeBackground(this);
    saveKeyValue('zoom', val);
    // notify tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      for (const tab of tabs) chrome.tabs.sendMessage(tab.id, { key: 'zoom', value: val }, () => {});
    });
  });

  // Helpers
  function updateRangeBackground(el) {
    if (!el) return;
    const min = parseInt(el.getAttribute('min')) || 50;
    const max = parseInt(el.getAttribute('max')) || 200;
    const val = parseInt(el.value || 100);
    const pct = Math.round(((val - min) / (max - min)) * 100);
    el.style.background = `linear-gradient(90deg, #2563eb 0%, #2563eb ${pct}%, #ddd ${pct}%, #ddd 100%)`;
  }

  function updateStatusBadge($el, enabled) {
    if (!$el || $el.length === 0) return;
    $el.text(enabled ? 'ON' : 'OFF');
    $el.css('color', enabled ? '#10b981' : '#ef4444');
  }

  function setToggleButtonVisual(key, value) {
    // remove active classes from both buttons in the group
    $(`button[data-key="${key}"]`).removeClass('active-on active-off');
    // find on/off buttons
    if (value === 'on' || value === 'ltr' || value === 'plus') {
      $(`button[data-key="${key}"][data-value="${value}"]`).addClass('active-on');
    } else if (value === 'off' || value === 'rtl' || value === 'minus') {
      $(`button[data-key="${key}"][data-value="${value}"]`).addClass('active-off');
    } else {
      // treat as on if it's not explicitly "off"
      $(`button[data-key="${key}"][data-value="${value}"]`).addClass('active-on');
    }
  }
});