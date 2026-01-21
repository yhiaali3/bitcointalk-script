// canonical single-copy content.js, duplicates removed
// js/content.js
// Combined content script: early-inject (prevents FOUC) + Bitcointalk extension logic.
// Make sure this file path matches manifest and that css/bitcointalk/custom.css exists in your extension.

(function earlyInject() {
    try {
        // Apply only for top frame
        if (window !== window.top) return;

        // Prevent double injection
        if (window.__bitcointalk_early_injected) return;
        window.__bitcointalk_early_injected = true;
        const MAX_HIDE_TIMEOUT = 3000; // ms - Adjustable
        const TEST_VAR_NAME = '--bt-inject-test';
        const extensionCssPath = chrome.runtime.getURL('css/bitcointalk/default.css');

        // Hide document immediately to prevent FOUC
        const prevVisibility = (document.documentElement && document.documentElement.style) ? document.documentElement.style.visibility : '';
        try { if (document.documentElement) document.documentElement.style.visibility = 'hidden'; } catch (e) { /* ignore */ }

        let revealed = false;
        function revealDocument() {
            if (revealed) return;
            revealed = true;
            try { if (document.documentElement) document.documentElement.style.visibility = prevVisibility || ''; } catch (e) { /* ignore */ }
        }

        // Utility: insert a <style> with cssText and test if it applied (via custom property)
        function insertStyleAndTest(cssText) {
            return new Promise(resolve => {
                try {
                    const style = document.createElement('style');
                    style.setAttribute('data-bt-early', '1');
                    const testCss = `:root { ${TEST_VAR_NAME}: injected; }`;
                    style.textContent = cssText + '\n' + testCss;
                    (document.head || document.documentElement).appendChild(style);

                    requestAnimationFrame(() => {
                        try {
                            const val = getComputedStyle(document.documentElement).getPropertyValue(TEST_VAR_NAME).trim();
                            const applied = (val === 'injected');
                            resolve({ applied, style });
                        } catch (err) {
                            resolve({ applied: false, style });
                        }
                    });
                } catch (err) {
                    resolve({ applied: false, style: null });
                }
            });
        }

        // Utility: try blob fallback (create blob URL and attach link)
        function tryBlobLink(cssText) {
            return new Promise(resolve => {
                try {
                    const blob = new Blob([cssText], { type: 'text/css' });
                    const blobUrl = URL.createObjectURL(blob);
                    const linkBlob = document.createElement('link');
                    linkBlob.rel = 'stylesheet';
                    linkBlob.href = blobUrl;

                    const cleanup = (success) => {
                        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
                        resolve(success);
                    };

                    linkBlob.onload = function () { cleanup(true); };
                    linkBlob.onerror = function () { cleanup(false); };

                    (document.head || document.documentElement).appendChild(linkBlob);

                    setTimeout(() => cleanup(false), 2000);
                } catch (err) {
                    resolve(false);
                }
            });
        }

        // Main flow with fallbacks
        const overallTimeout = setTimeout(() => {
            console.warn('early-inject: overall timeout, revealing document');
            revealDocument();
        }, MAX_HIDE_TIMEOUT);

        // First attempt: try loading chrome-extension:// link (fastest)
        const primaryLink = document.createElement('link');
        primaryLink.rel = 'stylesheet';
        primaryLink.href = extensionCssPath;

        let handled = false;

        primaryLink.onload = function () {
            if (handled) return;
            handled = true;
            clearTimeout(overallTimeout);
            console.info('early-inject: extension link loaded');
            revealDocument();
        };

        primaryLink.onerror = async function () {
            if (handled) return;
            handled = true;
            console.warn('early-inject: extension link failed — attempting inline fetch + test');
            try {
                // fetch CSS content from extension resource
                const resp = await fetch(extensionCssPath);
                if (!resp.ok) throw new Error('fetch failed ' + resp.status);
                const cssText = await resp.text();

                // Try inline <style> first
                const { applied, style } = await insertStyleAndTest(cssText);
                if (applied) {
                    clearTimeout(overallTimeout);
                    console.info('early-inject: inline style applied successfully');
                    revealDocument();
                    return;
                } else {
                    try { if (style && style.parentNode) style.parentNode.removeChild(style); } catch (e) { /* ignore */ }
                    console.warn('early-inject: inline style did not take effect (likely CSP). Trying blob fallback.');
                }

                // Try blob link fallback (may bypass chrome-extension: scheme but can still be blocked by CSP)
                const blobSuccess = await tryBlobLink(cssText);
                if (blobSuccess) {
                    clearTimeout(overallTimeout);
                    console.info('early-inject: blob stylesheet applied successfully');
                    revealDocument();
                    return;
                } else {
                    console.warn('early-inject: blob fallback failed or was blocked by CSP');
                }
            } catch (err) {
                console.warn('early-inject: fetch/inline/blob fallback failed', err);
            } finally {
                clearTimeout(overallTimeout);
                revealDocument();
            }
        };

        (document.head || document.getElementsByTagName('head')[0] || document.documentElement).appendChild(primaryLink);

        document.addEventListener('DOMContentLoaded', () => { if (!revealed) { clearTimeout(overallTimeout); revealDocument(); } }, { once: true });
        window.addEventListener('load', () => { if (!revealed) { clearTimeout(overallTimeout); revealDocument(); } }, { once: true });

    } catch (err) {
        console.error('early-inject error', err);
        try { if (document && document.documentElement) document.documentElement.style.visibility = ''; } catch (e) { /* ignore */ }
    }
})();

