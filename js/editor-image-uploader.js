// Minimal image uploader for Bitcointalk-style editors
// Keeps only the upload logic and BBCode insertion; SCEditor removed.

(function () {
    'use strict';

    var UPLOAD_ENDPOINT = 'https://hostmeme.com/bitcointalk.php';

    function findTargets() {
        var targets = Array.from(document.querySelectorAll('textarea'));
        // also add Quill editor root nodes (the editable container)
        var quills = Array.from(document.querySelectorAll('.ql-editor[contenteditable="true"]'));
        quills.forEach(function (el) {
            // avoid duplicates if there's a textarea paired with this editor
            if (targets.indexOf(el) === -1) targets.push(el);
        });
        return targets;
    }

    function findQuillInstance(node) {
        var el = node;
        while (el) {
            if (el.__quill) return el.__quill;
            el = el.parentNode;
        }
        return null;
    }

    function insertAtCursor(target, text) {
        // If target is a Quill editor element, use Quill API to insert text (avoids HTML paragraph artifacts)
        var quill = findQuillInstance(target);
        if (quill) {
            try {
                quill.focus();
                var sel = quill.getSelection(true);
                var index = (sel && typeof sel.index === 'number') ? sel.index : quill.getLength();
                quill.insertText(index, text, 'user');
                quill.setSelection(index + text.length, 0);
                return;
            } catch (e) {
                // fallback to DOM-based insertion below
                console.error('Quill insertion failed, falling back to DOM:', e);
            }
        }

        // Fallback for plain textarea or contenteditable nodes where Quill instance isn't available
        if (target && target.tagName && target.tagName.toLowerCase() === 'textarea') {
            var start = target.selectionStart || 0;
            var end = target.selectionEnd || 0;
            var value = target.value || '';
            target.value = value.substring(0, start) + text + value.substring(end);
            var pos = start + text.length;
            target.selectionStart = target.selectionEnd = pos;
            target.focus();
            return;
        }

        // Generic contenteditable insertion (best-effort)
        var sel = window.getSelection && window.getSelection();
        if (sel && sel.rangeCount) {
            var range = sel.getRangeAt(0);
            range.deleteContents();
            var node = document.createTextNode(text);
            range.insertNode(node);
            // place caret after inserted node
            range.setStartAfter(node);
            range.setEndAfter(node);
            sel.removeAllRanges();
            sel.addRange(range);
        }
    }

    function transformQuillToBBCode(quill) {
        var root = quill.root; // a DOM element
        function walk(node) {
            var t = '';
            node.childNodes && Array.from(node.childNodes).forEach(function (ch) {
                if (ch.nodeType === 3) {
                    t += ch.nodeValue;
                } else if (ch.tagName) {
                    var tag = ch.tagName.toLowerCase();
                    if (tag === 'img') {
                        var src = ch.getAttribute('src') || '';
                        if (src) t += '[img]' + src + '[/img]';
                            } else if (tag === 'hr') {
                                t += '[hr]\n';
                    } else if (tag === 'p' || tag === 'div') {
                        // detect if paragraph is empty (only <br>, &nbsp; or invisible chars)
                        var innerHTML = (ch.innerHTML || '').toString();
                        var cleaned = innerHTML.replace(/<br\s*\/?\s*>/gi, '').replace(/&nbsp;|&#160;|\u00A0/g, '').replace(/[\u200B\uFEFF]/g, '');
                        // strip any remaining tags
                        cleaned = cleaned.replace(/<[^>]+>/g, '').trim();
                        var hasImg = ch.querySelector && ch.querySelector('img');
                        if (!hasImg && !cleaned) {
                            // skip empty paragraph
                            return;
                        }
                        t += walk(ch) + '\n';
                    } else {
                        // inline or unknown: recurse
                        t += walk(ch);
                    }
                }
            });
            return t;
        }
        var out = walk(root).replace(/\n{3,}/g, '\n\n');
        // Trim trailing whitespace/newlines
        out = out.replace(/^[\s\n]+|[\s\n]+$/g, '');
        return out;
    }

    function getImageSize(file) {
        return new Promise(function (resolve) {
            var img = new Image();
            img.onload = function () { resolve({ width: img.width, height: img.height }); };
            img.onerror = function () { resolve({ width: 0, height: 0 }); };
            img.src = URL.createObjectURL(file);
        });
    }

    // Note: upload functionality now uses `attemptUpload` which retries common form field names.

    function attemptUpload(file) {
        var fieldNames = ['file', 'image', 'upload', 'Filedata', 'fileToUpload'];
        var lastErr = null;

        function tryOne(name) {
            var fd = new FormData();
            fd.append(name, file, file.name);
            return fetch(UPLOAD_ENDPOINT, { method: 'POST', body: fd, credentials: 'omit' })
                .then(function (res) {
                    return res.text().then(function (text) {
                        var payload;
                        try { payload = JSON.parse(text); } catch (e) { payload = text; }
                        return { ok: !!res.ok, status: res.status, payload: payload, field: name };
                    });
                })
                .catch(function (err) { lastErr = err; return { ok: false, status: 0, payload: { error: String(err) }, field: name }; });
        }

        // sequentially try the field names until we find a URL or success
        return fieldNames.reduce(function (p, name) {
            return p.then(function (prev) {
                // if previous attempt returned payload with URL or success, short-circuit
                if (prev && prev.payload) {
                    var pw = prev.payload;
                    if ((typeof pw === 'object' && pw.url) || (typeof pw === 'string' && /https?:\/\//.test(pw)) || (pw && pw.success === true)) return prev;
                }
                return tryOne(name);
            });
        }, Promise.resolve(null)).then(function (res) {
            if (!res) return { ok: false, status: 0, payload: { error: 'no response' }, field: null };
            return res;
        });
    }

    function buildBBCode(url, w, h) {
        var attrs = [];
        if (w) attrs.push('width=' + Math.round(w));
        if (h) attrs.push('height=' + Math.round(h));
        return attrs.length ? '[img ' + attrs.join(' ') + ']' + url + '[/img]' : '[img]' + url + '[/img]';
    }

    function createUploadButton() {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = 'Upload image';
        btn.className = 'bt-image-upload-button';
        btn.style.marginLeft = '6px';
        return btn;
    }

    function attachUploaderTo(textarea) {
        if (textarea._imageUploaderAttached) return;
        textarea._imageUploaderAttached = true;

        // Find enclosing form (if any) to place the upload button near Post/Preview
        var form = textarea.closest && textarea.closest('form') ? textarea.closest('form') : document;

        // Avoid attaching multiple uploaders to same form
        if (form._bt_upload_attached) return (form._bt_upload_textarea = textarea);
        form._bt_upload_attached = true;
        form._bt_upload_textarea = textarea;

        // If this target is a Quill editor, try to find a real textarea in the form
        // (many integrations keep a hidden textarea for submission). Prefer that.
        if (textarea && textarea.matches && textarea.matches('.ql-editor[contenteditable="true"]')) {
            var realTA = form.querySelector('textarea');
            if (realTA) form._bt_upload_textarea = realTA;
        }

        // Ensure we have a real textarea to populate on preview/submit. If none exists,
        // create a hidden one so the forum preview/submit logic can read BBCode text.
        if (!form._bt_upload_textarea || !(form._bt_upload_textarea.tagName && form._bt_upload_textarea.tagName.toLowerCase() === 'textarea')) {
            var created = document.createElement('textarea');
            created.style.display = 'none';
            // choose a name that many forums accept; avoid clobbering existing names
            created.name = 'message';
            form.appendChild(created);
            form._bt_upload_textarea = created;
        }

        // Install a submit handler that converts Quill HTML to BBCode into the textarea
        if (!form._bt_quill_submit_installed) {
            form.addEventListener('submit', function (ev) {
                try {
                    // find any quill instances inside this form
                    var qels = Array.from(form.querySelectorAll('.ql-editor[contenteditable="true"]'));
                    if (!qels.length) return;
                    var out = [];
                    qels.forEach(function (el) {
                        var q = findQuillInstance(el);
                        if (q) out.push(transformQuillToBBCode(q));
                    });
                    if (out.length && form._bt_upload_textarea && form._bt_upload_textarea.tagName && form._bt_upload_textarea.tagName.toLowerCase() === 'textarea') {
                        // join editors with double newline
                        form._bt_upload_textarea.value = out.join('\n\n');
                    }
                } catch (e) {
                    console.error('Quill->BBCode submit conversion failed', e);
                }
            }, true);
            form._bt_quill_submit_installed = true;
        }

        var fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';

        var btn = createUploadButton();
        btn.style.margin = '0 6px';
        // Ensure cursor shows pointer on upload button (force important)
        try { btn.style.setProperty('cursor', 'pointer', 'important'); } catch (e) { btn.style.cursor = 'pointer'; }

        // Ensure the textarea shows default arrow cursor (force important)
        try { textarea.style.setProperty('cursor', 'default', 'important'); } catch (e) { try { textarea.style.cursor = 'default'; } catch (e) {} }

        // Helper: insert button between Post and Preview if found
        function tryInsertButton() {
            // look for Post and Preview controls inside the form
            var candidates = Array.from(form.querySelectorAll('input[type=submit], input[type=button], button, a'));
            var postEl = null, previewEl = null;
            candidates.forEach(function (el) {
                var txt = (el.value || el.innerText || '').trim().toLowerCase();
                if (!postEl && /\bpost\b/.test(txt)) postEl = el;
                if (!previewEl && /\bpreview\b/.test(txt)) previewEl = el;
            });

            if (postEl && previewEl && postEl.parentNode === previewEl.parentNode) {
                // insert between them
                postEl.parentNode.insertBefore(btn, previewEl);
                previewEl.parentNode.insertBefore(fileInput, previewEl);
                return true;
            }

            // fallback: if preview exists, insert before it
            if (previewEl) {
                previewEl.parentNode.insertBefore(btn, previewEl);
                previewEl.parentNode.insertBefore(fileInput, previewEl);
                return true;
            }

            // fallback: append to form's last action area
            var actionArea = form.querySelector('.controls, .submit, .buttons') || form;
            actionArea.appendChild(btn);
            actionArea.appendChild(fileInput);
            return false;
        }

        tryInsertButton();

        // Attach preview sanitiser: when user clicks Preview, convert Quill content
        // to BBCode and also set a cleaned HTML into the editor so preview shows text/images only.
        function quillBBCodeToHTML(bb) {
            // convert [img]url[/img] to <img src="url"> and newlines to <br>
            var html = bb.replace(/\[img(?:[^\]]*)\]([^\[]+)\[\/img\]/gi, function (m, url) {
                return '<img src="' + url.trim() + '">';
            });
            html = html.replace(/\n/g, '<br>');
            return html;
        }

        function updatePreviewTargets() {
            try {
                var qels = Array.from(form.querySelectorAll('.ql-editor[contenteditable="true"]'));
                if (!qels.length) return;
                qels.forEach(function (el) {
                    var q = findQuillInstance(el);
                    if (!q) return;
                    var bb = transformQuillToBBCode(q);
                    // update hidden textarea if exists
                    if (form._bt_upload_textarea && form._bt_upload_textarea.tagName && form._bt_upload_textarea.tagName.toLowerCase() === 'textarea') {
                        form._bt_upload_textarea.value = bb;
                    }
                    // do NOT overwrite editor DOM (can create empty <p>), only populate hidden textarea
                });
            } catch (e) { console.error('updatePreviewTargets failed', e); }
        }

        // find preview buttons and attach capture listener so we update before forum preview logic runs
        var previewButtons = Array.from(form.querySelectorAll('input[type=button], input[type=submit], button, a')).filter(function (el) {
            var txt = (el.value || el.innerText || el.title || el.getAttribute('aria-label') || '').trim().toLowerCase();
            var cls = (el.className || '').toLowerCase();
            // match English 'preview', Arabic 'معاينة', or generic 'preview' class/attr
            return /preview|معاينة|عرض/.test(txt) || /preview/.test(cls) || el.dataset && el.dataset.action === 'preview';
        });
        previewButtons.forEach(function (pb) {
            try { pb.addEventListener('mousedown', updatePreviewTargets, true); } catch (e) {}
            try { pb.addEventListener('click', updatePreviewTargets, true); } catch (e) {}
        });

        // Keep hidden textarea updated as user types (debounced)
        function debounce(fn, wait) {
            var t = null;
            return function () {
                var args = arguments;
                clearTimeout(t);
                t = setTimeout(function () { fn.apply(null, args); }, wait);
            };
        }
        var qelsAll = Array.from(form.querySelectorAll('.ql-editor[contenteditable="true"]'));
        qelsAll.forEach(function (el) {
            var q = findQuillInstance(el);
            if (!q) return;
            var updater = debounce(function () {
                try {
                    var bb = transformQuillToBBCode(q);
                    if (form._bt_upload_textarea) form._bt_upload_textarea.value = bb;
                } catch (e) {}
            }, 200);
            // quill emits text-change on its instance; listen if available
            try { q.on && q.on('text-change', updater); } catch (e) { el.addEventListener('input', updater); }
        });

        btn.addEventListener('click', function () { fileInput.click(); });

        fileInput.addEventListener('change', function () {
            var file = fileInput.files && fileInput.files[0];
            if (!file) return;
            btn.disabled = true;
            Promise.all([attemptUpload(file), getImageSize(file)])
                .then(function (results) {
                    var resWrap = results[0];
                    var size = results[1] || {};
                    // resWrap: { ok, status, payload }
                    var payload = resWrap && resWrap.payload !== undefined ? resWrap.payload : resWrap;

                    // If HTTP-level failure
                    if (resWrap && resWrap.ok === false) {
                        console.error('Upload HTTP error wrapper:', resWrap);
                        var httpMsg = 'HTTP ' + resWrap.status + ' returned';
                        // try to show payload message if present
                        var pm = (payload && (payload.error || payload.message)) || payload;
                        alert('Upload failed: ' + httpMsg + (pm ? '\n' + JSON.stringify(pm) : ''));
                        return;
                    }

                    // If server-level failure indicated inside payload
                    if (payload && typeof payload === 'object' && payload.success === false) {
                        console.error('Upload server error payload:', payload);
                        var msg = payload.error || payload.message || JSON.stringify(payload);
                        alert('Upload failed: ' + msg);
                        return;
                    }

                    // extract URL from payload or text
                    var url = null;
                    if (typeof payload === 'string') {
                        var m = payload.match(/https?:\/\/[^\s"'<>]+/i);
                        if (m) url = m[0];
                    } else if (payload && typeof payload === 'object') {
                        url = payload.url || payload.image || payload.link || payload.path || (payload.data && (payload.data.url || payload.data.path)) || payload.result || payload.location || null;
                    }

                    if (!url) {
                        console.error('Upload invalid response (no URL). wrapper:', resWrap, 'payload:', payload);
                        var fallbackMsg = (payload && (payload.error || payload.message)) || 'invalid response (see console)';
                        alert('Upload failed: ' + fallbackMsg);
                        return;
                    }

                    var bb = buildBBCode(url, size.width, size.height);
                    var ta = form._bt_upload_textarea || textarea;
                    insertAtCursor(ta, bb);
                })
                .catch(function (err) {
                    console.error('Upload error', err);
                    alert('Image upload failed');
                })
                .finally(function () { btn.disabled = false; fileInput.value = ''; });
        });
    }

    function init() {
        findTargets().forEach(attachUploaderTo);
        // Observe for dynamically added textareas (e.g. AJAX forms)
        var obs = new MutationObserver(function (mutations) {
            mutations.forEach(function (m) {
                m.addedNodes && m.addedNodes.forEach(function (n) {
                    if (n.nodeType === 1) {
                        if (n.matches && (n.matches('textarea') || n.matches('.ql-editor[contenteditable="true"]'))) attachUploaderTo(n);
                        else if (n.querySelectorAll) Array.from(n.querySelectorAll('textarea, .ql-editor[contenteditable="true"]')).forEach(attachUploaderTo);
                    }
                });
            });
        });
        obs.observe(document.documentElement || document.body, { childList: true, subtree: true });
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') init();
    else document.addEventListener('DOMContentLoaded', init);

})();
