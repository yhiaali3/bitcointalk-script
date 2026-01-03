// js/popup.js (canonical single copy kept below)

// Custom modal function
function showModal(message, callback) {
  const modal = document.getElementById('customModal');
  const msg = document.getElementById('modalMessage');
  const okBtn = document.getElementById('modalOk');
  const cancelBtn = document.getElementById('modalCancel');

  msg.textContent = message;
  modal.style.display = 'block';

  okBtn.onclick = () => {
    modal.style.display = 'none';
    if (callback) callback(true);
  };
  cancelBtn.onclick = () => {
    modal.style.display = 'none';
    if (callback) callback(false);
  };

  // If no callback is provided, treat it as an alert (only OK button matters)
  if (!callback) {
    cancelBtn.style.display = 'none';
    okBtn.onclick = () => {
      modal.style.display = 'none';
    };
  } else {
    cancelBtn.style.display = 'inline-block';
  }
}
// js/popup.js
// Popup logic: modern UI, theme manager, toggles and persistent storage.
$(function () {
  const $enableReplacer = $('#enableReplacer');
  const $zoomSlider = $('#zoomSlider');
  const $zoomValue = $('#zoomValue');
  const $replacerStatus = $('#replacerStatus');
  // load settings
  chrome.storage.local.get('bitcointalk', (result) => {
    const s = result && result.bitcointalk ? result.bitcointalk : {};
    // replacer toggle (default true)
    let enabledReplacer = s.enableEmoticonReplacer;
    if (typeof enabledReplacer === 'undefined') {
      enabledReplacer = true;
      // Save the default value in storage
      chrome.storage.local.set({ bitcointalk: { ...s, enableEmoticonReplacer: true } });
    }
    $enableReplacer.prop('checked', enabledReplacer);
    updateStatusBadge($replacerStatus, enabledReplacer);
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
        if (['signature', 'avatar', 'price', 'pins', 'direction'].includes(k)) {
          setToggleButtonVisual(k, v);
        }
      });
    }
   // Reset to default theme
    document.getElementById("resetTheme").addEventListener("click", () => {
  // Clear any stored theme settings
  try { localStorage.removeItem("theme"); } catch (e) { /* ignore */ }
  // remove theme key inside bitcointalk storage object
  chrome.storage.local.get('bitcointalk', (res) => {
    const b = (res && res.bitcointalk) ? res.bitcointalk : {};
    if (b.hasOwnProperty('theme')) delete b.theme;
    chrome.storage.local.set({ bitcointalk: b }, () => {
      // notify active tabs to clear injected themes and classes
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        for (const tab of tabs) {
          try {
            chrome.tabs.sendMessage(tab.id, { key: 'theme', value: 'on' });
            // also send a generic reset instruction
            chrome.tabs.sendMessage(tab.id, { type: 'extension-reset-theme' });
          } catch (e) { /* ignore send errors */ }
        }
      });
      // remove any CSS injected into popup itself
      document.querySelectorAll('link[data-extension-theme], style[data-extension-theme]').forEach(el => el.remove());
      // close/reload popup UI Only when changing the theme, not when enabling/disabling the Enable button
      // location.reload();
    });
  });
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
            chrome.tabs.sendMessage(tab.id, { type: key + '-toggle', value });
            if (key === 'emojiToolbarList') chrome.tabs.sendMessage(tab.id, { type: 'emoji-toolbar-update' });
          }
        });
      });
    });
  }
  // toggles
  $enableReplacer.on('change', function (event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const val = $(this).prop('checked');
    saveKeyValue('enableEmoticonReplacer', val);
    updateStatusBadge($replacerStatus, val);
    // Send a message to the current tab to directly enable or disable the editor
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs && tabs.length > 0) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'toggle-quill-editor', enabled: val });
      }
    });
  });
  $enableReplacer.on('change', function () {
    const val = $(this).prop('checked');
    saveKeyValue('enableEmoticonReplacer', val);
    updateStatusBadge($replacerStatus, val);
  });
  // (emoji panel removed) -- no collapse handler
  // theme / other buttons
  $('button[data-key]').click(function () {
    const key = $(this).attr('data-key');
    const value = $(this).attr('data-value');
    // visual for theme buttons (only one theme at a time)
    if (key === 'theme') {
      $(`button[data-key="theme"]`).removeClass('active');
      $(this).addClass('active');
      // If user explicitly picked a theme button, remove any stored custom/default theme
      try {
        chrome.storage.local.remove(['defaultTheme', 'customCss'], () => {
          // notify tabs to reset any injected custom/default themes so numeric theme can apply
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            for (const tab of tabs) {
              try { chrome.tabs.sendMessage(tab.id, { type: 'extension-reset-theme' }); } catch (e) { }
            }
          });
        });
      } catch (e) { /* ignore */ }
      // Apply theme CSS file for colorblind-safe
      if (value === 'colorblind-safe') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          for (const tab of tabs) {
            try {
              chrome.tabs.sendMessage(tab.id, {
                type: 'extension-apply-theme',
                theme: 'colorblind-safe',
                cssPath: 'css/bitcointalk/colorblind-safe.css'
              });
            } catch (e) { }
          }
        });
      }
    } else if (['signature', 'avatar', 'price', 'pins', 'direction'].includes(key)) {
      // update visual state for toggle groups: mark the clicked value visually
      setToggleButtonVisual(key, value);
    }
    saveKeyValue(key, value);
    // notify content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      for (const tab of tabs) chrome.tabs.sendMessage(tab.id, { key: key, value: value });
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
      for (const tab of tabs) chrome.tabs.sendMessage(tab.id, { key: 'zoom', value: val });
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
 // === Custom Themes Manager ===
  const textarea = document.getElementById('customCss');
  const themeNameInput = document.getElementById('themeName');
  const saveBtn = document.getElementById('saveTheme');
  const applyBtn = document.getElementById('applyTheme');
  const deleteBtn = document.getElementById('deleteTheme');
  const exportBtn = document.getElementById('exportThemes');
  const importBtn = document.getElementById('importThemes');
  const importFile = document.getElementById('importThemesFile');
  const editBtn = document.getElementById('editTheme');
  const themesList = document.getElementById('themesList');
  const cleanBtn = document.getElementById('cleanTheme');
  // Load saved themes
  chrome.storage.local.get('themes', (data) => {
    const themes = data.themes || {};
    updateThemesList(themes);
  });
  // Save new theme
  saveBtn.addEventListener('click', () => {
    const name = themeNameInput.value.trim();
    const cssCode = textarea.value;
    if (!name) {
      showModal("Please enter a theme name!", () => {});
      return;
    }
    chrome.storage.local.get('themes', (data) => {
      const themes = data.themes || {};
      if (themes[name]) {
        // existing theme -> ask to overwrite
        showModal(`Theme "${name}" already exists. Overwrite it?`, (confirmed) => {
          if (!confirmed) return;
          themes[name] = cssCode;
          chrome.storage.local.set({ themes }, () => {
            updateThemesList(themes);
          });
        });
      } else {
        // confirm before saving new theme
        showModal(`Save theme "${name}"?`, (confirmed) => {
          if (!confirmed) return;
          themes[name] = cssCode;
          chrome.storage.local.set({ themes }, () => {
            updateThemesList(themes);
          });
        });
      }
    });
  });
  // Apply selected theme
  applyBtn.addEventListener('click', () => {
    const selected = themesList.value;
    if (!selected) return;
    showModal(`Apply theme "${selected}"?`, (confirmed) => {
      if (!confirmed) return;
      chrome.storage.local.get('themes', (data) => {
        const themes = data.themes || {};
        const cssCode = themes[selected];
        // Save customCss and notify active tabs immediately so the theme applies now
        chrome.storage.local.set({ customCss: cssCode }, () => {
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            for (const tab of tabs) {
              try { chrome.tabs.sendMessage(tab.id, { type: 'extension-reset-theme' }); } catch (e) { }
              try { chrome.tabs.sendMessage(tab.id, { type: 'extension-apply-custom', css: cssCode }); } catch (e) { }
            }
          });
        });
      });
    });
  });
  // Delete selected theme
  deleteBtn.addEventListener('click', () => {
    const selected = themesList.value;
    if (!selected) return;
    // ask the user to confirm deletion
    showModal(`Are you sure you want to delete the theme "${selected}"?`, (confirmed) => {
      if (!confirmed) return;
      chrome.storage.local.get('themes', (data) => {
        const themes = data.themes || {};
        delete themes[selected];
        chrome.storage.local.set({ themes }, () => {
          updateThemesList(themes);
        });
      });
    });
  });
  // Set selected theme as default
  // Export themes to JSON file
  exportBtn.addEventListener('click', () => {
    chrome.storage.local.get('themes', (data) => {
      const themes = data.themes || {};
      if (Object.keys(themes).length === 0) {
        showModal("No themes to export!", () => {});
        return;
      }
      const blob = new Blob([JSON.stringify(themes, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bitcointalk-themes.json';
      a.click();
      URL.revokeObjectURL(url);
    });
  });
  // Import themes from JSON file
  importBtn.addEventListener('click', () => {
    importFile.click();
  });
  importFile.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedThemes = JSON.parse(e.target.result);
        if (typeof importedThemes !== 'object' || importedThemes === null || Array.isArray(importedThemes)) {
          throw new Error('Invalid format');
        }
        chrome.storage.local.get('themes', (data) => {
          const themes = data.themes || {};
          const merged = { ...themes, ...importedThemes };
          chrome.storage.local.set({ themes: merged }, () => {
            showModal('Themes imported successfully!', () => {});
            updateThemesList(merged);
          });
        });
      } catch (err) {
        showModal('Invalid file format!', () => {});
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  });

  // Edit selected theme: load its name and CSS into the editor for modification
  if (editBtn) {
    editBtn.addEventListener('click', () => {
      const selected = themesList.value;
      if (!selected) {
        showModal('Please select a theme to edit.', () => {});
        return;
      }
      chrome.storage.local.get('themes', (data) => {
        const themes = data.themes || {};
        const cssCode = themes[selected] || '';
        // populate editor and name input
        textarea.value = cssCode;
        themeNameInput.value = selected;
        // mark current selection so updateThemesList can preserve selection
        try { themesList.setAttribute('data-current', selected); } catch (e) { }
        // focus editor for convenience
        try { textarea.focus(); } catch (e) { }
      });
    });
  }
  
  
  // Update themes list dropdown
  function updateThemesList(themes) {
    themesList.innerHTML = '';
    for (let name in themes) {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      themesList.appendChild(option);
    }
    if (themesList.options.length > 0) {
      // keep previously selected if possible
      try {
        const cur = themesList.getAttribute('data-current');
        if (cur) {
          for (let i = 0; i < themesList.options.length; i++) {
            if (themesList.options[i].value === cur) { themesList.selectedIndex = i; return; }
          }
        }
      } catch (e) { }
      themesList.selectedIndex = 0;
    }
  }
  // Clean themes Textarea
  cleanBtn.addEventListener('click', () => {
    // Clear editor without confirmation or message
    textarea.value = '';
  });
});

// Custom modal function
function showModal(message, callback) {
  const modal = document.getElementById('customModal');
  const msg = document.getElementById('modalMessage');
  const okBtn = document.getElementById('modalOk');
  const cancelBtn = document.getElementById('modalCancel');

  msg.textContent = message;
  modal.style.display = 'block';

  okBtn.onclick = () => {
    modal.style.display = 'none';
    if (callback) callback(true);
  };
  cancelBtn.onclick = () => {
    modal.style.display = 'none';
    if (callback) callback(false);
  };

  // If no callback is provided, treat it as an alert (only OK button matters)
  if (!callback) {
    cancelBtn.style.display = 'none';
    okBtn.onclick = () => {
      modal.style.display = 'none';
    };
  } else {
    cancelBtn.style.display = 'inline-block';
  }
}