// Add enable/disable buttons for Quill above original textarea and persist state
(function quillToggleUI() {
    function createButtons() {
        try {
            const textarea = document.querySelector('textarea[name="message"]');
            if (!textarea) return;
            if (document.getElementById('bt-quill-toggle')) return; // already created

            const container = document.createElement('div');
            container.id = 'bt-quill-toggle';
            container.style.display = 'flex';
            container.style.gap = '8px';
            container.style.alignItems = 'center';
            container.style.marginBottom = '6px';

            const btnEnable = document.createElement('button');
            btnEnable.id = 'bt-quill-enable';
            btnEnable.textContent = 'Enable Editor';
            btnEnable.style.cursor = 'pointer';

            const btnDisable = document.createElement('button');
            btnDisable.id = 'bt-quill-disable';
            btnDisable.textContent = 'Disable Editor';
            btnDisable.style.cursor = 'pointer';

            container.appendChild(btnEnable);
            container.appendChild(btnDisable);

            textarea.parentNode.insertBefore(container, textarea);

            function updateButtons(state) {
                try {
                    if (state) {
                        btnEnable.disabled = true;
                        btnDisable.disabled = false;
                    } else {
                        btnEnable.disabled = false;
                        btnDisable.disabled = true;
                    }
                } catch (e) { }
            }

            btnEnable.addEventListener('click', function (event) {
                if (event) {
                    event.preventDefault();
                    event.stopPropagation();
                }
                try {
                    // set without callback to avoid running code inside storage callback (context may be invalidated)
                    chrome.storage.local.set({ quillEnabled: true });
                } catch (e) {
                    // ignore storage errors
                }
                // Clean textarea value before initializing editor to avoid accumulated blank lines
                try {
                    const ta = document.querySelector('textarea[name="message"]');
                    if (ta && typeof ta.value === 'string') {
                        let v = ta.value.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
                        v = v.replace(/\n{3,}/g, '\n\n');
                        v = v.replace(/\]\s*\n+\s*(?=\[)/g, ']\n');
                        v = v.replace(/^\n+/, '');
                        v = v.replace(/\n+$/, '');
                        ta.value = v;
                    }
                } catch (e) { }
                // call init immediately (with retries) so UI responds even if storage callback won't run
                (function callInit(retries) {
                    try {
                        if (window.initQuillEditor) return void window.initQuillEditor();
                    } catch (e) { }
                    if (retries > 0) setTimeout(function () { callInit(retries - 1); }, 200);
                })(10);
                updateButtons(true);
            });

            btnDisable.addEventListener('click', function (event) {
                if (event) {
                    event.preventDefault();
                    event.stopPropagation();
                }
                try {
                    const ta = document.querySelector('textarea[name="message"]');
                    console.log('BT DEBUG: textarea value on disable:', ta ? ta.value : '(no textarea)');
                } catch (e) { }
                try {
                    chrome.storage.local.set({ quillEnabled: false });
                } catch (e) { }
                try { if (window.destroyQuillEditor) window.destroyQuillEditor(); } catch (e) { }
                updateButtons(false);
            });

            // Debug button removed in this build

            // initialize state from storage
            chrome.storage.local.get('quillEnabled', function (res) {
                const enabled = !!(res && res.quillEnabled);
                updateButtons(enabled);
                if (enabled) {
                    // If quill assets are not yet injected, retry until available
                    (function callInit(retries) {
                        try {
                            if (window.initQuillEditor) return void window.initQuillEditor();
                        } catch (e) { }
                        if (retries > 0) setTimeout(function () { callInit(retries - 1); }, 200);
                    })(10);
                } else {
                    try { if (window.destroyQuillEditor) window.destroyQuillEditor(); } catch (e) { }
                }
            });
        } catch (err) {
            console.warn('quillToggleUI error', err);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createButtons, { once: true });
    } else {
        // small timeout to allow other scripts to run first
        setTimeout(createButtons, 50);
    }
})();

// background.js crypto prices getter
// moved to content.js because of Chrome manifest v3 restrictions

let prices = {
    btc: 0,
    eth: 0
};

// Inject a small page-context script to intercept "Insert Quote" clicks
// and fetch the server-populated textarea; then dispatch a custom event
// carrying the decoded quote text to the content script.
try {
    function injectPageInterceptor() {
        try {
            var script = document.createElement('script');
            script.setAttribute('data-bt-inject', 'insert-quote-interceptor');
            try {
                script.src = chrome.runtime.getURL('js/page-inject.js');
            } catch (e) {
                // fallback: attempt to use relative path if runtime API not available in this context
                script.src = '/chrome-extension/' + 'js/page-inject.js';
            }
            (document.head || document.documentElement).appendChild(script);
            setTimeout(function () { try { script.parentNode && script.parentNode.removeChild(script); } catch (e) { } }, 10000);
        } catch (e) { }
    }

    // Install handler in content script context to receive quote texts
    try {
        var pendingQuotes = [];
        window.addEventListener('bt-quote-text', function (ev) {
            try {
                var txt = ev && ev.detail && ev.detail.text ? ev.detail.text : '';
                console.log('[BT] bt-quote-text received, length', txt ? txt.length : 0);
                if (!txt) return;

                // dedupe received quotes (protect against multiple dispatch sources)
                if (!window.__bt_receivedQuotes) window.__bt_receivedQuotes = new Map();
                try {
                    var __bt_now = Date.now();
                    // purge old entries >10s
                    for (var k of Array.from(window.__bt_receivedQuotes.keys())) { if (__bt_now - window.__bt_receivedQuotes.get(k) > 10000) window.__bt_receivedQuotes.delete(k); }
                    var __bt_key = (txt ? txt.length : 0) + '|' + (txt ? txt.slice(0, 120) : '');
                    if (window.__bt_receivedQuotes.has(__bt_key)) { console.log('[BT] duplicate quote suppressed'); return; }
                    window.__bt_receivedQuotes.set(__bt_key, __bt_now);
                } catch (e) { }
                // Try inserting into Quill if available, otherwise queue
                try {
                    var q = window.__bt_quill_instance;
                    if (q) {
                        var range = q.getSelection() || { index: q.getLength() };
                        try { q.insertText(range.index, txt, 'user'); console.log('[BT] inserted into Quill at', range.index); } catch (ie) { q.insertText(q.getLength(), txt); console.log('[BT] inserted into Quill at end'); }
                        try { q.setSelection((range.index || 0) + (txt.length || 0), 0); q.focus(); } catch (se) { q.focus(); }
                        return;
                    }
                } catch (e) { console.log('[BT] error inserting into Quill', e); }
                console.log('[BT] Quill not ready, queueing quote');
                // avoid queuing exact duplicates
                try {
                    if (pendingQuotes.indexOf(txt) === -1) pendingQuotes.push(txt);
                } catch (e) { pendingQuotes.push(txt); }
            } catch (e) { console.log('[BT] bt-quote-text handler error', e); }
        }, false);

        // If Quill later initializes, flush pending quotes
        (function flushPending() {
            try {
                var q = window.__bt_quill_instance;
                if (q && pendingQuotes.length) {
                    console.log('[BT] flushing', pendingQuotes.length, 'pending quotes into Quill');
                    // insert and avoid duplicates by tracking insertion keys locally
                    var inserted = new Set();
                    pendingQuotes.forEach(function (txt) {
                        try {
                            var key = (txt ? txt.length : 0) + '|' + (txt ? txt.slice(0, 120) : '');
                            if (inserted.has(key)) return;
                            var range = q.getSelection() || { index: q.getLength() };
                            q.insertText(range.index, txt, 'user');
                            inserted.add(key);
                        } catch (e) { try { q.insertText(q.getLength(), txt); } catch (er) { } }
                    });
                    pendingQuotes = [];
                }
            } catch (e) { }
            setTimeout(flushPending, 500);
        })();

        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectPageInterceptor, { once: true }); else injectPageInterceptor();
    } catch (e) { }
} catch (e) { }

let ws = null;

// Function to connect to the WebSocket
function connectWebSocket() {
    try {
        ws = new WebSocket("wss://push.coinmarketcap.com/ws?device=web&client_source=home_page");

        ws.onopen = function () {
            console.log("WebSocket connection established.");
            // Subscribe to the price updates
            const subscribeMessage = {
                "method": "RSUBSCRIPTION",
                "params": ["main-site@crypto_price_5s@{}@normal", "1,1027"]
            };
            ws.send(JSON.stringify(subscribeMessage));
        };

        // Handle incoming WebSocket messages
        ws.onmessage = function (event) {
            try {
                const data = JSON.parse(event.data);

                if (data.d) {
                    if (data.d.id === 1) { // BTC price update
                        prices.btc = data.d.p;
                    } else if (data.d.id === 1027) { // ETH price update
                        prices.eth = data.d.p;
                    }
                }
            } catch (err) {
                console.error("Error parsing WebSocket message:", err);
            }
        };

        ws.onerror = function (error) {
            console.error("WebSocket Error:", error);
        };

        ws.onclose = function (event) {
            console.warn("WebSocket connection closed:", event.code, event.reason);
        };

    } catch (error) {
        console.error("Couldn't connect to CMC WebSocket:", error);
        attemptReconnect();
    }
}

