/* global Quill */
(function(){
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
                #quill-resizer{ position:absolute; width:22px; height:22px; right:0px; bottom:20px; cursor:se-resize; z-index:9999; display:block; background:transparent; border:0; padding:0; }
                #quill-resizer:hover{ transform:scale(1.02); }
                /* three short diagonal lines for classic handle */
                #quill-resizer:before{
                    content:'';
                    position:absolute;
                    right:1px;
                    bottom:1px;
                    width:14px;
                    height:14px;
                    background-repeat:no-repeat;
                    background-image:
                        linear-gradient(135deg, rgba(0,0,0,0.55) 40%, rgba(0,0,0,0) 40%),
                        linear-gradient(135deg, rgba(0,0,0,0.55) 40%, rgba(0,0,0,0) 40%),
                        linear-gradient(135deg, rgba(0,0,0,0.55) 40%, rgba(0,0,0,0) 40%);
                    background-size:10px 2px, 8px 2px, 6px 2px;
                    background-position: right 2px bottom 2px, right 2px bottom 6px, right 2px bottom 10px;
                    opacity:0.95;
                    display:block;
                    pointer-events:none;
                }
                /* ensure editor content wraps long lines */
                #bitcointalk-advanced-editor .ql-editor{ white-space:pre-wrap !important; word-wrap:break-word !important; overflow-wrap:break-word !important; }
                /* toolbar and emoji wrapping: keep emojis inside the toolbar and allow them to wrap into multiple rows */
                #advanced-toolbar{ display:flex; flex-wrap:wrap; gap:6px; align-items:center; overflow:hidden; box-sizing:border-box; }
                #advanced-toolbar .ql-formats{ flex:0 0 auto; }
                #quill-emoji-toolbar{ display:flex; flex-wrap:wrap; gap:6px; max-width:100%; box-sizing:border-box; align-items:center; }
                #quill-emoji-toolbar .custom-tool-button{ flex:0 0 auto; }
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
                    <button class="ql-video"></button>
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
            <div class="editor-status-bar">
                <span id="quill-word-count">Words: 0</span>
                <span id="quill-sync-msg">Synced with Bitcointalk Form</span>
            </div>
        `;
                    // All emojis were injected as buttons
                    const EMOJI_LIST = [
                        {char:'😈', name:'Smiling Devil'},
                        {char:'😊', name:'Smile'},
                        {char:'😳', name:'Flushed'},
                        {char:'😇', name:'Innocent'},
                        {char:'😂', name:'Joy'},
                        {char:'😢', name:'Sad'},
                        {char:'😠', name:'Angry'},
                        {char:'😍', name:'Heart Eyes'},
                        {char:'😲', name:'Astonished'},
                        {char:'🤔', name:'Thinking'},
                        {char:'😭', name:'Crying'},
                        {char:'👍', name:'Thumbs Up'},
                        {char:'👎', name:'Thumbs Down'},
                        {char:'😉', name:'Wink'},
                        {char:'😆', name:'Laughing'},
                        {char:'🙄', name:'Roll Eyes'},
                        {char:'😴', name:'Sleeping'},
                        {char:'🎉', name:'Party'},
                        {char:'😎', name:'Cool'},
                        {char:'🙂', name:'Slight Smile'}
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
                            newBtn.addEventListener('mousedown', function(e) { e.preventDefault(); e.stopPropagation(); });
                            newBtn.addEventListener('click', function (e) {
                                e.preventDefault();
                                e.stopPropagation();
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.accept = 'image/*';
                                input.onchange = function (ev) {
                                    const file = ev.target.files[0];
                                    if (!file) return;
                                    newBtn.disabled = true;
                                    const UPLOAD_ENDPOINT = 'https://hostmeme.com/bitcointalk.php';
                                    const fieldNames = ['file', 'image', 'upload', 'Filedata', 'fileToUpload'];
                                    function tryOne(name) {
                                        const fd = new FormData();
                                        fd.append(name, file, file.name);
                                        return fetch(UPLOAD_ENDPOINT, { method: 'POST', body: fd, credentials: 'omit' })
                                            .then(res => res.text().then(text => {
                                                let payload;
                                                try { payload = JSON.parse(text); } catch (e) { payload = text; }
                                                return { ok: !!res.ok, status: res.status, payload: payload, field: name };
                                            }))
                                            .catch(err => ({ ok: false, status: 0, payload: { error: String(err) }, field: name }));
                                    }
                                    function attemptUpload() {
                                        return fieldNames.reduce((p, name) => {
                                            return p.then(prev => {
                                                if (prev && prev.payload) {
                                                    const pw = prev.payload;
                                                    if ((typeof pw === 'object' && pw.url) || (typeof pw === 'string' && /https?:\/+/.test(pw)) || (pw && pw.success === true)) return prev;
                                                }
                                                return tryOne(name);
                                            });
                                        }, Promise.resolve(null)).then(res => res);
                                    }
                                    // Get the image dimensions
                                    function getImageSize(file) {
                                        return new Promise(resolve => {
                                            const img = new Image();
                                            img.onload = function () { resolve({ width: img.width, height: img.height }); };
                                            img.onerror = function () { resolve({ width: 0, height: 0 }); };
                                            img.src = URL.createObjectURL(file);
                                        });
                                    }
                                    Promise.all([attemptUpload(), getImageSize(file)])
                                        .then(results => {
                                            const resWrap = results[0];
                                            const size = results[1] || {};
                                            const payload = resWrap && resWrap.payload !== undefined ? resWrap.payload : resWrap;
                                            if (resWrap && resWrap.ok === false) {
                                                alert('Upload failed: HTTP ' + resWrap.status);
                                                return;
                                            }
                                            if (payload && typeof payload === 'object' && payload.success === false) {
                                                alert('Upload failed: ' + (payload.error || payload.message || JSON.stringify(payload)));
                                                return;
                                            }
                                            let url = null;
                                            if (typeof payload === 'string') {
                                                const m = payload.match(/https?:\/\/[^\"'<>\s]+/i);
                                                if (m) url = m[0];
                                            } else if (payload && typeof payload === 'object') {
                                                url = payload.url || payload.image || payload.link || payload.path || (payload.data && (payload.data.url || payload.data.path)) || payload.result || payload.location || null;
                                            }
                                            if (!url) {
                                                alert('Upload failed: invalid response');
                                                return;
                                            }
                                            const quill = window.__bt_quill_instance;
                                            if (!quill) return;
                                            const range = quill.getSelection() || { index: quill.getLength() };
                                            // Building a BBCode image
                                            let bb = '[img';
                                            if (size.width) bb += ' width=' + Math.round(size.width);
                                            if (size.height) bb += ' height=' + Math.round(size.height);
                                            bb += ']'+url+'[/img]';
                                            quill.insertText(range.index, bb);
                                        })
                                        .catch(() => { alert('Image upload failed'); })
                                        .finally(() => { newBtn.disabled = false; input.value = ''; });
                                };
                                input.click();
                            });
                        }
                    }, 100);
        originalTextarea.style.display = 'none';
        originalTextarea.parentNode.insertBefore(wrapper, originalTextarea);

        // Attach resize behavior to the resizer handle
        (function(){
            try {
                var res = wrapper.querySelector('#quill-resizer');
                var editorEl = wrapper.querySelector('#bitcointalk-advanced-editor');
                if (!res || !editorEl) return;

                var startX = 0, startY = 0, startW = 0, startH = 0, dragging = false;
                function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

                res.addEventListener('mousedown', function (ev) {
                    ev.preventDefault(); ev.stopPropagation();
                    dragging = true;
                    startX = ev.clientX; startY = ev.clientY;
                    var rect = wrapper.getBoundingClientRect();
                    startW = rect.width; startH = editorEl.offsetHeight;
                    document.addEventListener('mousemove', doMove);
                    document.addEventListener('mouseup', stopMove);
                });

                function doMove(e){
                    if (!dragging) return;
                    var dx = e.clientX - startX;
                    var dy = e.clientY - startY;
                    var newW = Math.round(startW + dx);
                    var newH = Math.round(startH + dy);
                    // minimum sensible dimensions
                    var MIN_W = 300, MIN_H = 120;
                    // maximum based on viewport and wrapper position to keep within page
                    var left = wrapper.getBoundingClientRect().left;
                    var top = wrapper.getBoundingClientRect().top;
                    var MAX_W = Math.max(MIN_W, window.innerWidth - left - 20);
                    var MAX_H = Math.max(MIN_H, window.innerHeight - top - 20);
                    newW = clamp(newW, MIN_W, MAX_W);
                    newH = clamp(newH, MIN_H, MAX_H);
                    wrapper.style.width = newW + 'px';
                    editorEl.style.height = newH + 'px';
                }

                function stopMove(){
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
        })();

        return wrapper;
    }

    function initQuillEditor() {
        try {
            if (window.__bt_quill_initialized) return;
            window.__bt_quill_initialized = true;
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
                    try { window.__bt_quill_editor_active = true; } catch (e) {}
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

            // Ensure alignment buttons show icons (some styles/themes hide them); inject SVGs as fallback
            try {
                const svgIcons = {
                    left: '<svg viewBox="0 0 18 18"><rect class="ql-fill" x="0" y="2" width="12" height="2"></rect><rect class="ql-fill" x="0" y="6" width="8" height="2"></rect><rect class="ql-fill" x="0" y="10" width="12" height="2"></rect><rect class="ql-fill" x="0" y="14" width="8" height="2"></rect></svg>',
                    center: '<svg viewBox="0 0 18 18"><rect class="ql-fill" x="3" y="2" width="12" height="2"></rect><rect class="ql-fill" x="5" y="6" width="8" height="2"></rect><rect class="ql-fill" x="3" y="10" width="12" height="2"></rect><rect class="ql-fill" x="5" y="14" width="8" height="2"></rect></svg>',
                    right: '<svg viewBox="0 0 18 18"><rect class="ql-fill" x="6" y="2" width="12" height="2"></rect><rect class="ql-fill" x="10" y="6" width="8" height="2"></rect><rect class="ql-fill" x="6" y="10" width="12" height="2"></rect><rect class="ql-fill" x="10" y="14" width="8" height="2"></rect></svg>',
                    justify: '<svg viewBox="0 0 18 18"><rect class="ql-fill" x="0" y="2" width="18" height="2"></rect><rect class="ql-fill" x="0" y="6" width="18" height="2"></rect><rect class="ql-fill" x="0" y="10" width="18" height="2"></rect><rect class="ql-fill" x="0" y="14" width="18" height="2"></rect></svg>'
                };
                ['left','center','right','justify'].forEach(function(v){
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
                        try { bq.setAttribute('title','Quote'); bq.setAttribute('aria-label','Quote'); } catch (e) {}
                    }
                } catch (e) { }
                // ensure left align button works (attach explicit handler as fallback)
                try {
                    var leftBtn = document.querySelector('.ql-align[value="left"]');
                    if (leftBtn) {
                        leftBtn.addEventListener('click', function (e) {
                            try { e.preventDefault(); e.stopPropagation(); var sel = quill.getSelection(); quill.format('align', 'left'); if (sel) quill.setSelection(sel.index, sel.length); quill.focus(); } catch (err) { }
                        });
                    }
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
                                try { quill.formatLine(start, len, 'blockquote', true); } catch (f) { try { quill.format('blockquote', true); } catch (g) {} }
                                // Insert two newlines after the selection end to create a free paragraph below the quote
                                    setTimeout(function () {
                                        try {
                                            var endIndex = start + len;
                                            try { quill.insertText(endIndex, '\n'); } catch (ie) { /* ignore */ }
                                            try { quill.setSelection(endIndex + 1, 0); quill.focus(); } catch (se) { }
                                            // ensure the new paragraph is not a blockquote (clear format on that line)
                                            try { quill.formatLine(endIndex + 1, 1, 'blockquote', false); } catch (ff) { try { quill.format('blockquote', false); } catch (gg) {} }
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
                    //code-block button with automatic exit adjustment
var codeBtn = document.querySelector('.ql-code-block');
if (codeBtn) {
  codeBtn.addEventListener('click', function (e) {
    e.preventDefault();
    e.stopPropagation();

    var sel = quill.getSelection();
    if (!sel) return;

    // Enable code-block on the current line
    quill.formatLine(sel.index, sel.length, 'code-block', true);

    // Calculate the end of the selection/line
    var endIndex = sel.index + sel.length;

    // Add a new line outside the block
    quill.insertText(endIndex, '\n ', 'user'); // Note the distance
    quill.formatLine(endIndex + 1, 1, 'code-block', false);

    // Remove the space to leave the line blank.
    quill.deleteText(endIndex + 1, 1, 'user');

    // Place the cursor on the new line outside the block.
    quill.setSelection(endIndex + 1, 0);
  });
}
                   } catch (e) { }
                var BlockEmbed = Quill.import('blots/block/embed');
                class Divider extends BlockEmbed {}
                Divider.blotName = 'divider';
                Divider.tagName = 'hr';
                Quill.register(Divider);
                // Check whether 'formats/divider' exists without spamming console.error
                var alreadyRegistered = false;
                try {
                    var _origConsoleError = console && console.error ? console.error : null;
                    try {
                        if (console && console.error) console.error = function () {};
                        try {
                            Quill.import('formats/divider');
                            alreadyRegistered = true;
                        } catch (err) {
                            alreadyRegistered = false;
                        }
                    } finally {
                        if (_origConsoleError) console.error = _origConsoleError;
                    }
                } catch (e) {
                    alreadyRegistered = false;
                }
                if (!alreadyRegistered) {
                    Quill.register(Divider);
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
            (function(){
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

            // sync back to original textarea as HTML
            function transformQuillToBBCode(q) {
                var root = q.root;
                function wrap(tagOpen, tagClose, txt) { return tagOpen + txt + tagClose; }
                function attrStyle(ch, styleName) {
                    try { return (ch.style && ch.style[styleName]) || (ch.getAttribute && ch.getAttribute('style') && (function(s){ var m = s.match(new RegExp(styleName + '\\s*:\\s*([^;]+)')); return m?m[1].trim():null; })(ch.getAttribute('style'))); } catch(e){return null;}
                }
                function normalizeColor(val) {
                    if (!val) return val;
                    val = (''+val).trim();
                    // rgb(a) -> hex
                    var m = val.match(/rgba?\s*\(([^)]+)\)/i);
                    if (m) {
                        var parts = m[1].split(',').map(function(p){ return parseInt(p,10)||0; });
                        var r = (parts[0]||0), g = (parts[1]||0), b = (parts[2]||0);
                        function hex(n){ var h = n.toString(16); return h.length===1?('0'+h):h; }
                        return '#' + hex(Math.max(0,Math.min(255,r))) + hex(Math.max(0,Math.min(255,g))) + hex(Math.max(0,Math.min(255,b)));
                    }
                    // strip spaces and return as-is (hex or named)
                    return val.replace(/\s+/g,'');
                }
                function colorIsTooLight(val) {
                    try {
                        var h = normalizeColor(val);
                        if (!h) return false;
                        // accept rgb(...) already normalized above; ensure hex
                        var hex = h;
                        var m = hex.match(/^#([0-9a-f]{3})$/i);
                        if (m) hex = '#'+m[1].split('').map(function(c){return c+c;}).join('');
                        var mh = hex.match(/^#([0-9a-f]{6})$/i);
                        if (!mh) return false;
                        var int = parseInt(mh[1],16);
                        var r = (int >> 16) & 255;
                        var g = (int >> 8) & 255;
                        var b = int & 255;
                        // relative luminance approximation
                        var lum = (0.2126*r + 0.7152*g + 0.0722*b)/255;
                        return lum > 0.92; // very light (close to white)
                    } catch (e) { return false; }
                }
                function walk(node) {
                    var t = '';
                    node.childNodes && Array.from(node.childNodes).forEach(function (ch) {
                        if (ch.nodeType === 3) {
                            t += (ch.nodeValue || '');
                        } else if (ch.tagName) {
                            var tag = ch.tagName.toLowerCase();
                            // Inline and block mappings
                            if (tag === 'img') {
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
                                var listItems = items.map(function(li){ return '[*]' + (walk(li) || ''); }).join('\n');
                                t += (isOl?('[list=1]\n'+listItems+'\n[/list]\n'):('[list]\n'+listItems+'\n[/list]\n'));
                            } else if (tag === 'li') {
                                t += walk(ch);
                            } else if (tag === 'pre' || tag === 'code') {
                                var codeText = ch.innerText || ch.textContent || '';
                                t += '[code]' + codeText + '[/code]\n';
                            } else if (tag === 'blockquote') {
                                try {
                                    // prefer visible text (innerText) to capture pasted content and preserve line breaks
                                    var innerQ = (ch.innerText || ch.textContent || walk(ch) || '');
                                    innerQ = (''+innerQ).replace(/\u00A0/g,' ').trim();
                                    if ((innerQ || '').toString().trim()) {
                                        t += '[quote]' + innerQ + '[/quote]\n';
                                    } else {
                                        // skip empty blockquote
                                    }
                                } catch (e) { }
                            } else if (tag === 'a') {
                                var href = ch.getAttribute('href') || '';
                                var text = (walk(ch) || '');
                                if (href) t += '[url=' + href + ']' + (text || href) + '[/url]'; else t += text;
                            } else if (tag === 'p' || tag === 'div' || tag === 'td' || tag === 'th') {
                                    // prefer textContent to decide emptiness so we don't drop paragraphs that use tags
                                    var textOnly = (ch.textContent || ch.innerText || '').toString().replace(/&nbsp;|&#160;|\u00A0/g, '').replace(/[\u200B\uFEFF]/g, '').trim();
                                    var hasImg = ch.querySelector && ch.querySelector('img');
                                    if (!hasImg && !textOnly) {
                                      t += '\n'; // Save the blank paragraph as two lines
                                      return;
                        }

                                // detect alignment
                                var align = (ch.style && ch.style.textAlign) || (ch.getAttribute && (ch.getAttribute('class')||'').match(/ql-align-(\w+)/) && (ch.getAttribute('class').match(/ql-align-(\w+)/)||[])[1]) || null;
                                // detect block-level styles
                                var blockColor = normalizeColor(attrStyle(ch, 'color'));
                                var blockSize = (attrStyle(ch, 'font-size') || '').toString();
                                var blockFont = (attrStyle(ch, 'font-family') || '').toString();
                                var content = (walk(ch) || '');
                                // (removed bgcolor handling -- background coloring not supported reliably on target forum)
                                // apply block-level wrappers (avoid adding [justify] tag since many BBCode variants don't support it)
                                if (blockFont) {
                                    var simple = (''+blockFont).split(',')[0].replace(/"|'/g,'').trim();
                                    content = '[font=' + simple + ']' + content + '[/font]';
                                }
                                if (blockSize) {
                                    var mblock = (''+blockSize).match(/(\d+)/);
                                    if (mblock) content = '[size=' + mblock[1] + 'pt]' + content + '[/size]';
                                }
                                if (blockColor) {
                                    if (!colorIsTooLight(blockColor)) {
                                        content = '[color=' + blockColor + ']' + content + '[/color]';
                                    }
                                }
                                if (align && align !== 'justify') {
                                    var map = { center: 'center', left: 'left', right: 'right' };
                                    if (map[align]) content = '[' + map[align] + ']' + content + '[/' + map[align] + ']';
                                }
                                t += content + '\n';
                            } else if (tag === 'strong' || tag === 'b') {
                                t += wrap('[b]','[/b]', (walk(ch) || ''));
                            } else if (tag === 'em' || tag === 'i') {
                                t += wrap('[i]','[/i]', (walk(ch) || ''));
                            } else if (tag === 'u') {
                                t += wrap('[u]','[/u]', (walk(ch) || ''));
                            } else if (tag === 's' || tag === 'strike' || tag === 'del') {
                                t += wrap('[s]','[/s]', (walk(ch) || ''));
                            } else if (tag === 'span') {
                                // handle inline styles like color, background and font-size
                                var txt = (walk(ch) || '');
                                var color = attrStyle(ch, 'color');
                                var fsize = attrStyle(ch, 'font-size');
                                var font = attrStyle(ch, 'font-family');
                                // simplify font-family to the first font name (before comma)
                                if (font) {
                                    var simple = (''+font).split(',')[0].replace(/"|'/g,'').trim();
                                    font = simple || font;
                                }
                                // apply nesting: font -> size -> color -> text
                                if (font) txt = '[font=' + font + ']' + txt + '[/font]';
                                if (fsize) {
                                    var m = (''+fsize).match(/(\d+)/);
                                    if (m) txt = '[size=' + m[1] + 'pt]' + txt + '[/size]';
                                }
                                if (color) {
                                    var nc = normalizeColor(color);
                                    if (!colorIsTooLight(nc)) txt = '[color=' + nc + ']' + txt + '[/color]';
                                }
                                t += txt;
                            } else {
                                // generic fallback: walk children
                                t += walk(ch);
                            }
                        }
                    });
                    return t;
                }
                var out = walk(root);
                out = out.replace(/^[\s\n]+|[\s\n]+$/g, '');
                // collapse redundant nested color/bg wrappers where values match
                try {
                    out = out.replace(/\[bgcolor=([^\]]+)\]\s*\[color=([^\]]+)\]([\s\S]*?)\[\/color\]\s*\[\/bgcolor\]/gi, function (m, bg, col, inner) {
                        try {
                            var nb = normalizeColor(bg) || bg;
                            var nc = normalizeColor(col) || col;
                            if (nb && nc && (''+nb).toLowerCase() === (''+nc).toLowerCase()) {
                                return '[bgcolor=' + nb + ']' + inner + '[/bgcolor]';
                            }
                        } catch (e) { }
                        return m;
                    });
                    // also handle reverse order [color][bgcolor]...[/bgcolor][/color]
                    out = out.replace(/\[color=([^\]]+)\]\s*\[bgcolor=([^\]]+)\]([\s\S]*?)\[\/bgcolor\]\s*\[\/color\]/gi, function (m, col, bg, inner) {
                        try {
                            var nb = normalizeColor(bg) || bg;
                            var nc = normalizeColor(col) || col;
                            if (nb && nc && (''+nb).toLowerCase() === (''+nc).toLowerCase()) {
                                return '[bgcolor=' + nb + ']' + inner + '[/bgcolor]';
                            }
                        } catch (e) { }
                        return m;
                    });
                    // collapse duplicate nested color tags
                    out = out.replace(/\[color=([^\]]+)\]([\s\S]*?)\[\/color\]\s*\[color=[^\]]+\]([\s\S]*?)\[\/color\]/gi, function(m,a,b,c){ return '[color='+normalizeColor(a)+']'+(b+c)+'[/color]'; });
                } catch (e) { }

                    // merge adjacent quote blocks into a single quote block (repeat until stable)
                    try {
                        var prevOut;
                        do {
                            prevOut = out;
                            out = out.replace(/\[quote\]([\s\S]*?)\[\/quote\]\s*\n\s*\[quote\]([\s\S]*?)\[\/quote\]/gi, function(m,a,b){
                                return '[quote]' + a + '\n' + b + '[/quote]';
                            });
                        } while (out !== prevOut);
                    } catch (e) { }
                // Remove any [right] or [/right] wrappers which some BBCode variants don't support
                try {
                    out = out.replace(/\[\/?right\]/gi, '');
                } catch (e) { }
                return out;
            }

            quill.on('text-change', () => {
                try {
                    const bb = transformQuillToBBCode(quill);
                    originalTextarea.value = bb;
                    const textContent = quill.getText().trim();
                    const words = textContent.length > 0 ? textContent.split(/\s+/).length : 0;
                    const wc = document.getElementById('quill-word-count');
                    if (wc) wc.innerText = `Words: ${words} | Chars: ${textContent.length}`;
                } catch (e) { }
            });

            // helper: convert simple BBCode to HTML for loading into Quill
            function bbcodeToHtml(bb) {
                if (!bb) return '';
                var out = bb.toString();
                // Remove any [right] or [/right] tags so they don't appear verbatim in the editor
                try { out = out.replace(/\[\/?right\]/gi, ''); } catch (e) { }
                // Keep extracted quote HTML in a store and replace with placeholders so
                // the global paragraph-splitting logic below does not break quotes
                var _bt_quote_store = [];
                // images: [img]url[/img] or [img width=.. height=..]url[/img]
                out = out.replace(/\[img(?:[^\]]*)\]([^\[]+)\[\/img\]/gi, function (m, url) {
                    return '<img src="' + url.trim() + '" />';
                });
                // strip or convert [color=#hex]...[/color] — remove very light colors to avoid invisible text
                out = out.replace(/\[color=([^\]]+)\]([\s\S]*?)\[\/color\]/gi, function(m, col, inner) {
                    try {
                        var c = (''+col).trim();
                        // normalize hex/rgb to hex if possible
                        var hex = c;
                        var mRgb = c.match(/rgba?\s*\(([^)]+)\)/i);
                        if (mRgb) {
                            var parts = mRgb[1].split(',').map(function(p){return parseInt(p,10)||0;});
                            function hexn(n){var h = n.toString(16);return h.length===1?('0'+h):h}
                            hex = '#'+hexn(parts[0])+hexn(parts[1])+hexn(parts[2]);
                        }
                        var mh = (''+hex).match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
                        if (mh) {
                            var h6 = mh[1].length===3?('#'+mh[1].split('').map(function(c){return c+c;}).join('')):('#'+mh[1]);
                            var int = parseInt(h6.slice(1),16);
                            var r = (int>>16)&255, g = (int>>8)&255, b = int&255;
                            var lum = (0.2126*r + 0.7152*g + 0.0722*b)/255;
                            if (lum > 0.92) return inner; // skip very light colors
                            return '<span style="color:' + h6 + '">' + inner + '</span>';
                        }
                        // unknown color format: keep inner text
                        return inner;
                    } catch (e) { return inner; }
                });
                // urls: [url=link]text[/url] and [url]link[/url]
                out = out.replace(/\[url=([^\]]+)\]([\s\S]*?)\[\/url\]/gi, function(m, href, text) {
                    try { return '<a href="' + href + '" target="_blank" rel="noopener noreferrer">' + (text||href) + '</a>'; } catch (e) { return m; }
                });
                out = out.replace(/\[url\]([^\[]+)\[\/url\]/gi, function(m, href) { return '<a href="' + href + '" target="_blank" rel="noopener noreferrer">' + href + '</a>'; });
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
                        out = out.replace(/\[quote\]([\s\S]*?)\[\/quote\]/gi, function(m, inner) {
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
var parts = out.split(/\n{,}/g); //Do not delete the empty parts
if (parts.length > 1) {
  out = parts.map(function (p) {
    var content = p.length ? p.replace(/\n/g, '<br>') : '<br>'; // Empty paragraph => <br>
    return '<p>' + content + '</p>';
  }).join('');
} else {
  out = out.replace(/\n/g, '<br>');
}


                // restore any quote placeholders back to their HTML
                try {
                    out = out.replace(/___BT_QUOTE_(\d+)___/g, function(m, idx) { return _bt_quote_store[parseInt(idx,10)] || ''; });
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
  html = html.replace(/<p>(.*?)<\/p>/g, function(match, content) {
    return content + '\n';
  });

  // Any <br> will be converted to a new line
  html = html.replace(/<br\s*\/?>/g, '\n');

  // Remove any remaining HTML tags
  html = html.replace(/<\/?[^>]+(>|$)/g, "");

  return html.trim();
}

// Expose initializer for the content script to call after injecting Quill
window.initQuillEditor = initQuillEditor;
   
    // Expose destroy so content script can disable/remove the editor
    window.destroyQuillEditor = function () {
        try {
            // remove global active class so future toolbars aren't hidden, then restore any specific toolbars
            try { document.documentElement.classList.remove('bt-editor-active'); } catch (e) {}
            try { delete window.__bt_quill_editor_active; } catch (e) {}

            // restore any external emoji toolbars hidden by init
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
            if (wrapper && wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
            if (originalTextarea) originalTextarea.style.display = '';
            try { if (window.__bt_quill_instance && typeof window.__bt_quill_instance.disable === 'function') window.__bt_quill_instance.disable(); } catch (e) { }
            try { delete window.__bt_quill_instance; } catch (e) { }
            try { delete window.__bt_quill_initialized; } catch (e) { }
        } catch (err) { console.warn('destroyQuillEditor error', err); }
    };
})();
