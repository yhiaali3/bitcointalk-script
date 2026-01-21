(function () {
    // helpers in page context
    function decodeHtmlEntities(html) {
        var d = document.createElement('div');
        d.innerHTML = html;
        return d.textContent || d.innerText || '';
    }

    // dedupe dispatches across multiple interception points
    function dispatchQuoteOnce(text) {
        try {
            if (!window.__bt_dispatchedQuotes) window.__bt_dispatchedQuotes = new Map();
            var map = window.__bt_dispatchedQuotes;
            var now = Date.now();
            // purge entries older than 10s
            for (var k of Array.from(map.keys())) { if (now - map.get(k) > 10000) map.delete(k); }
            var key = (text ? text.length : 0) + '|' + (text ? text.slice(0, 120) : '');
            if (map.has(key)) { console.log('[BT-INJECT] quote dispatch suppressed (duplicate)'); return false; }
            map.set(key, now);
            window.dispatchEvent(new CustomEvent('bt-quote-text', { detail: { text: text } }));
            return true;
        } catch (e) {
            try { window.dispatchEvent(new CustomEvent('bt-quote-text', { detail: { text: text } })); } catch (e2) { }
            return true;
        }
    }

    async function tryFetchHtml(u) {
        try {
            console.log('[BT-INJECT] tryFetchHtml start', u);
            var uu = u;
            if (!/^https?:\/\//i.test(uu)) {
                if (uu.charAt(0) === '/') uu = location.origin + uu;
                else uu = location.origin + '/' + uu;
            }
            console.log('[BT-INJECT] tryFetchHtml absolute', uu);
            var r = await fetch(uu, { credentials: 'same-origin' });
            if (!r.ok) { console.log('[BT-INJECT] tryFetchHtml fetch failed', r.status); return null; }
            var h = await r.text();
            var has = /name=["']?message["']?/i.test(h);
            console.log('[BT-INJECT] tryFetchHtml fetched, contains message textarea:', has);
            if (has) return h;
            return null;
        } catch (e) { console.log('[BT-INJECT] tryFetchHtml error', e); return null; }
    }

    // Helper: install temporary interceptors for fetch and XHR
    function withTemporaryInterceptors(timeoutMs, onResponse) {
        var origFetch = window.fetch;
        var origXHROpen = window.XMLHttpRequest && window.XMLHttpRequest.prototype.open;
        var origXHRSend = window.XMLHttpRequest && window.XMLHttpRequest.prototype.send;
        var done = false;

        function cleanup() {
            try { if (window.fetch === patchedFetch) window.fetch = origFetch; } catch (e) { }
            try { if (window.XMLHttpRequest && window.XMLHttpRequest.prototype.open === patchedXHROpen) window.XMLHttpRequest.prototype.open = origXHROpen; } catch (e) { }
            try { if (window.XMLHttpRequest && window.XMLHttpRequest.prototype.send === patchedXHRSend) window.XMLHttpRequest.prototype.send = origXHRSend; } catch (e) { }
        }

        // patched fetch
        async function patchedFetch() {
            try {
                var p = origFetch.apply(this, arguments);
                p.then(function (resp) {
                    try {
                        // clone and check text asynchronously
                        resp.clone().text().then(function (txt) {
                            try { if (done) return; if (/name=["']?message["']?/i.test(txt)) { done = true; onResponse(txt); cleanup(); } } catch (e) { }
                        }).catch(function () { });
                    } catch (e) { }
                }).catch(function () { });
                return p;
            } catch (e) { return origFetch.apply(this, arguments); }
        }

        // patched XHR
        function patchedXHROpen() {
            try {
                // store URL on the instance
                this._bt_original_url = arguments[1];
            } catch (e) { }
            return origXHROpen.apply(this, arguments);
        }

        function patchedXHRSend() {
            try {
                var xhr = this;
                var onLoad = function () {
                    try {
                        if (done) return;
                        var txt = xhr.responseText || '';
                        if (/name=["']?message["']?/i.test(txt)) {
                            done = true;
                            onResponse(txt);
                            cleanup();
                        }
                    } catch (e) { }
                };
                xhr.addEventListener('load', onLoad);
            } catch (e) { }
            return origXHRSend.apply(this, arguments);
        }

        try { window.fetch = patchedFetch; } catch (e) { }
        try {
            if (window.XMLHttpRequest) {
                window.XMLHttpRequest.prototype.open = patchedXHROpen;
                window.XMLHttpRequest.prototype.send = patchedXHRSend;
            }
        } catch (e) { }

        // timeout cleanup
        var to = setTimeout(function () { if (!done) { done = true; cleanup(); } }, timeoutMs || 3000);
        return function cancel() { if (!done) { done = true; clearTimeout(to); cleanup(); } };
    }

    document.addEventListener('click', function (ev) {
        try {
            if (ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.altKey || ev.shiftKey) return;
            var el = ev.target;
            while (el && el.tagName !== 'A') el = el.parentElement;
            if (!el) return;
            var href = el.getAttribute && el.getAttribute('href') || '';
            var onclickAttr = el.getAttribute('onclick') || '';
            var looksLikeQuoteText = /quote|insert quote|اقتباس|إدراج اقتباس/i.test((el.textContent || el.title || ''));
            var looksLikeOnclick = /insertQuote/i.test(onclickAttr);
            var looksLikePostAction = /action=post/i.test(href) && href.indexOf('#top') !== -1;
            if (!looksLikeQuoteText && !looksLikeOnclick && !looksLikePostAction) return;

            ev.preventDefault(); ev.stopPropagation();

            // Install interceptors and then invoke the page's insertQuoteFast (if available)
            (function () {
                var cancel = withTemporaryInterceptors(5000, function (responseText) {
                    try {
                        var m = responseText.match(/<textarea[^>]*name=["']?message["']?[^>]*>([\s\S]*?)<\/textarea>/i);
                        var quoted = m && m[1] ? m[1] : '';
                        if (!quoted) { console.log('[BT-INJECT] intercepted response but textarea empty'); return; }
                        var decoded = decodeHtmlEntities(quoted);
                        console.log('[BT-INJECT] intercepted decoded quote length', decoded.length);
                        dispatchQuoteOnce(decoded);
                    } catch (e) { console.log('[BT-INJECT] error handling intercepted response', e); }
                });

                try {
                    console.log('[BT-INJECT] calling page insertQuote if available');
                    // prefer direct function if available
                    var mId = (onclickAttr.match(/insertQuoteFast\((\d+)\)/i) || [])[1];

                    // First try: monkey-patch getXMLDocument so we intercept the callback passed into it
                    var origGetXMLDocument = window.getXMLDocument;
                    var patchedGetXMLDocument = null;
                    var gotIntercept = false;
                    if (typeof origGetXMLDocument === 'function') {
                        patchedGetXMLDocument = function (url, callback) {
                            try {
                                console.log('[BT-INJECT] patched getXMLDocument called for', url);
                                var wrappedCallback = function (doc) {
                                    try {
                                        var txt = '';
                                        try {
                                            if (doc && typeof doc === 'object') {
                                                if (doc.responseText) txt = doc.responseText;
                                                else try { txt = (new XMLSerializer()).serializeToString(doc); } catch (e) { txt = '' + doc; }
                                            } else txt = '' + doc;
                                        } catch (e) { txt = '' + doc; }

                                        if (txt) {
                                            try { console.log('[BT-INJECT] getXMLDocument response preview', txt.slice(0, 300)); } catch (e) { }
                                        }
                                        if (txt) {
                                            // Prefer textarea if present (older flow), else accept <quote> XML
                                            var quoted = '';
                                            try {
                                                var mm = txt.match(/<textarea[^>]*name=["']?message["']?[^>]*>([\s\S]*?)<\/textarea>/i);
                                                if (mm && mm[1]) quoted = mm[1];
                                                else {
                                                    var q = txt.match(/<quote>([\s\S]*?)<\/quote>/i);
                                                    if (q && q[1]) quoted = q[1];
                                                }
                                            } catch (e) { quoted = ''; }

                                            if (quoted) {
                                                gotIntercept = true;
                                                try {
                                                    var decoded = decodeHtmlEntities(quoted);
                                                    console.log('[BT-INJECT] captured via getXMLDocument, decoded length', decoded.length);
                                                    dispatchQuoteOnce(decoded);
                                                } catch (e) { console.log('[BT-INJECT] getXMLDocument wrapped callback error', e); }
                                            }
                                        }
                                    } catch (e) { }
                                    try { if (typeof callback === 'function') callback.apply(this, arguments); } catch (e) { }
                                };
                                return origGetXMLDocument.call(this, url, wrappedCallback);
                            } catch (e) {
                                return origGetXMLDocument.apply(this, arguments);
                            }
                        };
                        try { window.getXMLDocument = patchedGetXMLDocument; console.log('[BT-INJECT] getXMLDocument monkey-patched'); } catch (e) { }
                    } else {
                        console.log('[BT-INJECT] getXMLDocument not found');
                    }

                    // Also keep the onDocReceived wrapper as a fallback
                    var origOnDoc = window.onDocReceived;
                    var wrapped = function (doc) {
                        try {
                            var txt = '';
                            try {
                                if (doc && typeof doc === 'object') {
                                    if (doc.responseText) txt = doc.responseText;
                                    else try { txt = (new XMLSerializer()).serializeToString(doc); } catch (e) { txt = '' + doc; }
                                } else txt = '' + doc;
                            } catch (e) { txt = '' + doc; }

                            if (txt) {
                                try { console.log('[BT-INJECT] onDocReceived response preview', txt.slice(0, 300)); } catch (e) { }
                            }
                            if (txt) {
                                try {
                                    var quoted = '';
                                    var mm = txt.match(/<textarea[^>]*name=["']?message["']?[^>]*>([\s\S]*?)<\/textarea>/i);
                                    if (mm && mm[1]) quoted = mm[1];
                                    else {
                                        var q = txt.match(/<quote>([\s\S]*?)<\/quote>/i);
                                        if (q && q[1]) quoted = q[1];
                                    }
                                    if (quoted) {
                                        var decoded = decodeHtmlEntities(quoted);
                                        console.log('[BT-INJECT] captured via onDocReceived, decoded length', decoded.length);
                                        dispatchQuoteOnce(decoded);
                                    }
                                } catch (e) { console.log('[BT-INJECT] wrapped onDoc parsing error', e); }
                            }
                        } catch (e) { }

                        try { if (typeof origOnDoc === 'function') origOnDoc.apply(this, arguments); } catch (e) { }
                        // restore
                        try { window.onDocReceived = origOnDoc; } catch (e) { }
                    };
                    try { window.onDocReceived = wrapped; } catch (e) { }

                    if (typeof window.insertQuoteFast === 'function') {
                        try {
                            window.insertQuoteFast(mId);
                        } catch (e) {
                            try { el.onclick && el.onclick(); } catch (e2) { }
                        }
                    } else {
                        try { el.onclick && el.onclick(); } catch (e) { }
                    }

                    // restore getXMLDocument after a short delay if we monkey-patched it
                    setTimeout(function () {
                        try {
                            if (patchedGetXMLDocument && window.getXMLDocument === patchedGetXMLDocument) {
                                window.getXMLDocument = origGetXMLDocument;
                                console.log('[BT-INJECT] restored original getXMLDocument');
                            }
                        } catch (e) { }
                    }, 2000);
                } catch (e) { console.log('[BT-INJECT] error invoking insertQuote', e); cancel(); }

                // ensure interceptors are removed after timeout
                setTimeout(function () { try { cancel(); } catch (e) { } }, 5200);
            })();
        } catch (e) { }
    }, true);
})();