// Reconnect WebSocket if disconnected
function attemptReconnect() {
    console.log("Attempting to reconnect to WebSocket...");
    setTimeout(() => {
        connectWebSocket();
    }, 5000);
}

// Disconnect WebSocket
function disconnect() {
    if (ws) {
        ws.close();
        ws = null;
    }
}

// Fetch prices (called from Bitcointalk.updatePrices)
function fetchPrices() {
    if (!ws) {
        connectWebSocket();
    }
    return { success: true, prices: { btc: prices.btc, eth: prices.eth }, source: "coinmarketcap.com" }
}

/* =========================
   Existing Bitcointalk code (kept, initialization deferred until DOM ready)
   ========================= */

const Bitcointalk = {
    init: function (key, value, event) {
        this.setStorage(key, value);
        switch (key) {
            case "signature":
                this.toggleSignature(value);
                break;
            case "avatar":
                this.toggleAvatar(value);
                break;
            case "theme":
                this.toggleTheme(value);
                break;
            case "price":
                this.displayBitcoinPrice(value);
                break;
            case "zoom":
                this.zoomFontSize(value, event);
                break;
            case "pins":
                this.pinsPost(value);
                break;
            case "direction":
                this.toggleDirection(value);
                break;
        }
    },
    setStorage: function (key, value) {
        chrome.storage.local.get('bitcointalk', function (storage) {
            let newStorage = {};
            if (storage && typeof storage === 'object' && storage.bitcointalk) {
                newStorage = storage.bitcointalk;
            }
            newStorage[key] = value;
            chrome.storage.local.set({ 'bitcointalk': newStorage });
        });
    },
    getAnStorage: function (key, callback) {
        chrome.storage.local.get('bitcointalk', function (storage) {
            const out = storage && storage.bitcointalk && storage.bitcointalk[key] !== undefined ? storage.bitcointalk[key] : [];
            callback(out);
        });
    },
    clearStorege: function () {
        chrome.storage.local.clear(function () {
            console.log("cleared");
        });
    },
    httpGet: function (theUrl, callback) {
        fetch(theUrl).then(response => response.text()).then(html => {
            callback(html);
        });
    },
    externalLink: function () {
        let externalLink = document.getElementsByTagName("a");
        for (let i = 0; i < externalLink.length; i++) {
            if (!externalLink[i].href.includes("https://bitcointalk.org") && externalLink[i].href.includes("http")) {
                externalLink[i].setAttribute('target', "_blank");
            }
        }
    },
    toggleTheme: function (value) {
        // Remove previously injected theme styles and any existing theme classes
        try {
            const prev = document.querySelectorAll('.bitcointalk-css-inject');
            prev.forEach(el => { try { el.remove(); } catch (e) { /* ignore */ } });
            document.querySelectorAll('link[data-extension-theme], style[data-extension-theme]').forEach(el => { try { el.remove(); } catch (e) { /* ignore */ } });
            if (document && document.documentElement) {
                const clsList = Array.from(document.documentElement.classList).filter(c => c.indexOf('bt-theme-') === 0);
                clsList.forEach(c => document.documentElement.classList.remove(c));
            }
        } catch (e) { /* ignore if DOM not ready */ }

        // if 'on' => default, do nothing further
        if (value === 'on') return;

        // colorblind-safe theme support
        if (value === 'colorblind-safe') {
            const className = 'bt-theme-colorblind-safe';
            const fileName = 'colorblind-safe.css';
            const urlCss = chrome.runtime.getURL(`css/bitcointalk/${fileName}`);
            console.info('toggleTheme: loading colorblind-safe theme', { fileName, urlCss });
            fetch(urlCss).then(response => {
                if (!response.ok) throw new Error('HTTP ' + response.status + ' ' + response.statusText);
                return response.text();
            }).then(css => {
                try {
                    const scoped = Bitcointalk.scopeCss(css, `html.${className}`);
                    const style = document.createElement('style');
                    style.className = 'bitcointalk-css-inject';
                    style.setAttribute('data-extension-theme', 'bitcointalk');
                    style.textContent = scoped;
                    const head = document.querySelector('head') || document.head || document.documentElement;
                    head.appendChild(style);
                    if (document && document.documentElement) document.documentElement.classList.add(className);
                } catch (err) {
                    console.warn('toggleTheme: error scoping/injecting colorblind-safe css', err);
                }
            }).catch(err => {
                console.warn('toggleTheme: failed to fetch colorblind-safe css', err);
            });
            return;
        }

        // apply numeric theme id (1,2,3,4) — map to filenames matching popup labels
        if (!isNaN(parseInt(value))) {
            const themeId = String(value);
            const className = `bt-theme-${themeId}`;
            const themeMap = { '1': 'dark1.css', '2': 'dark2.css', '3': 'dark3.css', '4': 'bitcoin.css' };
            const fileName = themeMap[themeId] || `${themeId}.css`;
            const urlCss = chrome.runtime.getURL(`css/bitcointalk/${fileName}`);
            console.info('toggleTheme: loading theme', { themeId, fileName, urlCss });
            fetch(urlCss).then(response => {
                if (!response.ok) throw new Error('HTTP ' + response.status + ' ' + response.statusText);
                return response.text();
            }).then(css => {
                try {
                    const scoped = Bitcointalk.scopeCss(css, `html.${className}`);
                    const style = document.createElement('style');
                    style.className = 'bitcointalk-css-inject';
                    style.setAttribute('data-extension-theme', 'bitcointalk');
                    style.textContent = scoped;
                    const head = document.querySelector('head') || document.head || document.documentElement;
                    head.appendChild(style);
                    if (document && document.documentElement) document.documentElement.classList.add(className);
                } catch (err) {
                    console.warn('toggleTheme: error scoping/injecting css', err);
                }
            }).catch(err => {
                console.warn('toggleTheme: failed to fetch theme css', err);
            });
        }
    },

    // Scope plain CSS text by prefixing all selectors with `scope` (e.g. "html.bt-theme-1").
    // Handles top-level rules and @media/@supports blocks. Leaves @keyframes and similar untouched.
    scopeCss: function (cssText, scope) {
        let i = 0;
        const len = cssText.length;
        let out = '';

        function skipWS() { while (i < len && /\s/.test(cssText[i])) i++; }

        function readUntil(ch) { let s = i; while (i < len && cssText[i] !== ch) i++; return cssText.slice(s, i); }

        function process() {
            skipWS();
            if (i >= len) return;
            if (cssText[i] === '@') {
                const atStart = i;
                const header = readUntil('{');
                if (i >= len) { out += cssText.slice(atStart); return; }
                out += header + '{';
                i++; // skip '{'
                let depth = 1; const innerStart = i;
                while (i < len && depth > 0) { if (cssText[i] === '{') depth++; else if (cssText[i] === '}') depth--; i++; }
                const inner = cssText.slice(innerStart, i - 1);
                if (/^@media|@supports|@document/.test(header.trim())) out += this.scopeCss(inner, scope);
                else out += inner;
                out += '}';
            } else {
                const selStart = i;
                const selectors = readUntil('{');
                if (i >= len) { out += cssText.slice(selStart); return; }
                i++; // skip '{'
                const bodyStart = i; let depth = 1;
                while (i < len && depth > 0) { if (cssText[i] === '{') depth++; else if (cssText[i] === '}') depth--; i++; }
                const body = cssText.slice(bodyStart, i - 1);
                const pref = selectors.split(',').map(s => {
                    const t = s.trim(); if (!t) return ''; if (/^from$|^to$|^[0-9.]+%$/.test(t)) return t; if (t.indexOf(scope) !== -1) return t; return scope + ' ' + t;
                }).filter(Boolean).join(', ');
                out += pref + ' {' + body + '}';
            }
        }

        while (i < len) process.call(this);
        return out;
    },
    toggleSignature: function (value) {
        let signature = document.getElementsByClassName("signature");
        for (let i = 0; i < signature.length; i++) {
            signature[i].style.display = (value === "on" ? "none" : "block");
        }
    },
    toggleAvatar: function (value) {
        let img = document.getElementsByTagName("img");
        for (let i = 0; i < img.length; i++) {
            if (img[i].src.includes('useravatars')) {
                img[i].style.display = (value === "on" ? "none" : "block");
            }
        }
    },
    zoomFontSize: function (value, event) {
        if (event === 0) {
            if (!isNaN(parseInt(value))) {
                let newFontSize = parseInt(value);
                this.setStorage('zoom', newFontSize);
                document.body.style.zoom = newFontSize + "%";
                if (document.documentElement) document.documentElement.style.zoom = newFontSize + "%";
            } else {
                let newFontSize = !isNaN(parseInt(document.body.style.zoom)) ? parseInt(document.body.style.zoom) : 100;
                if (value === "plus") {
                    newFontSize += 5;
                } else if (value === "minus") {
                    newFontSize -= 5;
                } else {
                    newFontSize = 100;
                }
                this.setStorage('zoom', newFontSize);
                document.body.style.zoom = newFontSize + "%";
                if (document.documentElement) document.documentElement.style.zoom = newFontSize + "%";
            }
        } else {
            const applyZoom = (res) => {
                let parsed = !isNaN(parseInt(res)) ? parseInt(res) : null;
                if (parsed === null && !isNaN(parseInt(value))) {
                    parsed = parseInt(value);
                }
                let finalZoom = parsed !== null ? parsed : 100;
                document.body.style.zoom = finalZoom + "%";
                if (document.documentElement) document.documentElement.style.zoom = finalZoom + "%";
            };

            if (!isNaN(parseInt(value))) {
                applyZoom(value);
            } else {
                this.getAnStorage('zoom', function (res) {
                    applyZoom(res);
                });
            }
        }
    },
    toggleMerit: function () {
        if (window.location.href.includes("https://bitcointalk.org/index.php?topic=")) {
            let sesc = document.querySelectorAll("td.maintab_back a[href*='index.php?action=logout;']");
            if (sesc.length === 0) {
                return;
            }
            sesc = /;sesc=(.*)/.exec(sesc[0].getAttribute("href"))[1];

            let merit = document.querySelectorAll("td.td_headerandpost div[id^=ignmsgbttns] a[href*='index.php?action=merit;msg=']");
            if (merit.length === 0) {
                return;
            }

            let sMerit = 0, totalMerit = 0;
            this.httpGet(merit[0].getAttribute('href'), html => {
                sMerit = /You have <b>([0-9]+)<\/b> sendable/.exec(html)[1];
                totalMerit = /You have received a total of <b>([0-9]+)<\/b> merit./.exec(html)[1];

                for (let i = 0; i < merit.length; i++) {
                    let msgId = /msg=([0-9]+)/.exec(merit[i].href)[1];

                    merit[i].setAttribute('data-href', merit[i].getAttribute('href'));
                    merit[i].setAttribute('href', "javascript:void(0)");

                    merit[i].getElementsByTagName("span")[0].setAttribute("class", "openMerit");
                    merit[i].getElementsByTagName("span")[0].setAttribute("id", "open" + msgId);

                    merit[i].getElementsByTagName("span")[0].addEventListener("click", function (e) {
                        e.preventDefault();
                        nodeForm.querySelectorAll("div[class^=result]")[0].style.display = "none";
                        if (document.getElementById('merit' + msgId).style.display === "block") {
                            document.getElementById('merit' + msgId).style.display = "none";
                        } else {
                            document.getElementById('merit' + msgId).style.display = "block";
                        }
                    });

                    let nodeForm = document.createElement('tr');
                    nodeForm.innerHTML = [
                        '<td colspan="3" align="right">',
                        `<div id="${'merit' + msgId}" style="display: none; margin-top: 5px; padding: 3px;">`,
                        '<form>',
                        '<div class="form">',
                        '<div>',
                        `Total merit: <b>${totalMerit}</b> / sMerit: <b>${sMerit}</b> `,
                        '</div>',
                        '<div style="margin-bottom: 6px;">',
                        'Merit points: <input size="6" name="merits" step="1" value="0" type="number" autocomplete="off"/>',
                        '</div>',
                        '<div style="margin-bottom: 6px;">',
                        '<input style="margin-right: 5px" class="sendButton" value="Send" type="submit">',
                        '<button type="button">Close</button>',
                        '</div>',
                        '</div>',
                        '<div class="result" style="display: none">',
                        '</div>',
                        '<div class="loading" style="display: none">',
                        '<span>Loading...</span>',
                        '</div>',
                        '</form>',
                        '</div>',
                        '</td>'
                    ].join("");
                    merit[i].parentNode.parentNode.parentNode.parentNode.appendChild(nodeForm);

                    nodeForm.getElementsByTagName('form')[0].addEventListener("submit", function (e) {
                        e.preventDefault();
                        nodeForm.querySelectorAll("div[class^=form]")[0].style.display = "none";
                        nodeForm.querySelectorAll("div[class^=result]")[0].style.display = "none";
                        nodeForm.querySelectorAll("div[class^=loading]")[0].style.display = "block";

                        let xhttp = new XMLHttpRequest();
                        xhttp.onreadystatechange = function () {
                            if (this.readyState === 4 && this.status === 200) {
                                let msgResult = "Error, please check again.";
                                let responseResult = this.response.match(/<tr class="windowbg">(.*?)<\/tr>/s);
                                if (responseResult !== null && responseResult[1] !== undefined) {
                                    msgResult = responseResult[1].replace(/<(.|\n|\s|\r)*?>/g, '').trim();
                                }
                                nodeForm.querySelectorAll("div[class^=form]")[0].style.display = "block";
                                nodeForm.querySelectorAll("div[class^=result]")[0].style.display = "block";
                                nodeForm.querySelectorAll("div[class^=loading]")[0].style.display = "none";

                                if (this.response.includes("<title>An Error Has Occurred!</title>")) {
                                    nodeForm.querySelectorAll("div[class^=result]")[0].innerHTML = "<span>" + msgResult + "</span>";
                                } else if (this.response.includes("#msg" + msgId)) {
                                    nodeForm.querySelectorAll("div[class^=result]")[0].innerHTML = "<span>Merit added.</span>";
                                    let url = new URL(window.location);
                                    let topicId = url.searchParams.get("topic");
                                    topicId = (topicId.includes(".") ? topicId.split(".")[0] : topicId);
                                    window.location.href = `https://bitcointalk.org/index.php?topic=${topicId}.msg${msgId}#msg${msgId}`;
                                } else {
                                    nodeForm.querySelectorAll("div[class^=result]")[0].innerHTML = "<span>Server response indeterminate.</span>";
                                }
                            }
                        };
                        xhttp.open("POST", "https://bitcointalk.org/index.php?action=merit", true);
                        xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
                        xhttp.send("msgID=" + msgId + "&sc=" + sesc + "&merits=" + e.target.elements["merits"].value);
                    });
                    nodeForm.getElementsByTagName("button")[0].addEventListener("click", function () {
                        document.getElementById('merit' + msgId).style.display = "none";
                        nodeForm.querySelectorAll("div[class^=result]")[0].style.display = "none";
                    });
                }
            });
        }
    },
    displayPostPins: function (currentListPost) {
        let postsPinnedOld = document.getElementsByClassName("postsPinned");
        if (postsPinnedOld.length > 0) {
            postsPinnedOld[0].remove();
        }
        if (!currentListPost || (Array.isArray(currentListPost) && currentListPost.length === 0)) {
            return;
        }
        let minusIcon = chrome.runtime.getURL(`icons/minus.png`);
        let listPostsHtml = [];
        for (let i = 0; i < currentListPost.length; i++) {
            let msgId = (currentListPost[i].url.includes("#msg") ? currentListPost[i].url.split("#")[1] : '');

            listPostsHtml.push([
                '<tr>',
                '<td class="windowbg" valign="middle">',
                '<b><a href="' + currentListPost[i].url + '">' + currentListPost[i].title + '</a></b>',
                msgId !== '' ? "#" + msgId : '',
                '</td>',
                '<td class="windowbg">',
                msgId !== '' ? 'Comment in post' : 'Post',
                '</td>',
                '<td class="windowbg removePostPins" style="cursor:pointer;display: flex;align-items: center" valign="middle" data-url="' + currentListPost[i].url + '">',
                '<img src="' + minusIcon + '" height="16" width="16" alt="minus-icon"/>',
                '<a style="margin-left: 5px;" href="javascript:void(0)">Remove</a>',
                '</td>',
                '</tr>'
            ].join(""));
        }

        let bodyarea = document.getElementById("bodyarea");
        let postsPinned = document.createElement("div");

        postsPinned.className = "postsPinned";
        postsPinned.innerHTML = `<div class="tborder">
                                        <table border="0" width="100%" cellspacing="1" cellpadding="4" class="bordercolor">
                                            <tbody>
                                                <tr> <td class="catbg">Posts and comment pinned</td> <td class="catbg">Type</td> <td class="catbg">Action</td> </tr>
                                                ${listPostsHtml.join("")}
                                                <tr>
                                                    <td class="windowbg">Total: ${listPostsHtml.length} post & comment</td>
                                                    <td class="windowbg"></td>
                                                    <td class="windowbg removeAllPostPins" style="cursor:pointer;display: flex;align-items: center" >
                                                        <img src="${minusIcon}" height="16" width="16" alt="minus-icon"/>
                                                        <a style="margin-left: 5px;" href="javascript:void(0)"> Remove All </a>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                     </div>`;
        if (bodyarea) {
            bodyarea.insertBefore(postsPinned, bodyarea.firstChild);
        }

        let removePostPinsSpan = postsPinned.getElementsByTagName("td");
        for (let i = 0; i < removePostPinsSpan.length; i++) {
            if (removePostPinsSpan[i].className.includes("removePostPins")) {
                removePostPinsSpan[i].addEventListener("click", () => {
                    this.removePostPins(removePostPinsSpan[i].getAttribute("data-url"));
                })
            }
            if (removePostPinsSpan[i].className.includes("removeAllPostPins")) {
                removePostPinsSpan[i].addEventListener("click", () => {
                    this.setStorage('list-post', []);
                    setTimeout(() => {
                        this.pinsPost("on");
                    }, 100);
                })
            }
        }
    },
    removePostPins: function (url) {
        this.getAnStorage('list-post', (listPost) => {
            listPost = Array.isArray(listPost) ? listPost : [];
            let flagExist = 0;
            for (let i = 0; i < listPost.length; i++) {
                if (listPost[i].url === url) {
                    flagExist = 1;
                    listPost.splice(i, 1);
                }
            }
            this.setStorage('list-post', listPost);
            setTimeout(() => {
                this.pinsPost("on");
            }, 100);
        });
    },
    pinsPost: async function (value) {
        let pinsPostSpan = document.querySelectorAll("span[class=pins-post]");
        for (let i = 0; i < pinsPostSpan.length; i++) {
            pinsPostSpan[i].remove();
        }
        if (value === "off") {
            if (document.getElementsByClassName("postsPinned").length > 0) {
                document.getElementsByClassName("postsPinned")[0].remove();
            }
            return;
        }

        let plusIcon = chrome.runtime.getURL(`icons/plus.png`);
        let minusIcon = chrome.runtime.getURL(`icons/minus.png`);

        let postElement = document.querySelectorAll("td[class=windowbg][valign=middle], td[valign=middle] div[class=subject]");

        await this.getAnStorage('list-post', (currentListPost) => {
            currentListPost = Array.isArray(currentListPost) ? currentListPost : [];

            this.displayPostPins(currentListPost);

            for (let i = 0; i < postElement.length; i++) {
                if (postElement[i].innerHTML.includes("https://bitcointalk.org/index.php?topic=")) {

                    let title = postElement[i].getElementsByTagName("a")[0].innerHTML.replace(/<(.|\n|\s|\r)*?>/g, '').trim();
                    let url = postElement[i].getElementsByTagName("a")[0].href;

                    let spanNode = document.createElement("span");
                    spanNode.className = "pins-post";
                    spanNode.style.marginLeft = "10px";
                    spanNode.style.cursor = "pointer";
                    spanNode.innerHTML = `<img data-url="${url}" src="${plusIcon}" height="16" width="16" alt="plus-icon"/>`;

                    for (let k = 0; k < currentListPost.length; k++) {
                        if (currentListPost[k].url === url) {
                            spanNode.innerHTML = `<img data-url="${url}" src="${minusIcon}" height="16" width="16" alt="minus-icon"/>`;
                            break;
                        }
                    }
                    postElement[i].appendChild(spanNode);

                    spanNode.addEventListener("click", async () => {
                        let listPost = [];
                        this.getAnStorage('list-post', (res) => {
                            listPost = Array.isArray(res) && res.length > 0 ? res : listPost;

                            let flagExist = 0;
                            for (let j = 0; j < listPost.length; j++) {
                                if (listPost[j].url === url) {
                                    flagExist = 1;
                                    listPost.splice(j, 1);
                                    break;
                                }
                            }
                            if (flagExist === 0) {
                                listPost.push({
                                    title: title,
                                    url: url
                                });
                                spanNode.innerHTML = `<img data-url="${url}" src="${minusIcon}" height="16" width="16" alt="minus-icon"/>`;
                            } else {
                                spanNode.innerHTML = `<img data-url="${url}" src="${plusIcon}" height="16" width="16" alt="plus-icon"/>`;
                            }
                            this.setStorage('list-post', listPost);
                            this.displayPostPins(listPost);
                        });
                    })
                }
            }
        });
    },
    scrollToTop: function () {
        let toTop = chrome.runtime.getURL(`icons/to-top.png`);
        let divNode = document.createElement("div");
        let dialogPrice = document.getElementsByClassName("dialog-price");
        divNode.style = "display: none;position: fixed;bottom: 20px;right: 30px;z-index: 99;cursor: pointer;padding: 15px;border-radius: 4px;";
        divNode.innerHTML = `<img src="${toTop}" alt="to-top" height="36"/>`;
        const footer = document.getElementById('footerarea');
        if (footer) footer.appendChild(divNode);

        window.onscroll = function () {
            if (document.body.scrollTop > 200 || document.documentElement.scrollTop > 200) {
                divNode.style.display = "block";
                if (dialogPrice.length > 0) dialogPrice[0].style.display = "block";
            } else {
                divNode.style.display = "none";
                if (dialogPrice.length > 0) dialogPrice[0].style.display = "none";
            }
        };
        divNode.addEventListener("click", () => {
            document.body.scrollTop = 0;
            document.documentElement.scrollTop = 0;
        });
    },
    sumMerit: function () {
        [...document.querySelectorAll(".td_headerandpost")].forEach(post => {
            try {
                let sum = [...post.querySelectorAll(".smalltext i > a")]
                    .map(e => {
                        return parseInt(e.nextSibling.textContent.match(/\((.*)\)/)[1])
                    })
                    .reduce((acc, e) => acc + e, 0)
                if (sum > 0) {
                    let sumElement = document.createElement("span")
                    sumElement.style["font-weight"] = "bold";
                    sumElement.textContent = `Total merit: ${sum} | `
                    post.querySelector(".smalltext i").prepend(sumElement)
                }
            } catch (e) {
                console.error(e)
            }
        })
    },
    highlightMyNameInMerit: function () {
        [...document.querySelectorAll(".td_headerandpost")].forEach(post => {
            const nameNode = document.querySelector("#hellomember b");
            if (!nameNode) return;
            let myName = nameNode.textContent;
            let allMerits = [...post.querySelectorAll(".smalltext i > a")];
            let myMerit = allMerits.find(e => e.textContent === myName);
            if (myMerit) {
                myMerit.style["font-weight"] = "bold";
                if (allMerits.indexOf(myMerit) !== 0) {
                    let myScore = myMerit.nextSibling;
                    const container = post.querySelector(".smalltext i");
                    if (!container) return;
                    container.removeChild(myMerit);
                    container.removeChild(myScore);
                    allMerits[0].before(myScore);
                    myScore.after(document.createTextNode(", "));
                    myScore.before(myMerit)
                }
            }
        })
    },
    enhancedReportToModeratorUI: function () {
        if (document.location.href.match(/https:\/\/bitcointalk.org\/index.php\?action=profile;(.*?)sa=showPosts/s)) {
            let buttons = document.querySelectorAll("span.middletext");
            let flagIcon = chrome.runtime.getURL(`icons/flag.png`);

            [...document.querySelectorAll("td.middletext a:last-of-type")].forEach((post, i) => {
                let a = document.createElement("a");
                a.setAttribute("href", post.getAttribute("href").replace("index.php?", "index.php?action=reporttm;").replace(".msg", ";msg="));
                a.innerHTML = `<img src="${flagIcon}" alt="Reply" align="middle"> <b>Report to moderator</b>`;
                if (buttons[i + 1]) {
                    buttons[i + 1].prepend(a);
                }
            });
        }
    },
    displayBitcoinPrice: function (value) {
        try {
            const header = document.querySelectorAll("td.catbg")[1]; // Or adjust to your specific page structure
            if (!header) return;

            if (value === "on") {
                this.updatePricesInterval = setInterval(() => {
                    this.updatePrices(header);
                }, 3000);
            } else if (value === "off") {
                clearInterval(this.updatePricesInterval);
                if (header) header.innerHTML = `<img src="https://bitcointalk.org/Themes/custom1/images/smflogo.gif" style="margin: 2px;" alt="">`;
                disconnect();
            }
        } catch (e) {
            console.error('displayBitcoinPrice error', e);
        }
    },

    updatePrices: function (container) {
        try {
            const response = fetchPrices();
            if (response && response.success) {
                const btcPrice = Number(response.prices.btc || 0).toLocaleString();
                const ethPrice = Number(response.prices.eth || 0).toLocaleString();

                const html = [`$${btcPrice}/BTC`, ` | `, `$${ethPrice}/ETH`].join('');
                container.innerHTML = html;
            } else {
                container.innerHTML = "Can't fetch prices.";
                throw new Error(response && response.error ? response.error : 'Unknown error');
            }
        } catch (error) {
            console.error('Error fetching crypto prices:', error);
            if (container) container.textContent = '⚠️ Prices unavailable. May be blocked in your region.';
        }
    },

    // New: toggle page direction (rtl / ltr)
    toggleDirection: function (value) {
        try {
            if (value === 'rtl') {
                if (document.documentElement) document.documentElement.setAttribute('dir', 'rtl');
                if (document.body) document.body.style.direction = 'rtl';
            } else if (value === 'ltr') {
                if (document.documentElement) document.documentElement.setAttribute('dir', 'ltr');
                if (document.body) document.body.style.direction = 'ltr';
            } else {
                if (document.documentElement) document.documentElement.removeAttribute('dir');
                if (document.body) document.body.style.direction = '';
            }
        } catch (e) {
            console.error('toggleDirection error', e);
        }
    },

    // Utility methods: isLoggedIn, addBoardNavigation, format_counters
    isLoggedIn: function () {
        return document.querySelectorAll("td.maintab_back").length >= 1;
    },

    addBoardNavigation: function () {
        try {
            const url = window.location.href;
            if (!url.includes("?board=")) return;
            const board = url.replace(/(\.\d+)$/, '');

            document.querySelectorAll('td.middletext').forEach(function (td) {
                const bElements = td.querySelectorAll('b');
                bElements.forEach((element) => {
                    if (element.innerHTML && element.innerHTML.includes("...")) {
                        const input = document.createElement('input');
                        input.type = 'number';
                        input.min = 1;
                        input.placeholder = 'Go';
                        input.style.width = '40px';
                        input.style.fontSize = '11px';

                        element.innerHTML = '';
                        element.appendChild(input);

                        input.addEventListener('keydown', function (event) {
                            if (event.key === 'Enter') {
                                const pageNum = parseInt(input.value, 10);
                                if (Number.isInteger(pageNum) && pageNum > 0) {
                                    const threadCount = 40;
                                    const offset = (pageNum - 1) * threadCount;
                                    window.location.href = `${board}.${offset}`;
                                } else {
                                    alert('Please enter a valid page number.');
                                }
                            }
                        });
                    }
                });
            });
        } catch (e) {
            console.error('addBoardNavigation error', e);
        }
    },

    format_counters: function () {
        try {
            function format_number(number) {
                const n = typeof number === 'number' ? number : parseInt(number, 10);
                if (!Number.isFinite(n)) return number;
                return new Intl.NumberFormat('en').format(n);
            }

            document.querySelectorAll('td.windowbg[valign="middle"]').forEach(function (td) {
                if (td.innerHTML && (td.innerHTML.includes('Posts') || td.innerHTML.includes('Topics'))) {
                    td.innerHTML = td.innerHTML.replace(/\d+/g, (match) => format_number(match));
                }
            });
        } catch (e) {
            console.error('format_counters error', e);
        }
    },
    // Quick Quote: replaced with updated implementation from attachment
    initQuickQuote: function () {
        (function () {
            'use strict';

            if (window.__bt_quick_quote_injected) return;
            window.__bt_quick_quote_injected = true;

            const btn = document.createElement('button');
            btn.textContent = '❝ Copy Quote';
            btn.style.position = 'fixed';
            btn.style.display = 'none';
            btn.style.zIndex = '9999';
            btn.style.padding = '5px 10px';
            btn.style.backgroundColor = '#e7eaef';
            btn.style.border = '1px solid #000';
            btn.style.borderRadius = '3px';
            btn.style.cursor = 'pointer';
            btn.style.fontSize = '11px';
            btn.style.fontWeight = 'bold';
            btn.style.boxShadow = '2px 2px 5px rgba(0,0,0,0.2)';
            document.body.appendChild(btn);

            function hideButton() { btn.style.display = 'none'; }

            function showButtonNearRange(range) {
                if (!range) return hideButton();
                const rects = range.getClientRects();
                const r = rects && rects.length ? rects[0] : range.getBoundingClientRect();
                if (!r || (r.width === 0 && r.height === 0)) return hideButton();

                // Make it visible first so we can measure its size
                btn.style.display = 'block';
                btn.style.visibility = 'hidden';

                // position relative to viewport (fixed)
                let top = Math.round(r.bottom + 5);
                let left = Math.round(r.left);

                // measure button and clamp within viewport
                const btnRect = btn.getBoundingClientRect();
                const btnH = btnRect.height || 28;
                const btnW = btnRect.width || 120;

                if (top + btnH > window.innerHeight - 5) {
                    top = Math.round(r.top - btnH - 5);
                }
                if (left + btnW > window.innerWidth - 5) {
                    left = Math.max(5, window.innerWidth - btnW - 5);
                }
                if (left < 5) left = 5;
                if (top < 5) top = 5;

                btn.style.top = `${top}px`;
                btn.style.left = `${left}px`;
                btn.style.visibility = 'visible';
            }

            // show button on mouseup (mouse selection) and on selectionchange (keyboard selection)
            document.addEventListener('mouseup', function () {
                const selection = window.getSelection();
                const selectedText = selection.toString().trim();
                if (selectedText.length < 1) { hideButton(); return; }
                let node = selection.anchorNode;
                if (node && node.nodeType === 3) node = node.parentNode;
                if (!node) { hideButton(); return; }
                const postDiv = node.closest('div.post');
                if (!postDiv) { hideButton(); return; }
                try {
                    const range = selection.getRangeAt(0);
                    showButtonNearRange(range);
                    btn.onclick = function () { processQuote(postDiv, selectedText); };
                } catch (e) { hideButton(); }
            });

            document.addEventListener('selectionchange', function () {
                try {
                    const selection = window.getSelection();
                    if (!selection || selection.isCollapsed) { hideButton(); return; }
                    const selectedText = selection.toString().trim();
                    if (selectedText.length < 1) { hideButton(); return; }
                    let node = selection.anchorNode;
                    if (node && node.nodeType === 3) node = node.parentNode;
                    if (!node) { hideButton(); return; }
                    const postDiv = node.closest('div.post');
                    if (!postDiv) { hideButton(); return; }
                    const range = selection.getRangeAt(0);
                    showButtonNearRange(range);
                    btn.onclick = function () { processQuote(postDiv, selectedText); };
                } catch (e) { /* ignore */ }
            });

            document.addEventListener('mousedown', function (e) { if (!btn.contains(e.target)) hideButton(); });

            function safeEncode(str) { return encodeURIComponent(str).replace(/'/g, '%27'); }

            function generateTextFragment(text) {
                const cleanText = text.replace(/\s+/g, ' ');
                const words = cleanText.split(' ');
                if (words.length <= 8) return safeEncode(cleanText);
                const textStart = words.slice(0, 4).join(' ');
                const textEnd = words.slice(-4).join(' ');
                return `${safeEncode(textStart)},${safeEncode(textEnd)}`;
            }

            function getFormattedDateString() {
                const date = new Date();
                const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
            }

            function fallbackCopy(text) {
                const ta = document.createElement('textarea');
                ta.value = text;
                ta.style.position = 'fixed'; ta.style.left = '-9999px';
                document.body.appendChild(ta); ta.select();
                try { return document.execCommand('copy'); } catch (e) { return false; } finally { try { ta.remove(); } catch (e) { } }
            }

            async function writeClipboard(text) {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    try { await navigator.clipboard.writeText(text); return true; } catch (e) { }
                }
                return fallbackCopy(text);
            }

            function processQuote(postDiv, selectedText) {
                try {
                    const contentTd = postDiv.closest('td.td_headerandpost');
                    if (!contentTd) throw new Error('Could not find post');

                    let authorName = 'Unknown';
                    const authorTd = contentTd.previousElementSibling;
                    if (authorTd && authorTd.classList && authorTd.classList.contains('poster_info')) {
                        const aElement = authorTd.querySelector('b > a');
                        if (aElement) authorName = aElement.textContent.trim();
                    }

                    let permalink = '';
                    const subjectDiv = contentTd.querySelector('div.subject');
                    if (subjectDiv) {
                        const linkElem = subjectDiv.querySelector('a'); if (linkElem) permalink = linkElem.href;
                    }
                    if (!permalink) {
                        const anchorLink = contentTd.querySelector('a[href*="#msg"]'); if (anchorLink) permalink = anchorLink.href;
                    }
                    if (permalink) {
                        const parts = permalink.split('#'); let cleanBase = parts[0].split(';')[0]; if (parts[1]) permalink = cleanBase + '#' + parts[1];
                    }

                    let rawDate = '';
                    if (subjectDiv && subjectDiv.parentElement) {
                        const smallTextDiv = subjectDiv.parentElement.querySelector('.smalltext'); if (smallTextDiv) rawDate = smallTextDiv.textContent.trim();
                    }
                    if (rawDate.startsWith('Today')) rawDate = rawDate.replace('Today', getFormattedDateString()).replace(' at ', ', ');

                    const fragment = generateTextFragment(selectedText);
                    const dateStr = rawDate || 'Unknown Date';
                    const authorStr = authorName || 'Unknown Author';

                    const finalUrl = `${permalink}#:~:text=${fragment}`;
                    const quoteHeader = `[url=${finalUrl}]${authorStr} on ${dateStr}[/url]`;
                    const bbcode = `[quote="${quoteHeader}"]\n${selectedText}\n[/quote]`;

                    writeClipboard(bbcode).then(success => {
                        const originalText = btn.textContent;
                        if (success) {
                            btn.textContent = 'Copied!'; btn.style.backgroundColor = '#dff0d8'; btn.style.color = '#3c763d';
                            setTimeout(() => { btn.textContent = originalText; btn.style.backgroundColor = '#e7eaef'; btn.style.color = '#000'; hideButton(); }, 1000);
                        } else {
                            btn.textContent = 'Error'; btn.style.backgroundColor = '#f2dede'; setTimeout(hideButton, 1000);
                        }
                    });
                } catch (err) {
                    console.error('Quote Error:', err);
                    btn.textContent = 'Error'; btn.style.backgroundColor = '#f2dede'; setTimeout(hideButton, 1000);
                }
            }

        })();
    },

    // end of Bitcointalk object
};

// Listener from popup.js
chrome.runtime.onMessage.addListener(
    function (message) {
        if (message && message.type === 'emoji-toolbar-toggle') {
            // emoji toolbar is handled by emoji-toolbar.js
        } else if (message && message.type === 'emoticon-replacer-toggle') {
            // emoticon replacer handled if included separately
        } else if (message && message.type === 'extension-reset-theme') {
            // remove any injected theme styles and classes
            try {
                document.querySelectorAll('.bitcointalk-css-inject').forEach(el => { try { el.remove(); } catch (e) { /* ignore */ } });
                document.querySelectorAll('link[data-extension-theme], style[data-extension-theme]').forEach(el => { try { el.remove(); } catch (e) { /* ignore */ } });
                if (document && document.documentElement) {
                    const clsList = Array.from(document.documentElement.classList).filter(c => c.indexOf('bt-theme-') === 0);
                    clsList.forEach(c => document.documentElement.classList.remove(c));
                }
            } catch (e) { /* ignore */ }
        } else if (message && message.key) {
            Bitcointalk.init(message.key, message.value, 0);
        } else if (message && message.type === 'toggle-quill-editor') {
            // Activate or disable the Quill editor according to the message.
            if (typeof window.initQuillEditor === 'function' && typeof window.destroyQuillEditor === 'function') {
                if (message.enabled) {
                    window.initQuillEditor();
                } else {
                    window.destroyQuillEditor();
                }
            }
        } else if (message && message.type === 'extension-apply-custom') {
            try {
                if (message.css) {
                    applyCustomCss(message.css);
                } else {
                    // fallback: read stored customCss
                    chrome.storage.local.get('customCss', (d) => { if (d && d.customCss) applyCustomCss(d.customCss); });
                }
            } catch (e) { /* ignore */ }
        }
    }
);

// Defer DOM-dependent initialization until DOM is ready
(function runWhenReady() {
    function doInit() {
        // Fetch bitcointalk settings plus any stored default/custom theme so
        // we can prefer default/custom over a numeric bitcointalk.theme value.
        chrome.storage.local.get(['bitcointalk', 'defaultTheme', 'customCss', 'themes'], function (storage) {
            try {
                Bitcointalk.externalLink();
                Bitcointalk.scrollToTop();
                Bitcointalk.sumMerit();
                Bitcointalk.enhancedReportToModeratorUI();
                Bitcointalk.toggleMerit();
                Bitcointalk.addBoardNavigation();
                Bitcointalk.format_counters();

                if (Bitcointalk.isLoggedIn()) {
                    Bitcointalk.highlightMyNameInMerit();
                }

                try {
                    if (typeof Bitcointalk.initQuickQuote === 'function') {
                        Bitcointalk.initQuickQuote();
                    }
                } catch (e) {
                    console.error('initQuickQuote error', e);
                }

                const bt = storage && storage.bitcointalk ? storage.bitcointalk : {};
                const hasDefaultOrCustom = !!(storage && (storage.defaultTheme || storage.customCss));
                // Apply stored zoom immediately so it's not accidentally overridden
                // by theme injection or later initialization steps.
                if (bt && bt.zoom !== undefined) {
                    try {
                        Bitcointalk.init('zoom', bt.zoom, 1);
                    } catch (e) { console.warn('Bitcointalk zoom init failed', e); }
                }
                if (bt && Object.keys(bt).length > 0) {
                    Object.keys(bt).forEach(function (key) {
                        // If a default theme or customCss exists, do not apply the numeric
                        // `bitcointalk.theme` value since that would override the user's
                        // chosen default/custom theme immediately after applying it.
                        // Also skip 'zoom' because it's already applied above.
                        if ((key === 'theme' && hasDefaultOrCustom) || key === 'zoom') return;
                        Bitcointalk.init(key, bt[key], 1);
                    });
                }
            } catch (e) {
                console.error('Bitcointalk init error', e);
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', doInit, { once: true });
    } else {
        doInit();
    }
})();
// Apply custom CSS if available + live update when changed
function applyCustomCss(cssCode) {
    // remove any previous custom theme class/styles
    try {
        document.querySelectorAll('style.bitcointalk-custom-theme, style[data-extension-theme="bitcointalk-custom"]').forEach(el => { try { el.remove(); } catch (e) { } });
        if (document && document.documentElement) document.documentElement.classList.remove('bt-custom');
    } catch (e) { /* ignore */ }

    if (!cssCode) return;

    // scope custom CSS under html.bt-custom to avoid leaking to other themes
    try {
        const scope = 'html.bt-custom';
        const scopedCss = (typeof Bitcointalk !== 'undefined' && typeof Bitcointalk.scopeCss === 'function') ? Bitcointalk.scopeCss(cssCode, scope) : cssCode;
        const styleEl = document.createElement('style');
        styleEl.className = 'bitcointalk-custom-theme';
        styleEl.setAttribute('data-extension-theme', 'bitcointalk-custom');
        styleEl.textContent = scopedCss;
        (document.head || document.documentElement).appendChild(styleEl);
        if (document && document.documentElement) document.documentElement.classList.add('bt-custom');
    } catch (e) {
        // fallback: inject raw css (less safe)
        try {
            const styleEl = document.createElement('style');
            styleEl.className = 'bitcointalk-custom-theme';
            styleEl.setAttribute('data-extension-theme', 'bitcointalk-custom');
            styleEl.textContent = cssCode;
            (document.head || document.documentElement).appendChild(styleEl);
        } catch (e2) { /* ignore */ }
    }
}

// Load default theme or last applied CSS
chrome.storage.local.get(['customCss', 'defaultTheme', 'themes'], (data) => {
    if (data.defaultTheme && data.themes && data.themes[data.defaultTheme]) {
        applyCustomCss(data.themes[data.defaultTheme]);
        chrome.storage.local.set({ customCss: data.themes[data.defaultTheme] });
    } else if (data.customCss) {
        applyCustomCss(data.customCss);
    }
});

// Listen for changes from popup
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.customCss) {
        applyCustomCss(changes.customCss.newValue);
    }
});

// Inject local Quill assets (quill.snow.css, quill.min.js) and initialize editor
(function injectQuillAssets() {
    if (window.__bt_quill_injected) return;
    window.__bt_quill_injected = true;

    const cssUrl = chrome.runtime.getURL('css/quill.snow.css');
    const quillJsUrl = chrome.runtime.getURL('js/quill.min.js');
    const initUrl = chrome.runtime.getURL('js/quill-editor.js');

    function doInject() {
        try {
            // inject stylesheet
            try {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = cssUrl;
                (document.head || document.documentElement).appendChild(link);
            } catch (e) { /* ignore */ }

            // inject quill script
            const s = document.createElement('script');
            s.src = quillJsUrl;
            s.async = false;
            s.onload = function () {
                try {
                    // inject initializer
                    const s2 = document.createElement('script');
                    s2.src = initUrl;
                    s2.async = false;
                    s2.onload = function () {
                      try {
                        const ta = document.querySelector('textarea[name="message"]');
                        if (!ta) return;

                        chrome.storage.local.get('quillEnabled', (res) => {
                          const enabled = !!(res && res.quillEnabled);
                          if (enabled && typeof window.initQuillEditor === 'function') {
                            window.initQuillEditor();
                          } else {
                            // make sure we don't accidentally show it
                            if (typeof window.destroyQuillEditor === 'function') window.destroyQuillEditor();
                          }
                        });
                      } catch (e) { }
                    };

                    (document.documentElement || document.head || document.body).appendChild(s2);
                } catch (e) { console.warn('quill init inject failed', e); }
            };
            s.onerror = function (e) { console.warn('quill script failed to load', e); };
            (document.documentElement || document.head || document.body).appendChild(s);
        } catch (err) {
            console.warn('injectQuillAssets error', err);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', doInject, { once: true });
    } else {
        doInject();
    }
})();
