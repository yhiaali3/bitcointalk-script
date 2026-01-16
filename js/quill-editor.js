/* global Quill */
(function () {
  'use strict';
  function createEditorUI(originalTextarea) {
    if (!originalTextarea) return null;
    // Always remove any previous wrapper to ensure fresh state
    const oldWrapper = document.getElementById('quill-wrapper');
    if (oldWrapper && oldWrapper.parentNode) oldWrapper.parentNode.removeChild(oldWrapper);
    const wrapper = document.createElement('div');
    wrapper.id = 'quill-wrapper';
    wrapper.style.maxWidth = '90%';
    wrapper.innerHTML = `
<style>
/* tighter grouping and very small gaps so groups appear nearly touching */
#advanced-toolbar { display:flex; flex-wrap:wrap; gap:2px; align-items:center; }
/* general block styling (compact) */
#advanced-toolbar .ql-formats { padding:5px 6px; margin-right:2px; border-right:1px solid #d0d0d0; display:flex; gap:4px; align-items:center; background:linear-gradient(#ffffff,#fafafa); box-shadow: inset 0 1px 0 rgba(255,255,255,0.6); border-radius:4px; }
/* special font block with a bolder separator */
#advanced-toolbar .ql-formats.font-block { border-right:3px solid #9b9b9b; padding-right:12px; }
#advanced-toolbar .ql-formats:last-child { border-right:0; margin-right:0; padding-right:0; background:transparent; box-shadow:none; }
#advanced-toolbar .ql-font { min-width:180px; font-size:13px; }
#advanced-toolbar .ql-size { width:56px; }
/* make selects match toolbar button height */
#advanced-toolbar select { height:34px; padding:0 6px; border:0; background:transparent; font-size:13px; }
#advanced-toolbar .custom-tool-button { cursor:pointer; padding:4px 6px; border:0; background:transparent; }
/* icon sizing and per-icon thin separator */
#advanced-toolbar .ql-formats button { width:28px; height:32px; display:inline-flex; align-items:center; justify-content:center; padding:0 4px; }
#advanced-toolbar .ql-formats button svg { width:20px; height:20px; fill:currentColor; }
/* thin vertical line between each icon for clarity (smaller gaps) */
#advanced-toolbar .ql-formats button:not(:last-child) { border-right:1px solid rgba(0,0,0,0.06); margin-right:4px; padding-right:6px; }
/* make wrapper positionable and add resize handle */
#quill-wrapper{ position:relative; display:block; box-sizing:border-box; overflow:visible; }
/* resizer: invisible hit area with classic three-line visual anchored exactly at corner */
/* small corner accent (20x20) with 4px thick bars on right and bottom */
#quill-resizer{ position:absolute; width:20px; height:20px; right:0; bottom:0; top:auto; cursor:se-resize; z-index:9999; display:block; background:transparent; border:0; padding:0; box-sizing:border-box; }
#quill-resizer:hover{ transform:scale(1.02); }
/* two short bars that form a thick corner aligned exactly to editor's bottom-right */
#quill-resizer:before,
#quill-resizer:after {
  content: '';
  position: absolute;
  right: 0;
  bottom: 14px;
  background: #1781faff;
  display: block;
  pointer-events: none;
}
#quill-resizer:before { width: 4px; height: 20px; }
#quill-resizer:after { width: 20px; height: 4px; }
/* ensure editor content wraps long lines */
#bitcointalk-advanced-editor .ql-editor{ white-space:pre-wrap !important; word-wrap:break-word !important; overflow-wrap:break-word !important; white-space: pre-wrap !important; word-break: break-word !important; overflow-wrap: break-word !important; hyphens: auto !important; }
/* toolbar and emoji wrapping: keep emojis inside the toolbar and allow them to wrap into multiple rows */
#advanced-toolbar{ display:flex; flex-wrap:wrap; gap:6px; align-items:center; overflow:visible; box-sizing:border-box; }
#advanced-toolbar .ql-formats{ flex:0 0 auto; }
/* ensure dropdowns and pickers can escape the toolbar and appear above the editor */
#advanced-toolbar select,
#advanced-toolbar .ql-picker,
#advanced-toolbar .ql-picker-label,
#advanced-toolbar .ql-picker-options {
  
  z-index: 10002;
}
#quill-emoji-toolbar{ display:flex; flex-wrap:wrap; gap:6px; max-width:100%; box-sizing:border-box; align-items:center; }
#quill-emoji-toolbar .custom-tool-button{ flex:0 0 auto; }
/* Custom image button styling (user-provided) - also target #advanced-toolbar */
.ql-snow .ql-toolbar button.ql-image,
#advanced-toolbar button.ql-image {
  background: url("https://www.talkimg.com/images/2023/05/09/logo418d0697bfbdeac7.png") no-repeat center !important;
  background-size: contain !important;
  width: 32px !important;
  height: 32px !important;
  border: none !important;
  margin: 1px 2px 1px 1px !important;
  cursor: pointer;
}

.ql-snow .ql-toolbar button.ql-image:hover,
#advanced-toolbar button.ql-image:hover {
  filter: brightness(1.2);
}

/* Hide any inline SVG inside the image button so background image is visible */
#advanced-toolbar button.ql-image svg,
.ql-snow .ql-toolbar button.ql-image svg { display: none !important; }

</style>
<div id="advanced-toolbar">
<span class="ql-formats font-block">
<select class="ql-font"></select>
<select class="ql-size"></select>
<select class="ql-color"></select>
</span>
<span class="ql-formats">
<button class="ql-bold"></button>
<button class="ql-italic"></button>
<button class="ql-underline"></button>
<button class="ql-strike"></button>
</span>
<span class="ql-formats">
<button class="ql-list" value="ordered"></button>
<button class="ql-list" value="bullet"></button>
<button class="ql-indent" value="-1"></button>
<button class="ql-indent" value="+1"></button>
</span>
<span class="ql-formats" style="display:flex;gap:6px;align-items:center;">
<button class="ql-direction" value="rtl" title="Direction"></button>
<button class="ql-align" value="left" title="Align left"></button>
<button class="ql-align" value="center" title="Align center"></button>
<button class="ql-align" value="right" title="Align right"></button>
<button class="ql-align" value="justify" title="Justify"></button>
</span>
<span class="ql-formats">
<button class="ql-link"></button>
<button class="ql-image"></button>
<button class="ql-blockquote"></button>
<button class="ql-code-block"></button>
</span>
<span class="ql-formats" id="quill-tools">
<button type="button" id="btn-hr" title="Insert Horizontal Line" class="custom-tool-button">➖</button>
<button type="button" id="btn-date" title="Insert Current Date" class="custom-tool-button">📅</button>
<button type="button" id="btn-table" title="Insert Table" class="custom-tool-button"><svg viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="16" height="16" rx="1" ry="1" stroke="currentColor" fill="none" stroke-width="1"></rect><rect x="3" y="3" width="4" height="4" fill="currentColor"></rect><rect x="8" y="3" width="4" height="4" fill="currentColor"></rect><rect x="3" y="8" width="4" height="4" fill="currentColor"></rect><rect x="8" y="8" width="4" height="4" fill="currentColor"></rect></svg></button>
</span>
<span class="ql-formats" id="quill-emoji-toolbar">
<!-- The emoji buttons will be injected here-->
</span>
</div>
<div id="bitcointalk-advanced-editor" style="height:420px;width:100%;background:#fff;"></div>
<div id="quill-resizer" title="Resize editor" aria-hidden="true"></div>
<button id="btn-preview-float" title="معاينة" style="position:absolute;right:10px;bottom:44px;z-index:10001;padding:8px 10px;border-radius:6px;background:#1781ff;color:#fff;border:0;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.2);">معاينة</button>
<div class="editor-status-bar">
<span id="quill-word-count">Words: 0</span>
<span id="quill-sync-msg">Synced with Bitcointalk Form</span>
</div>
`;
    // All emojis were injected as buttons
    const EMOJI_LIST = [
      { char: '😈', name: 'Smiling Devil' },
      { char: '😊', name: 'Smile' },
      { char: '😳', name: 'Flushed' },
      { char: '😇', name: 'Innocent' },
      { char: '😂', name: 'Joy' },
      { char: '😢', name: 'Sad' },
      { char: '😠', name: 'Angry' },
      { char: '😍', name: 'Heart Eyes' },
      { char: '😲', name: 'Astonished' },
      { char: '🤔', name: 'Thinking' },
      { char: '😭', name: 'Crying' },
      { char: '👍', name: 'Thumbs Up' },
      { char: '👎', name: 'Thumbs Down' },
      { char: '😉', name: 'Wink' },
      { char: '😆', name: 'Laughing' },
      { char: '🙄', name: 'Roll Eyes' },
      { char: '😴', name: 'Sleeping' },
      { char: '🎉', name: 'Party' },
      { char: '😎', name: 'Cool' },
      { char: '🙂', name: 'Slight Smile' }
    ];
    const emojiToolbar = wrapper.querySelector('#quill-emoji-toolbar');
    if (emojiToolbar) {
      EMOJI_LIST.forEach(emoji => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'custom-tool-button';
        btn.title = emoji.name;
        btn.setAttribute('aria-label', emoji.name);
        btn.textContent = emoji.char;
        btn.style.fontSize = '18px';
        btn.style.padding = '2px 6px';
        btn.onclick = function () {
          const quill = window.__bt_quill_instance;
          if (!quill) return;
          const range = quill.getSelection() || { index: quill.getLength() };
          quill.insertText(range.index, emoji.char);
        };
        emojiToolbar.appendChild(btn);
      });
    }
    // table button moved into toolbar HTML; no dynamic append needed here
    // Populate font and size selects with desired options
    try {
      var fontSelect = wrapper.querySelector('.ql-font');
      var sizeSelect = wrapper.querySelector('.ql-size');
      if (fontSelect) {
        // Fonts chosen for wide compatibility (Windows / Linux)
        var fonts = [
          { val: 'Arial, Helvetica, sans-serif', label: 'Arial' },
          { val: 'Helvetica, Arial, sans-serif', label: 'Helvetica' },
          { val: 'Times New Roman, Times, serif', label: 'Times New Roman' },
          { val: 'Georgia, serif', label: 'Georgia' },
          { val: 'Verdana, Geneva, sans-serif', label: 'Verdana' },
          { val: 'Tahoma, Geneva, sans-serif', label: 'Tahoma' },
          { val: 'Courier New, Courier, monospace', label: 'Courier New' },
          { val: 'DejaVu Sans, sans-serif', label: 'DejaVu Sans' },
          { val: 'Liberation Sans, sans-serif', label: 'Liberation Sans' },
          { val: 'Noto Sans Arabic, sans-serif', label: 'Noto Sans Arabic' }
        ];
        fonts.forEach(function (f) {
          var opt = document.createElement('option');
          opt.value = f.val;
          opt.textContent = f.label;
          fontSelect.appendChild(opt);
        });
      }
      if (sizeSelect) {
        for (var s = 10; s <= 36; s += 2) {
          var o = document.createElement('option');
          o.value = s + 'px';
          o.textContent = String(s);
          sizeSelect.appendChild(o);
        }
      }
    } catch (e) { }
    // Upload image button with the same extension script
    // Activate the image upload button from the Quill toolbar itself
    // There's only one button to upload the image, and when uploading the image, only the link is inserted
    // Activate the image upload button only from the original Quill toolbar
    setTimeout(() => {
      const quillImageButton = document.querySelector('.ql-image');
      if (quillImageButton) {
        // Remove all default event listeners (if any)
        const newBtn = quillImageButton.cloneNode(true);
        quillImageButton.parentNode.replaceChild(newBtn, quillImageButton);
        newBtn.addEventListener('mousedown', function (e) { e.preventDefault(); e.stopPropagation(); });
        newBtn.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();

          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';

          input.onchange = async function (ev) {
            const file = ev.target.files[0];
            if (!file || !file.size) return;

            newBtn.disabled = true;

            const uploadUrl = 'https://proxy.ninjastic.space/?url=https://talkimg.com/api/1/upload';
            const apiKey = 'chv_UuLJ_cf38bcec45d9f7f5e38a65bb4a034e2b36bf8254618d85adcc9e52434e45a2457e709d8a601acbe958b8a1908b7d8c40cfc524fd1d6859a0415a87a71cfa802e'; // يمكنك تعيين مفتاح إذا طُلب مستقبلاً

            const formData = new FormData();
            formData.append('type', 'file');
            formData.append('format', 'json');
            formData.append('source', file);

            try {
              const response = await fetch(uploadUrl, {
                method: 'POST',
                headers: { 'X-API-Key': apiKey },
                mode: 'cors',
                body: formData
              });

              const result = await response.json();

              if (response.ok && result.status_code === 200 && result.image && result.image.url) {
                const quill = window.__bt_quill_instance;
                if (!quill) return;

                const range = quill.getSelection() || { index: quill.getLength() };
                const bb = `[img]${result.image.url}[/img]`;
                quill.insertText(range.index, bb);
              } else {
                alert('Image upload failed: ' + (result.error?.message || 'Unknown error'));
              }
            } catch (err) {
              console.error('Upload error:', err);
              alert('Image upload failed. Check console for details.');
            } finally {
              newBtn.disabled = false;
              input.value = '';
            }
          };

          input.click();
        });
      }
    }, 100);
    originalTextarea.style.display = 'none';
    originalTextarea.parentNode.insertBefore(wrapper, originalTextarea);
    // Attach resize behavior to the resizer handle
    (function () {
      try {
        var res = wrapper.querySelector('#quill-resizer');
        var editorEl = wrapper.querySelector('#bitcointalk-advanced-editor');
        if (!res || !editorEl) return;
        var startX = 0, startY = 0, startW = 0, startH = 0, dragging = false;
        function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
        res.addEventListener('mousedown', function (ev) {
          ev.preventDefault(); ev.stopPropagation();
          dragging = true;
          startX = ev.clientX; startY = ev.clientY;
          var rect = wrapper.getBoundingClientRect();
          startW = rect.width; startH = editorEl.offsetHeight;
          document.addEventListener('mousemove', doMove);
          document.addEventListener('mouseup', stopMove);
        });
        function doMove(e) {
          if (!dragging) return;
          var dx = e.clientX - startX;
          var dy = e.clientY - startY;
          var newW = Math.round(startW + dx);
          var newH = Math.round(startH + dy);
          // minimum sensible dimensions
          var MIN_W = 300, MIN_H = 120;
          // ADD: relative scale limits (configure here)
          var MIN_SCALE = 0.5; // minimum scale (50% of start size)
          var MAX_SCALE = 2.0; // maximum scale (200% of start size)
          // maximum based on viewport and wrapper position to keep within page
          var left = wrapper.getBoundingClientRect().left;
          var top = wrapper.getBoundingClientRect().top;
          var viewportMaxW = Math.max(MIN_W, window.innerWidth - left - 20);
          var viewportMaxH = Math.max(MIN_H, window.innerHeight - top - 20);
          // scale-based min/max relative to the start size captured at mousedown
          var scaledMinW = Math.round(startW * MIN_SCALE);
          var scaledMaxW = Math.round(startW * MAX_SCALE);
          var scaledMinH = Math.round(startH * MIN_SCALE);
          var scaledMaxH = Math.round(startH * MAX_SCALE);
          // final allowed ranges combine sensible pixel mins and viewport & scale limits
          var finalMinW = Math.max(MIN_W, scaledMinW);
          var finalMinH = Math.max(MIN_H, scaledMinH);
          var finalMaxW = Math.min(viewportMaxW, scaledMaxW);
          var finalMaxH = Math.min(viewportMaxH, scaledMaxH);
          newW = clamp(newW, finalMinW, finalMaxW);
          newH = clamp(newH, finalMinH, finalMaxH);
          wrapper.style.width = newW + 'px';
          editorEl.style.height = newH + 'px';
        }
        function stopMove() {
          dragging = false;
          document.removeEventListener('mousemove', doMove);
          document.removeEventListener('mouseup', stopMove);
        }
        // Ensure editor stays within bounds when window resizes
        window.addEventListener('resize', function () {
          try {
            var rect = wrapper.getBoundingClientRect();
            var edH = editorEl.offsetHeight;
            var left = rect.left, top = rect.top;
            var maxW = Math.max(300, window.innerWidth - left - 20);
            var maxH = Math.max(120, window.innerHeight - top - 20);
            if (rect.width > maxW) wrapper.style.width = maxW + 'px';
            if (edH > maxH) editorEl.style.height = maxH + 'px';
          } catch (e) { }
        });
      } catch (e) { }
      // --- Font size sync & defaults ---
      try {
        // DOM select for size (populated earlier)
        var sizeSelectEl = document.querySelector('.ql-size');
        function normalizeSizeVal(v) { if (!v) return ''; return ('' + v).trim(); }
        function updateSizeUI() {
          try {
            if (!sizeSelectEl) sizeSelectEl = document.querySelector('.ql-size');
            var sel = quill.getSelection();
            var uniformSize = '';
            try {
              if (sel && sel.length > 0) {
                var sizes = {};
                var start = sel.index;
                var end = sel.index + sel.length;
                for (var i = start; i < end; i++) {
                  try {
                    var f = quill.getFormat(i, 1) || {};
                    var s = f.size ? ('' + f.size) : '';
                    sizes[s] = true;
                    if (Object.keys(sizes).length > 1) break;
                  } catch (e) { }
                }
                if (Object.keys(sizes).length === 1) uniformSize = Object.keys(sizes)[0] || '';
                else uniformSize = '';
              } else {
                var f0 = quill.getFormat() || {};
                uniformSize = f0.size ? ('' + f0.size) : '';
              }
            } catch (e) { uniformSize = ''; }

            if (sizeSelectEl) {
              try {
                // clear selection first
                sizeSelectEl.value = '';
                if (uniformSize) {
                  // try exact match or numeric match
                  var rawNum = ('' + uniformSize).match(/(\d+)/);
                  rawNum = rawNum ? rawNum[1] : null;
                  var found = false;
                  for (var j = 0; j < sizeSelectEl.options.length; j++) {
                    var opt2 = sizeSelectEl.options[j];
                    var v2 = (opt2.value || '').toString();
                    var t2 = (opt2.textContent || opt2.innerText || '').toString();
                    if (v2 === uniformSize || v2 === (uniformSize + '') || (rawNum && v2.indexOf(rawNum) !== -1) || (rawNum && t2.indexOf(rawNum) !== -1)) {
                      sizeSelectEl.selectedIndex = j; found = true; break;
                    }
                  }
                  if (!found) sizeSelectEl.value = '';
                } else {
                  sizeSelectEl.value = '';
                }
              } catch (e) { }
            }
          } catch (e) { }
        }
        // ensure default typing size is 10px when caret is collapsed without size
        function ensureDefaultSizeOnCursor(range) {
          // Default size enforcement disabled intentionally.
          return;
        }
        // update on selection and text-change
        try { quill.on('selection-change', function (range) { try { updateSizeUI(); } catch (e) { } }); } catch (e) { }
        try { quill.on('text-change', function () { try { updateSizeUI(); } catch (e) { } }); } catch (e) { }
        // enforce default 10px on paste: transform incoming delta to have size 10px
        // paste-size enforcement removed: paste handling moved to initQuillEditor to force plain-text paste
        // initial defaults
        try { updateSizeUI(); } catch (e) { }
      } catch (e) { }
    })();
    return wrapper;
  }
  function initQuillEditor() {
    try {
      // ✅ FIX: Always destroy any previous instance — do NOT rely on __bt_quill_initialized alone
      if (typeof window.destroyQuillEditor === 'function') {
        window.destroyQuillEditor();
      }
      // Remove the flag so it can be set again after re-init
      delete window.__bt_quill_initialized;

      if (typeof Quill === 'undefined') {
        console.warn('quill-editor: Quill not available');
        return;
      }
      const originalTextarea = document.querySelector('textarea[name="message"]');
      if (!originalTextarea) return;
      createEditorUI(originalTextarea);
      // Hide any external emoji toolbars that the page may have, keep a small record to restore later
      try {
        var hideExternalEmojiToolbars = function () {
          try {
            var els = document.querySelectorAll('.bt-emoji-toolbar');
            els.forEach(function (el, idx) {
              try {
                var prev = el.style && el.style.display ? el.style.display : window.getComputedStyle(el).display || '';
                el.setAttribute('data-bt-prev-display', prev);
                el.setAttribute('data-bt-hidden-by-quill', '1');
                el.style.display = 'none';
              } catch (e) { }
            });
          } catch (e) { }
        };
        // expose on window just in case other scripts need to call
        try { window.__bt_hide_external_emoji_toolbars = hideExternalEmojiToolbars; } catch (e) { }
        hideExternalEmojiToolbars();
        // Also add a global class and style so any future-created toolbars are automatically hidden
        try {
          if (!document.getElementById('bt-editor-active-style')) {
            var s = document.createElement('style');
            s.id = 'bt-editor-active-style';
            s.textContent = '.bt-editor-active .bt-emoji-toolbar{display:none !important;}';
            document.head.appendChild(s);
          }
          document.documentElement.classList.add('bt-editor-active');
          try { window.__bt_quill_editor_active = true; } catch (e) { }
        } catch (e) { }
      } catch (e) { }
      // Register style attributors for font-family and numeric sizes
      try {
        var SizeStyle = Quill.import('attributors/style/size');
        var sizeList = [];
        for (var i = 10; i <= 36; i += 2) sizeList.push(i + 'px');
        SizeStyle.whitelist = sizeList;
        Quill.register(SizeStyle, true);
      } catch (e) { }
      try {
        var FontStyle = Quill.import('attributors/style/font');
        // whitelist matching the values we inserted into the select
        FontStyle.whitelist = [
          'Arial, Helvetica, sans-serif',
          'Helvetica, Arial, sans-serif',
          'Times New Roman, Times, serif',
          'Georgia, serif',
          'Verdana, Geneva, sans-serif',
          'Tahoma, Geneva, sans-serif',
          'Courier New, Courier, monospace',
          'DejaVu Sans, sans-serif',
          'Liberation Sans, sans-serif',
          'Noto Sans Arabic, sans-serif'
        ];
        Quill.register(FontStyle, true);
      } catch (e) { }
      const quill = new Quill('#bitcointalk-advanced-editor', {
        modules: { toolbar: '#advanced-toolbar' },
        theme: 'snow'
      });
      // لصق كنص عادي فقط (بدون أي تنسيق)
      try {
        if (quill.clipboard && quill.clipboard.addMatcher) {
          quill.clipboard.addMatcher(Node.ELEMENT_NODE, function (node, delta) {
            try {
              delta.ops.forEach(op => {
                if (op.attributes) delete op.attributes;
              });
            } catch (e) { }
            return delta;
          });
        }
      } catch (e) { }
      // Prevent Chrome (and other translators) from translating the editor contents
      try {
        var editorRoot = quill && quill.root ? quill.root : document.querySelector('.ql-editor');
        if (editorRoot) {
          try { editorRoot.setAttribute('translate', 'no'); } catch (e) { }
          try { editorRoot.classList.add('notranslate'); } catch (e) { }
          // set a sensible language attribute based on content: prefer Arabic if RTL characters predominate
          try {
            var sampleText = (originalTextarea && originalTextarea.value) || (quill.getText && quill.getText()) || '';
            var rtlCount = (sampleText.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g) || []).length;
            var ltrCount = (sampleText.match(/[A-Za-z]/g) || []).length;
            var langAttr = rtlCount > ltrCount ? 'ar' : 'en';
            try { editorRoot.setAttribute('lang', langAttr); } catch (e) { }
          } catch (e) { }
        }
        // Also mark the wrapper so any external translators skip the whole section
        try {
          var wrap = document.getElementById('quill-wrapper');
          if (wrap) { wrap.setAttribute('translate', 'no'); wrap.classList.add('notranslate'); }
        } catch (e) { }
      } catch (e) { }
      // Ensure common keyboard shortcuts work reliably (undo/redo and direction changes)
      try {
        quill.root.addEventListener('keydown', function (e) {
          try {
            var key = e.key || '';
            var isCtrl = e.ctrlKey || e.metaKey;
            // Ctrl+Z -> undo
            if (isCtrl && !e.shiftKey && (key === 'z' || key === 'Z')) {
              try { quill.history && quill.history.undo && quill.history.undo(); } catch (err) { }
              e.preventDefault();
              e.stopPropagation();
              return;
            }
            // Ctrl+Y or Ctrl+Shift+Z -> redo
            if ((isCtrl && (key === 'y' || key === 'Y')) || (isCtrl && e.shiftKey && (key === 'z' || key === 'Z'))) {
              try { quill.history && quill.history.redo && quill.history.redo(); } catch (err) { }
              e.preventDefault();
              e.stopPropagation();
              return;
            }
            // Ctrl+Shift+R -> set RTL and right align, move caret to line end
            if (e.ctrlKey && e.shiftKey && (key === 'r' || key === 'R')) {
              try {
                quill.format('direction', 'rtl'); quill.format('align', 'right');
                try {
                  var sel = quill.getSelection();
                  if (sel) {
                    var startIdx = sel.index - (sel && sel.length ? 0 : 0);
                    var lineInfo = quill.getLine(sel.index);
                    if (lineInfo && lineInfo[0]) {
                      var line = lineInfo[0];
                      var lineStart = sel.index - (lineInfo[1] || 0);
                      var lineLen = line.length();
                      var newIdx = lineStart + Math.max(0, lineLen - 1);
                      try { quill.setSelection(newIdx, 0); } catch (s) { try { quill.setSelection(quill.getLength(), 0); } catch (xx) { } }
                    } else {
                      try { quill.setSelection(quill.getLength(), 0); } catch (xx) { }
                    }
                    try { quill.focus(); } catch (f) { }
                  }
                } catch (e2) { }
              } catch (err) { }
              e.preventDefault(); e.stopPropagation(); return;
            }
            // Ctrl+Shift+L -> set LTR and left align, move caret to line end (visual left)
            if (e.ctrlKey && e.shiftKey && (key === 'l' || key === 'L')) {
              try {
                quill.format('direction', 'ltr'); quill.format('align', 'left');
                try {
                  var sel2 = quill.getSelection();
                  if (sel2) {
                    var lineInfo2 = quill.getLine(sel2.index);
                    if (lineInfo2 && lineInfo2[0]) {
                      var line2 = lineInfo2[0];
                      var lineStart2 = sel2.index - (lineInfo2[1] || 0);
                      var lineLen2 = line2.length();
                      var newIdx2 = lineStart2 + Math.max(0, lineLen2 - 1);
                      try { quill.setSelection(newIdx2, 0); } catch (s2) { try { quill.setSelection(quill.getLength(), 0); } catch (xx) { } }
                    } else { try { quill.setSelection(quill.getLength(), 0); } catch (xx) { } }
                    try { quill.focus(); } catch (f) { }
                  }
                } catch (e3) { }
              } catch (err) { }
              e.preventDefault(); e.stopPropagation(); return;
            }
          } catch (err) { }
        }, false);
      } catch (e) { }
      // Ensure alignment buttons show icons (some styles/themes hide them); inject SVGs as fallback
      try {
        const svgIcons = {
          left: '<svg viewBox="0 0 18 18"><rect class="ql-fill" x="0" y="2" width="12" height="2"></rect><rect class="ql-fill" x="0" y="6" width="8" height="2"></rect><rect class="ql-fill" x="0" y="10" width="12" height="2"></rect><rect class="ql-fill" x="0" y="14" width="8" height="2"></rect></svg>',
          center: '<svg viewBox="0 0 18 18"><rect class="ql-fill" x="3" y="2" width="12" height="2"></rect><rect class="ql-fill" x="5" y="6" width="8" height="2"></rect><rect class="ql-fill" x="3" y="10" width="12" height="2"></rect><rect class="ql-fill" x="5" y="14" width="8" height="2"></rect></svg>',
          right: '<svg viewBox="0 0 18 18"><rect class="ql-fill" x="6" y="2" width="12" height="2"></rect><rect class="ql-fill" x="10" y="6" width="8" height="2"></rect><rect class="ql-fill" x="6" y="10" width="12" height="2"></rect><rect class="ql-fill" x="10" y="14" width="8" height="2"></rect></svg>',
          justify: '<svg viewBox="0 0 18 18"><rect class="ql-fill" x="0" y="2" width="18" height="2"></rect><rect class="ql-fill" x="0" y="6" width="18" height="2"></rect><rect class="ql-fill" x="0" y="10" width="18" height="2"></rect><rect class="ql-fill" x="0" y="14" width="18" height="2"></rect></svg>'
        };
        ['left', 'center', 'right', 'justify'].forEach(function (v) {
          try {
            var btn = document.querySelector('.ql-align[value="' + v + '"]');
            if (btn && (!btn.innerHTML || btn.innerHTML.trim() === '')) btn.innerHTML = svgIcons[v];
          } catch (e) { }
        });
        // blockquote icon (Bitcointalk-like quote mark)
        try {
          var bq = document.querySelector('.ql-blockquote');
          if (bq) {
            bq.innerHTML = '<svg viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">'
              + '<rect x="1" y="2" width="14" height="10" rx="2" ry="2" stroke="currentColor" fill="none" stroke-width="1"></rect>'
              + '<path d="M4.5 6.2h9" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" fill="none"></path>'
              + '<path d="M4.5 8.6h9" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" fill="none"></path>'
              + '<path d="M4.5 11h6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" fill="none"></path>'
              + '<path d="M12 12.5l2 2v-4" stroke="currentColor" stroke-width="1" fill="none" stroke-linejoin="round"></path>'
              + '</svg>';
            try { bq.setAttribute('title', 'Quote'); bq.setAttribute('aria-label', 'Quote'); } catch (e) { }
          }
        } catch (e) { }
        // image icon: provide a clear SVG fallback (mountain + sun)
        try {
          var imgBtn = document.querySelector('.ql-image');
          if (imgBtn && (!imgBtn.innerHTML || imgBtn.innerHTML.trim() === '')) {
            imgBtn.innerHTML = '<svg viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">'
              + '<rect x="1" y="3" width="16" height="12" rx="1" ry="1" stroke="currentColor" fill="none" stroke-width="1"></rect>'
              + '<circle cx="5.5" cy="6.5" r="1.5" fill="currentColor"></circle>'
              + '<path d="M3 13l3-4 4 4 5-6v6z" fill="currentColor"></path>'
              + '</svg>';
            try { imgBtn.setAttribute('title', 'Insert Image'); imgBtn.setAttribute('aria-label', 'Insert Image'); } catch (e) { }
          }
        } catch (e) { }
        // ensure align buttons reliably apply their intended alignment (override any conflicting handlers)
        try {
          var alignBtns = document.querySelectorAll('.ql-align');
          alignBtns.forEach(function (btn) {
            try {
              var val = btn.getAttribute('value');
              if (!val) return;
              btn.addEventListener('click', function (e) {
                try {
                  e.preventDefault(); e.stopPropagation();
                  var sel = quill.getSelection() || { index: quill.getLength(), length: 0 };
                  // Quill uses `false` (or null) to represent the default/left alignment.
                  var applyVal = (val === 'left') ? false : val;
                  quill.format('align', applyVal);
                  try { quill.setSelection(sel.index, sel.length || 0); } catch (se) { }
                  quill.focus();
                } catch (err) { }
              });
            } catch (inner) { }
          });
        } catch (e) { }
        // ensure blockquote button wraps selection as a block and leaves a trailing paragraph
        try {
          var bqBtn = document.querySelector('.ql-blockquote');
          if (bqBtn) {
            bqBtn.addEventListener('click', function (e) {
              try {
                e.preventDefault(); e.stopPropagation();
                var sel = quill.getSelection();
                if (!sel) return;
                var start = sel.index || 0;
                var len = sel.length || 0;
                try { quill.formatLine(start, len, 'blockquote', true); } catch (f) { try { quill.format('blockquote', true); } catch (g) { } }
                // Insert two newlines after the selection end to create a free paragraph below the quote
                setTimeout(function () {
                  try {
                    var endIndex = start + len;
                    try { quill.insertText(endIndex, '\n'); } catch (ie) { /* ignore */ }
                    try { quill.setSelection(endIndex + 1, 0); quill.focus(); } catch (se) { }
                    // ensure the new paragraph is not a blockquote (clear format on that line)
                    try { quill.formatLine(endIndex + 1, 1, 'blockquote', false); } catch (ff) { try { quill.format('blockquote', false); } catch (gg) { } }
                  } catch (e) { }
                }, 30);
              } catch (err) { }
            });
          }
        } catch (e) { }
      } catch (e) { }
      // Register a simple Divider blot so we can insert a visual <hr> in the editor
      try {
        // ensure code-block button creates a trailing paragraph after the code block
        try {
          var codeBtn = document.querySelector('.ql-code-block');
          if (codeBtn) {
            codeBtn.addEventListener('click', function (e) {
              e.preventDefault();
              e.stopPropagation();
              try {
                var range = quill.getSelection() || { index: quill.getLength() };
                var insertText = '\n[code]\ninsert code here....\n[/code]\n';
                quill.insertText(range.index, insertText, 'user');
                var caret = range.index + insertText.length;
                try { quill.setSelection(caret, 0); } catch (s) { }
                // Ensure the line after the inserted block is not treated as a code-block
                try { quill.formatLine(caret, 1, 'code-block', false); } catch (ff) { }
                try { quill.focus(); } catch (f) { }
              } catch (err) { }
            });
          }
        } catch (e) { }
        var BlockEmbed = Quill.import('blots/block/embed');
        class Divider extends BlockEmbed { }
        Divider.blotName = 'divider';
        Divider.tagName = 'hr';
        // Register only if not already registered to avoid Quill warning about overwriting
        try {
          var alreadyRegistered = false;
          var _origConsoleError = console && console.error ? console.error : null;
          try {
            if (console && console.error) console.error = function () { };
            try {
              Quill.import('formats/divider');
              alreadyRegistered = true;
            } catch (err) {
              alreadyRegistered = false;
            }
          } finally {
            if (_origConsoleError) console.error = _origConsoleError;
          }
          if (!alreadyRegistered) {
            Quill.register(Divider);
          }
        } catch (e) {
          // best-effort: try to register, but swallow errors to avoid breaking init
          try { Quill.register(Divider); } catch (err) { }
        }
      } catch (e) { /* ignore if Quill not available or import fails */ }
      // keep reference for external control (destroy)
      try { window.__bt_quill_instance = quill; } catch (e) { }
      try { quill.format('direction', 'ltr'); quill.format('align', 'left'); } catch (e) { }
      const btnHr = document.getElementById('btn-hr');
      if (btnHr) {
        btnHr.addEventListener('click', () => {
          const range = quill.getSelection() || { index: quill.getLength() };
          try {
            quill.insertEmbed(range.index, 'divider', true);
            quill.insertText(range.index + 1, '\n', 'user');   // line after hr
            quill.setSelection(range.index + 2, 0);            // The indicator is below the line
          } catch (e) {
            // If registration fails for any reason
            quill.insertText(range.index, '\n[hr]\n', 'user');
          }
        });
      }
      // table button handler with robust fallback insertion
      (function () {
        const btnTableEl = document.getElementById('btn-table');
        function insertHtmlAtIndex(html, index) {
          try {
            var info = quill.getLeaf(index);
            var leaf = info && info[0];
            var node = leaf && leaf.domNode;
            var parent = node && node.parentNode;
            var container = document.createElement('div');
            container.innerHTML = html;
            if (parent && node) {
              // insert after the node's block
              var ref = node.nextSibling;
              while (container.firstChild) parent.insertBefore(container.firstChild, ref);
              return true;
            }
          } catch (e) { }
          try { quill.root.insertAdjacentHTML('beforeend', html); return true; } catch (e) { return false; }
        }
        if (btnTableEl) btnTableEl.addEventListener('click', function () {
          try {
            var rows = parseInt(prompt('Number of rows', '2'), 10) || 0;
            var cols = parseInt(prompt('Number of columns', '2'), 10) || 0;
            if (rows <= 0 || cols <= 0) return;
            var html = '<table style="border:1px solid #ccc;border-collapse:collapse;width:100%"><tbody>';
            for (var r = 0; r < rows; r++) {
              html += '<tr>';
              for (var c = 0; c < cols; c++) html += '<td style="border:1px solid #ccc;padding:6px;vertical-align:top">&nbsp;</td>';
              html += '</tr>';
            }
            html += '</tbody></table>';
            var range = quill.getSelection() || { index: quill.getLength() };
            quill.focus();
            var inserted = false;
            try {
              quill.clipboard.dangerouslyPasteHTML(range.index, html);
              // small timeout to allow DOM changes
              setTimeout(function () {
                var found = quill.root.querySelector('table');
                if (!found) {
                  // fallback to DOM insertion
                  inserted = insertHtmlAtIndex(html, range.index);
                }
                // move caret after table
                try {
                  var len = quill.getLength();
                  quill.setSelection(len, 0);
                  quill.focus();
                } catch (e) { }
              }, 40);
            } catch (e) {
              insertHtmlAtIndex(html, range.index);
              try { quill.setSelection(quill.getLength(), 0); quill.focus(); } catch (err) { }
            }
          } catch (e) { }
        });
      })();
      const btnDate = document.getElementById('btn-date');
      if (btnDate) btnDate.addEventListener('click', () => {
        const date = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
        const range = quill.getSelection() || { index: quill.getLength() };
        quill.insertText(range.index, date);
      });
      const btnCopy = document.getElementById('btn-copy');
      if (btnCopy) btnCopy.addEventListener('click', () => {
        const text = quill.getText();
        try { navigator.clipboard.writeText(text); } catch (e) { }
      });
      // Floating preview toggle: replace editor content with final BBCode so
      // forum preview/publish will send the exact same text.
      try {
        const btnPreviewFloat = document.getElementById('btn-preview-float');
        if (btnPreviewFloat) {
          var _savedDelta = null;
          var _isPreviewMode = false;
          var _previewHandler = null;
          function enterPreviewMode() {
            try {
              var bb = '';
              try { bb = transformQuillToBBCode(quill); } catch (e) { try { bb = quillToBBCode(quill); } catch (ee) { bb = quill.getText(); } }
              try { _savedDelta = quill.getContents(); } catch (e) { _savedDelta = null; }
              try { if (originalTextarea) originalTextarea.value = normalizeBlankLines(bb); } catch (e) { }
              // create a floating preview panel if not present; keep Quill active so user can edit
              try {
                var wrapperEl = document.getElementById('quill-wrapper') || wrapper;
                var panel = document.getElementById('bt-preview-panel');
                if (!panel) {
                  panel = document.createElement('div');
                  panel.id = 'bt-preview-panel';
                  panel.style.position = 'absolute';
                  panel.style.right = '10px';
                  panel.style.bottom = '80px';
                  panel.style.width = '380px';
                  panel.style.maxHeight = '60%';
                  panel.style.overflow = 'auto';
                  // disable native resize so we can provide left-edge grip
                  panel.style.resize = 'none';
                  panel.style.background = '#fff';
                  panel.style.border = '1px solid #ddd';
                  panel.style.padding = '8px';
                  panel.style.boxShadow = '0 6px 18px rgba(0,0,0,0.2)';
                  panel.style.zIndex = 10002;
                  panel.style.fontFamily = 'monospace';
                  panel.style.fontSize = '13px';
                  panel.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;"><strong>نص المعاينة (BBCode)</strong><button id="bt-preview-close" type="button" data-bt-ignore-flush style="margin-left:8px;">إغلاق</button></div><pre id="bt-preview-content" style="white-space:pre-wrap;word-wrap:break-word;">' + (bb || '') + '</pre>';
                  try { wrapperEl.appendChild(panel); } catch (e) { document.body.appendChild(panel); }
                  // add left-edge grip to resize from the left while keeping right anchored
                  try {
                    var grip = document.createElement('div');
                    grip.id = 'bt-preview-grip';
                    grip.style.position = 'absolute';
                    grip.style.left = '-8px';
                    grip.style.bottom = '-8px';
                    grip.style.top = 'auto';
                    grip.style.width = '16px';
                    grip.style.height = '16px';
                    grip.style.cursor = 'nwse-resize';
                    grip.style.zIndex = 10003;
                    panel.appendChild(grip);
                    (function () {
                      var dragging = false; var startX = 0; var startY = 0; var startW = 0; var startH = 0; var MIN_W = 200; var MIN_H = 80;
                      grip.addEventListener('mousedown', function (ev) {
                        ev.preventDefault(); ev.stopPropagation(); dragging = true; startX = ev.clientX; startY = ev.clientY; startW = panel.offsetWidth; startH = panel.offsetHeight;
                        document.addEventListener('mousemove', doMove); document.addEventListener('mouseup', stopMove);
                      });
                      function doMove(e) { if (!dragging) return; try { var dx = startX - e.clientX; var dy = e.clientY - startY; var newW = Math.max(MIN_W, Math.round(startW + dx)); var newH = Math.max(MIN_H, Math.round(startH + dy)); panel.style.width = newW + 'px'; panel.style.height = newH + 'px'; } catch (err) { } }
                      function stopMove() { dragging = false; document.removeEventListener('mousemove', doMove); document.removeEventListener('mouseup', stopMove); }
                    })();
                  } catch (e) { }
                  var closeBtn = panel.querySelector('#bt-preview-close');
                  if (closeBtn) closeBtn.addEventListener('click', function (ev) { try { ev.preventDefault(); ev.stopPropagation(); exitPreviewMode(); } catch (e) { } });
                  // attach live update handler
                  try {
                    _previewHandler = function () {
                      try {
                        var newbb = '';
                        try { newbb = transformQuillToBBCode(quill); } catch (e) { try { newbb = quillToBBCode(quill); } catch (ee) { newbb = quill.getText(); } }
                        var contentEl = panel.querySelector && panel.querySelector('#bt-preview-content');
                        if (contentEl) contentEl.textContent = newbb;
                        try { if (originalTextarea) originalTextarea.value = normalizeBlankLines(newbb); } catch (e) { }
                      } catch (e) { }
                    };
                    if (quill && quill.on) quill.on('text-change', _previewHandler);
                  } catch (e) { }
                } else {
                  var content = panel.querySelector && panel.querySelector('#bt-preview-content');
                  if (content) content.textContent = bb;
                  panel.style.display = 'block';
                  // ensure handler attached
                  try { if (!_previewHandler && quill && quill.on) { _previewHandler = function () { try { var newbb = transformQuillToBBCode(quill); var contentEl = panel.querySelector && panel.querySelector('#bt-preview-content'); if (contentEl) contentEl.textContent = newbb; try { if (originalTextarea) originalTextarea.value = normalizeBlankLines(newbb); } catch (e) { } } catch (e) { } }; quill.on('text-change', _previewHandler); } } catch (e) { }
                }
              } catch (e) { }
              try { btnPreviewFloat.textContent = 'إخفاء المعاينة'; } catch (e) { }
              _isPreviewMode = true;
            } catch (e) { }
          }
          function exitPreviewMode() {
            try {
              try {
                var panel2 = document.getElementById('bt-preview-panel');
                if (panel2) panel2.style.display = 'none';
              } catch (e) { }
              try { if (_savedDelta) quill.setContents(_savedDelta); } catch (e) { }
              try { btnPreviewFloat.textContent = 'معاينة'; } catch (e) { }
              _isPreviewMode = false;
            } catch (e) { }
          }
          btnPreviewFloat.addEventListener('click', function (ev) {
            try { ev.preventDefault(); ev.stopPropagation(); if (_isPreviewMode) exitPreviewMode(); else enterPreviewMode(); } catch (e) { }
          });
          // Ensure page-level preview/publish actions get the BBCode value
          document.addEventListener('click', function (ev) {
            try {
              try { if (!window.__bt_quill_editor_active) return; } catch (ee) { }
              // ignore clicks inside preview panel to avoid triggering global flush
              try { if (ev.target && ev.target.closest && ev.target.closest('#bt-preview-panel')) return; } catch (e) { }
              var t = ev.target;
              for (var depth = 0; depth < 6 && t; depth++, t = t.parentElement) {
                if (!t) break;
                var v = (t.value || t.getAttribute && t.getAttribute('value') || '').toString().toLowerCase();
                var txt = (t.innerText || t.textContent || '').toString().toLowerCase();
                var id = (t.id || '').toString().toLowerCase();
                var cls = (t.className || '').toString().toLowerCase();
                var kws = ['preview', 'معاينة', 'post', 'نشر', 'submit', 'publish', 'save', 'send', 'ارسال'];
                var matched = false;
                for (var i = 0; i < kws.length; i++) { if (v.indexOf(kws[i]) !== -1 || txt.indexOf(kws[i]) !== -1 || id.indexOf(kws[i]) !== -1 || cls.indexOf(kws[i]) !== -1) { matched = true; break; } }
                if (matched) {
                  try { var bb2 = transformQuillToBBCode(quill); if (originalTextarea) originalTextarea.value = normalizeBlankLines(bb2); } catch (e) { try { if (originalTextarea) originalTextarea.value = quill.getText(); } catch (ee) { } }
                  break;
                }
              }
            } catch (e) { }
          }, true);
        }
      } catch (e) { }
      // sync back to original textarea as HTML
      // Normalize blank lines to avoid accumulating extra empty paragraphs
      function normalizeBlankLines(s) {
        if (typeof s !== 'string') return s;

        // توحيد أنواع الأسطر الجديدة
        let out = s.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

        // تقليص أي 3+ أسطر فارغة إلى سطرين فقط
        out = out.replace(/\n{3,}/g, '\n\n');

        // إزالة الفراغات بين وسوم BBCode المتجاورة
        out = out.replace(/\]\s*\n+\s*(?=\[)/g, ']\n');

        // حذف الأسطر الفارغة في البداية
        out = out.replace(/^\n+/, '');

        // حذف الأسطر الفارغة في النهاية، مع ترك سطر واحد فقط
        out = out.replace(/\n+$/, '\n');

        return out;
      }

      function transformQuillToBBCode(q) {
        var root = q.root;

        function wrap(tagOpen, tagClose, txt) {
          return tagOpen + txt + tagClose;
        }

        function attrStyle(ch, styleName) {
          try {
            return (ch.style && ch.style[styleName]) ||
              (ch.getAttribute && ch.getAttribute('style') &&
                (function (s) {
                  var m = s.match(new RegExp(styleName + '\\s*:\\s*([^;]+)', 'i'));
                  return m ? m[1].trim() : null;
                })(ch.getAttribute('style')));
          } catch (e) { return null; }
        }

        function normalizeColor(val) {
          if (!val) return val;
          val = ('' + val).trim();
          var m = val.match(/rgba?\s*\(([^)]+)\)/i);
          if (m) {
            var parts = m[1].split(',').map(function (p) { return parseInt(p, 10) || 0; });
            var r = (parts[0] || 0), g = (parts[1] || 0), b = (parts[2] || 0);
            function hex(n) { var h = n.toString(16); return h.length === 1 ? ('0' + h) : h; }
            return '#' + hex(Math.max(0, Math.min(255, r))) + hex(Math.max(0, Math.min(255, g))) + hex(Math.max(0, Math.min(255, b)));
          }
          return val.replace(/\s+/g, '');
        }

        function colorIsTooLight(val) {
          try {
            var h = normalizeColor(val);
            if (!h) return false;
            var m = h.match(/^#([0-9a-f]{3})$/i);
            if (m) h = '#' + m[1].split('').map(function (c) { return c + c; }).join('');
            var mh = h.match(/^#([0-9a-f]{6})$/i);
            if (!mh) return false;
            var int = parseInt(mh[1], 16);
            var r = (int >> 16) & 255, g = (int >> 8) & 255, b = int & 255;
            var lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
            return lum > 0.92;
          } catch (e) { return false; }
        }

        function walk(node) {
          var t = '';
          node.childNodes && Array.from(node.childNodes).forEach(function (ch) {
            if (ch.nodeType === 3) {
              t += (ch.nodeValue || '');
            } else if (ch.tagName) {
              var tag = ch.tagName.toLowerCase();

              // --- إضافة دعم <sup>, <sub>, <tt>, <marquee>, <details> ---
              if (tag === 'sup') {
                t += '[sup]' + walk(ch) + '[/sup]';
              } else if (tag === 'sub') {
                t += '[sub]' + walk(ch) + '[/sub]';
              } else if (tag === 'tt') {
                t += '[tt]' + walk(ch) + '[/tt]';
              } else if (tag === 'marquee') {
                t += '[move]' + walk(ch) + '[/move]';
              } else if (tag === 'details') {
                t += '[spoiler]' + walk(ch) + '[/spoiler]';
              }
              // --- نهاية الإضافات ---

              else if (tag === 'img') {
                var src = ch.getAttribute('src') || '';
                if (src) t += '[img]' + src + '[/img]';
              } else if (tag === 'br') {
                t += '\n';
              } else if (tag === 'hr') {
                t += '[hr]\n';
              } else if (tag === 'table') {
                var rows = ch.querySelectorAll('tr');
                var rowsOut = [];
                rows.forEach(function (tr) {
                  var cells = Array.from(tr.querySelectorAll('td,th'));
                  var cellsOut = cells.map(function (cell) { return '[td]' + (walk(cell) || '') + '[/td]'; });
                  rowsOut.push('[tr]' + cellsOut.join('') + '[/tr]');
                });
                t += '[table]' + rowsOut.join('') + '[/table]\n';
              } else if (tag === 'ol' || tag === 'ul') {
                var isOl = tag === 'ol';
                var items = Array.from(ch.querySelectorAll('li'));
                var listItems = items.map(function (li) {
                  return '[*]' + (walk(li) || '');
                }).join('\n');

                // هنا نضيف شرط إضافي: إذا كان الزر bullet → [list]، وإذا كان ordered → [list=1]
                if (ch.getAttribute('class') && ch.getAttribute('class').includes('ql-list')) {
                  var type = ch.getAttribute('value'); // يلتقط قيمة الزر
                  if (type === 'bullet') {
                    t += '[list]\n' + listItems + '\n[/list]\n';
                  } else if (type === 'ordered') {
                    t += '[list=1]\n' + listItems + '\n[/list]\n';
                  }
                } else {
                  // fallback: حسب الوسم
                  t += (isOl ? ('[list=1]\n' + listItems + '\n[/list]\n')
                             : ('[list]\n' + listItems + '\n[/list]\n'));
                }
              } else if (tag === 'li') {
                t += walk(ch);
              } else if (tag === 'pre' || tag === 'code') {
                var codeText = ch.innerText || ch.textContent || '';
                t += '[code]' + codeText + '[/code]\n';
              } else if (tag === 'blockquote') {
                try {
                  var innerQ = (ch.innerText || ch.textContent || walk(ch) || '').replace(/\u00A0/g, ' ').trim();
                  if (innerQ) t += '[quote]' + innerQ + '[/quote]\n';
                } catch (e) { }
              } else if (tag === 'a') {
                var href = ch.getAttribute('href') || '';
                var text = (walk(ch) || '');
                if (href.startsWith('mailto:')) {
                  t += '[email=' + href.replace('mailto:', '') + ']' + (text || href.replace('mailto:', '')) + '[/email]';
                } else if (href.includes('youtube.com/embed/')) {
                  var ytId = href.split('youtube.com/embed/')[1].split('?')[0].split('&')[0];
                  t += '[youtube]' + ytId + '[/youtube]';
                } else if (href) {
                  t += '[url=' + href + ']' + (text || href) + '[/url]';
                } else {
                  t += text;
                }
              } else if (tag === 'p' || tag === 'div' || tag === 'td' || tag === 'th') {
                var textOnly = (ch.textContent || '').replace(/&nbsp;|&#160;|\u00A0/g, '').replace(/[\u200B\uFEFF]/g, '').trim();
                var hasImg = ch.querySelector && ch.querySelector('img');
                if (!hasImg && !textOnly) {
                  t += '\n';
                  return;
                }

                var align = (ch.style && ch.style.textAlign) || null;
                var blockColor = normalizeColor(attrStyle(ch, 'color'));
                var blockSize = (attrStyle(ch, 'font-size') || '').toString();
                var blockFont = (attrStyle(ch, 'font-family') || '').toString();
                var content = (walk(ch) || '');

                if (blockFont) {
                  var simple = ('' + blockFont).split(',')[0].replace(/"|'/g, '').trim();
                  content = '[font=' + simple + ']' + content + '[/font]';
                }
                if (blockSize) {
                  var mblock = ('' + blockSize).match(/(\d+)/);
                  if (mblock) content = '[size=' + mblock[1] + 'pt]' + content + '[/size]';
                }
                if (blockColor && !colorIsTooLight(blockColor)) {
                  content = '[color=' + blockColor + ']' + content + '[/color]';
                }

                // --- دعم المحاذاة ---
                if (align === 'center') {
                  content = '[center]' + content + '[/center]';
                } else if (align === 'right') {
                  content = '[right]' + content + '[/right]';
                } else if (align === 'left') {
                  content = '[left]' + content + '[/left]';
                }

                t += content + '\n';
              } else if (tag === 'strong' || tag === 'b') {
                var innerText = (walk(ch) || '');
                var st_color = attrStyle(ch, 'color');
                var st_size = attrStyle(ch, 'font-size');
                var st_font = attrStyle(ch, 'font-family');
                var res = '[b]' + innerText + '[/b]';
                if (st_font) {
                  var simpleF = ('' + st_font).split(',')[0].replace(/"|'/g, '').trim();
                  res = '[font=' + simpleF + ']' + res + '[/font]';
                }
                if (st_size) {
                  var msz = ('' + st_size).match(/(\d+)/);
                  if (msz) res = '[size=' + msz[1] + 'pt]' + res + '[/size]';
                }
                if (st_color) {
                  var nc = normalizeColor(st_color);
                  if (!colorIsTooLight(nc)) res = '[color=' + nc + ']' + res + '[/color]';
                }
                t += res;
              } else if (tag === 'em' || tag === 'i') {
                t += '[i]' + (walk(ch) || '') + '[/i]';
              } else if (tag === 'u') {
                t += '[u]' + (walk(ch) || '') + '[/u]';
              } else if (tag === 's' || tag === 'strike' || tag === 'del') {
                t += '[s]' + (walk(ch) || '') + '[/s]';
              } else if (tag === 'span') {
                var txt = (walk(ch) || '');
                var color = attrStyle(ch, 'color');
                var fsize = attrStyle(ch, 'font-size');
                var font = attrStyle(ch, 'font-family');
                if (font) {
                  var simple = ('' + font).split(',')[0].replace(/"|'/g, '').trim();
                  txt = '[font=' + simple + ']' + txt + '[/font]';
                }
                if (fsize) {
                  var m = ('' + fsize).match(/(\d+)/);
                  if (m) txt = '[size=' + m[1] + 'pt]' + txt + '[/size]';
                }
                if (color) {
                  var nc = normalizeColor(color);
                  if (!colorIsTooLight(nc)) txt = '[color=' + nc + ']' + txt + '[/color]';
                }
                t += txt;
              } else {
                t += walk(ch);
              }
            }
          });
          return t;
        }

        var out = walk(root);
        out = out.replace(/^[ \t]+|[ \t]+$/g, '');
        out = out.replace(/\n{3,}/g, '\n\n'); // تقليل الفراغات الزائدة

        return out;
      }
      // Debounced local sync: compute BBCode and word count, but avoid writing
      // to the real textarea on every change to prevent external scripts from
      // reading transient states and re-loading them back into the editor.
      (function () {
        var _syncTimer = null;
        var latestBB = '';
        function computeAndStore() {
          try {
            latestBB = transformQuillToBBCode(quill);
            const textContent = quill.getText();
            const trimmed = (textContent || '').trim();
            const words = trimmed.length > 0 ? trimmed.split(/\s+/).length : 0;
            const wc = document.getElementById('quill-word-count');
            if (wc) wc.innerText = `Words: ${words} | Chars: ${trimmed.length}`;
          } catch (e) { }
        }
        quill.on('text-change', function () {
          try {
            if (_syncTimer) clearTimeout(_syncTimer);
            _syncTimer = setTimeout(function () { computeAndStore(); }, 60);
          } catch (e) { }
        });

        // Expose a flush method that writes the latest computed BBCode back
        // to the original textarea (called on form submit or before page actions).
        function flushSync() {
          try {
            // ensure latest is computed synchronously before flushing
            if (_syncTimer) { clearTimeout(_syncTimer); computeAndStore(); }
            if (typeof latestBB === 'string') {
              try { originalTextarea.value = normalizeBlankLines(latestBB); } catch (e) { originalTextarea.value = latestBB; }
            }
          } catch (e) { }
        }
        // Attach flush to parent form submit so preview/publish will see up-to-date value
        try {
          var parentForm = originalTextarea && originalTextarea.closest ? originalTextarea.closest('form') : null;
          if (parentForm) {
            parentForm.addEventListener('submit', function (ev) { try { flushSync(); } catch (e) { } });
            // also attach to any submit buttons to flush before click-driven submits
            var submits = parentForm.querySelectorAll('input[type=submit], button[type=submit]');
            submits.forEach(function (btn) { btn.addEventListener('click', function () { try { flushSync(); } catch (e) { } }); });
          }
          // Also listen globally (capture phase) for preview/publish buttons that may live
          // outside the form or trigger AJAX preview. Flush before their handlers run.
          var possibleKeywords = ['preview', 'معاينة', 'post', 'نشر', 'submit', 'publish', 'save', 'send', 'ارسال'];
          function shouldFlushForElement(el) {
            try {
              if (!el) return false;
              var tag = (el.tagName || '').toLowerCase();
              if (tag === 'input' || tag === 'button') {
                var v = (el.value || el.getAttribute('value') || '').toString().toLowerCase();
                if (v) {
                  for (var k = 0; k < possibleKeywords.length; k++) if (v.indexOf(possibleKeywords[k]) !== -1) return true;
                }
              }
              var txt = (el.innerText || el.textContent || '').toString().toLowerCase();
              if (txt) {
                for (var i = 0; i < possibleKeywords.length; i++) if (txt.indexOf(possibleKeywords[i]) !== -1) return true;
              }
              var id = (el.id || '').toLowerCase(); if (id) { for (var j = 0; j < possibleKeywords.length; j++) if (id.indexOf(possibleKeywords[j]) !== -1) return true; }
              var cls = (el.className || '').toString().toLowerCase(); if (cls) { for (var m = 0; m < possibleKeywords.length; m++) if (cls.indexOf(possibleKeywords[m]) !== -1) return true; }
            } catch (e) { }
            return false;
          }
          function globalFlushHandler(ev) {
            try {
              // if editor not active, skip flushing to avoid overwriting user edits
              try { if (!window.__bt_quill_editor_active) return; } catch (ee) { }
              var t = ev.target;
              // ascend a few levels to find meaningful button-like ancestor
              for (var depth = 0; depth < 6 && t; depth++, t = t.parentElement) {
                if (!t) break;
                // if this ancestor is the parent form, flush
                try { if (parentForm && parentForm.contains(t)) { flushSync(); return; } } catch (e) { }
                if (shouldFlushForElement(t)) { flushSync(); return; }
              }
            } catch (e) { }
          }
          try { document.addEventListener('click', globalFlushHandler, true); document.addEventListener('mousedown', globalFlushHandler, true); } catch (e) { }
        } catch (e) { }

        // Expose flush for external calls (debugging/tests)
        try { window.__bt_quill_flush = flushSync; } catch (e) { }
      })();
      // helper: convert simple BBCode to HTML for loading into Quill
      function bbcodeToHtml(bb) {
        if (!bb) return '';
        var out = bb.toString();
        // Strip [right] tags when loading BBCode to avoid incorrect BBCode output
        try { out = out.replace(/\[right\]([\s\S]*?)\[\/right\]/gi, '$1'); } catch (e) { }
        // Keep extracted quote HTML in a store and replace with placeholders so
        // the global paragraph-splitting logic below does not break quotes
        var _bt_quote_store = [];
        // images: [img]url[/img] or [img width=.. height=..]url[/img]
        out = out.replace(/\[img(?:[^\]]*)\]([^\[]+)\[\/img\]/gi, function (m, url) {
          return '<img src="' + url.trim() + '" />';
        });
        // strip or convert [color=#hex]...[/color] — remove very light colors to avoid invisible text
        out = out.replace(/\[color=([^\]]+)\]([\s\S]*?)\[\/color\]/gi, function (m, col, inner) {
          try {
            var c = ('' + col).trim();
            // normalize hex/rgb to hex if possible
            var hex = c;
            var mRgb = c.match(/rgba?\s*\(([^)]+)\)/i);
            if (mRgb) {
              var parts = mRgb[1].split(',').map(function (p) { return parseInt(p, 10) || 0; });
              function hexn(n) { var h = n.toString(16); return h.length === 1 ? ('0' + h) : h }
              hex = '#' + hexn(parts[0]) + hexn(parts[1]) + hexn(parts[2]);
            }
            var mh = ('' + hex).match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
            if (mh) {
              var h6 = mh[1].length === 3 ? ('#' + mh[1].split('').map(function (c) { return c + c; }).join('')) : ('#' + mh[1]);
              var int = parseInt(h6.slice(1), 16);
              var r = (int >> 16) & 255, g = (int >> 8) & 255, b = int & 255;
              var lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
              if (lum > 0.92) return inner; // skip very light colors
              return '<span style="color:' + h6 + '">' + inner + '</span>';
            }
            // unknown color format: keep inner text
            return inner;
          } catch (e) { return inner; }
        });
        // urls: [url=link]text[/url] and [url]link[/url]
        out = out.replace(/\[url=([^\]]+)\]([\s\S]*?)\[\/url\]/gi, function (m, href, text) {
          try { return '<a href="' + href + '" target="_blank" rel="noopener noreferrer">' + (text || href) + '</a>'; } catch (e) { return m; }
        });
        out = out.replace(/\[url\]([^\[]+)\[\/url\]/gi, function (m, href) { return '<a href="' + href + '" target="_blank" rel="noopener noreferrer">' + href + '</a>'; });
        // hr: [hr] or [hr][/hr]
        out = out.replace(/\[hr\](?:\s*\[\/hr\])?/gi, '<hr>');
        // table: [table][tr][td]...[/td][/tr][/table]
        out = out.replace(/\[table\]([\s\S]*?)\[\/table\]/gi, function (m, inner) {
          // convert tr/td bbcode to html
          var html = '<table style="border:1px solid #ccc;border-collapse:collapse;width:100%">';
          inner.replace(/\[tr\]([\s\S]*?)\[\/tr\]/gi, function (m2, trInner) {
            html += '<tr>';
            trInner.replace(/\[td\]([\s\S]*?)\[\/td\]/gi, function (m3, tdInner) {
              var cell = tdInner.replace(/\n/g, '<br>');
              html += '<td style="border:1px solid #ccc;padding:6px;vertical-align:top">' + cell + '</td>';
            });
            html += '</tr>';
          });
          html += '</table>';
          return html;
        });
        // quote: replace nested [quote]...[/quote] with placeholders so later
        // paragraph conversion won't split the quote into separate <p> elements.
        try {
          var prev;
          do {
            prev = out;
            out = out.replace(/\[quote\]([\s\S]*?)\[\/quote\]/gi, function (m, inner) {
              var content = (inner || '').replace(/\n/g, '<br>');
              var html = '<blockquote>' + content + '</blockquote>';
              var key = '___BT_QUOTE_' + _bt_quote_store.length + '___';
              _bt_quote_store.push(html);
              return key;
            });
          } while (out !== prev);
        } catch (e) { }
        // convert double newlines to paragraph tags
        out = out.replace(/\r\n|\r/g, '\n');
        out = out.replace(/\r\n|\r/g, '\n');
        // Split by double newlines but KEEP empty parts
        var lines = out.split('\n');
        var paragraphs = [];
        var current = [];

        for (var i = 0; i < lines.length; i++) {
          if (lines[i].trim() === '') {
            if (current.length > 0) {
              paragraphs.push('<p>' + current.join('<br>') + '</p>');
              current = [];
            }
            // Only add an explicit empty paragraph if there's non-empty content following
            var j = i + 1; var hasAhead = false;
            while (j < lines.length) { if (lines[j].trim() !== '') { hasAhead = true; break; } j++; }
            if (hasAhead) paragraphs.push('<p><br></p>'); // Represent empty line as <p><br></p>
          } else {
            current.push(lines[i]);
          }
        }
        if (current.length > 0) {
          paragraphs.push('<p>' + current.join('<br>') + '</p>');
        }
        out = paragraphs.join('');

        // restore any quote placeholders back to their HTML
        try {
          out = out.replace(/___BT_QUOTE_(\d+)___/g, function (m, idx) { return _bt_quote_store[parseInt(idx, 10)] || ''; });
        } catch (e) { }
        // detect predominant direction (RTL vs LTR) based on character counts
        function detectDirection(text) {
          if (!text) return 'ltr';
          var rtlMatches = text.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g) || [];
          var ltrMatches = text.match(/[A-Za-z]/g) || [];
          return rtlMatches.length > ltrMatches.length ? 'rtl' : 'ltr';
        }
        var dir = detectDirection(bb);
        if (dir === 'rtl') {
          out = '<div dir="rtl" style="direction:rtl;text-align:right;">' + out + '</div>';
        } else {
          out = '<div dir="ltr" style="direction:ltr;text-align:left;">' + out + '</div>';
        }
        return out;
      }
      // load existing value (support BBCode or HTML)
      if (originalTextarea.value) {
        try {
          // keep original text verbatim (do not trim) so leading/trailing blank lines are preserved
          var v = originalTextarea.value || '';
          // Better BBCode detection: common BBCode tags
          var looksLikeBB = /\[(?:img|hr|b|i|url|quote|color|size|table|list|code)\b/i.test(v);
          try {
            if (looksLikeBB) {
              // BBCode -> HTML
              try { quill.clipboard.dangerouslyPasteHTML(0, bbcodeToHtml(v)); } catch (err) { quill.root.innerHTML = bbcodeToHtml(v); }
            } else {
              // Plain text or HTML: if it already contains HTML tags, paste as HTML.
              // If it's plain text containing newlines, convert newlines to paragraphs (preserving empty lines)
              if (/<[^>]+>/.test(v)) {
                try { quill.clipboard.dangerouslyPasteHTML(0, v); } catch (err) { quill.root.innerHTML = v; }
              } else if (v.indexOf('\n') !== -1) {
                try { quill.clipboard.dangerouslyPasteHTML(0, bbcodeToHtml(v)); } catch (err) { quill.root.innerHTML = bbcodeToHtml(v); }
              } else {
                try { quill.clipboard.dangerouslyPasteHTML(0, v); } catch (err) { quill.root.innerHTML = v; }
              }
            }
          } catch (loadErr) {
            console.error('quill load error', loadErr);
            try { quill.root.innerHTML = looksLikeBB ? bbcodeToHtml(v) : v; } catch (e) { /* swallow */ }
          }
        } catch (e) { }
      }
      // Set the flag after successful init
      window.__bt_quill_initialized = true;
    } catch (err) {
      console.error('initQuillEditor error', err);
    }
  }
  // Convert Quill content to text/BBCode while preserving blank lines
  function quillToBBCode(quill) {
    let html = quill.root.innerHTML;
    // Blank paragraphs become two blank lines.
    html = html.replace(/<p><br><\/p>/g, '\n\n');
    // Regular paragraphs are converted to text + new line
    html = html.replace(/<p>(.*?)<\/p>/g, function (match, content) {
      return content + '\n\n';
    });
    // Any <br> will be converted to a new line
    html = html.replace(/<br\s*\/?>/g, '\n');
    // Remove any remaining HTML tags
    html = html.replace(/<\/?[^>]+(>|$)/g, "");
    // Preserve leading/trailing blank lines; only trim trailing spaces/tabs
    return html.replace(/[ \t]+$/g, '');
  }
  // Ensure initQuillEditor is exposed
  window.initQuillEditor = initQuillEditor;

  // Ensure buttons exist before attaching handlers
  (function quillToggleUI() {
    const textarea = document.querySelector('textarea[name="message"]');
    if (!textarea) return;

    const btnEnable = document.getElementById('bt-quill-enable');
    const btnDisable = document.getElementById('bt-quill-disable');
    if (!btnEnable || !btnDisable) return;

    // Enable button handler with cleanup
    btnEnable.addEventListener('click', function (event) {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      try { chrome.storage.local.set({ quillEnabled: true }); } catch (e) { }

      try { if (window.initQuillEditor) window.initQuillEditor(); } catch (e) { }

      try {
        const ta = document.querySelector('textarea[name="message"]');
        if (ta) ta.value = normalizeBlankLines(ta.value).replace(/\n+$/, '');
      } catch (e) { }

      try { if (typeof updateButtons === 'function') updateButtons(true); } catch (e) { }
    });

    // Disable button handler (existing)
    btnDisable.addEventListener('click', function (event) {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      try { chrome.storage.local.set({ quillEnabled: false }); } catch (e) { }
      try { if (window.destroyQuillEditor) window.destroyQuillEditor(); } catch (e) { }
      try { if (typeof updateButtons === 'function') updateButtons(false); } catch (e) { }
    });
  })();

  // Expose destroy so content script can disable/remove the editor
  window.destroyQuillEditor = function () {
    try {
      try { document.documentElement.classList.remove('bt-editor-active'); } catch (e) { }
      try { delete window.__bt_quill_editor_active; } catch (e) { }

      try {
        var els = document.querySelectorAll('.bt-emoji-toolbar[data-bt-hidden-by-quill]');
        els.forEach(function (el) {
          try {
            var prev = el.getAttribute('data-bt-prev-display');
            if (prev) el.style.display = prev; else el.style.removeProperty('display');
            el.removeAttribute('data-bt-prev-display');
            el.removeAttribute('data-bt-hidden-by-quill');
          } catch (e) { }
        });
      } catch (e) { }

      const wrapper = document.getElementById('quill-wrapper');
      const originalTextarea = document.querySelector('textarea[name="message"]');

      try {
        if (window.__bt_quill_instance && typeof quillToBBCode === 'function' && originalTextarea) {
          try {
            let content = quillToBBCode(window.__bt_quill_instance);
            content = normalizeBlankLines(content);
            content = content.replace(/\n+$/, '');
            originalTextarea.value = content;
          } catch (e) {
            originalTextarea.value = quillToBBCode(window.__bt_quill_instance);
          }
        }
      } catch (e) { }

      if (wrapper && wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);

      if (originalTextarea) {
        originalTextarea.style.display = '';
        try {
          originalTextarea.style.cursor = 'text';
          originalTextarea.classList.add('editor');
          originalTextarea.focus();
          try {
            originalTextarea.setSelectionRange(originalTextarea.value.length, originalTextarea.value.length);
          } catch (e) { }
        } catch (e) { }
      }

      try {
        if (window.__bt_quill_instance && typeof window.__bt_quill_instance.disable === 'function')
          window.__bt_quill_instance.disable();
      } catch (e) { }

      try { delete window.__bt_quill_instance; } catch (e) { }
      try { delete window.__bt_quill_initialized; } catch (e) { }
    } catch (err) {
      console.warn('destroyQuillEditor error', err);
    }
  };

})();