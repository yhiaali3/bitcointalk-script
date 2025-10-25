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
            if (typeof Object.keys(storage) !== 'undefined' && Object.keys(storage).length > 0) {
                newStorage = storage.bitcointalk;
            }
            newStorage[key] = value;
            chrome.storage.local.set({ 'bitcointalk': newStorage });
        });
    },
    getAnStorage: function (key, callback) {
        chrome.storage.local.get('bitcointalk', function (storage) {
            callback(storage.bitcointalk && storage.bitcointalk[key] !== undefined ? storage.bitcointalk[key] : {});
        });
    },
    clearStorege: function () {
        chrome.storage.local.clear(function (obj) {
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
        let styleOld = document.getElementsByClassName("bitcointalk-css-inject");
        if (styleOld.length > 0) {
            styleOld[0].remove();
        }
        if (value !== "on" && !isNaN(parseInt(value))) {
            let urlCss = chrome.runtime.getURL(`css/bitcointalk/${value}.css`);
            fetch(urlCss).then(response => response.text()).then(css => {
                let style = document.createElement("style");
                let head = document.querySelector("head") || document.head || document.documentElement;
                style.className = "bitcointalk-css-inject";
                style.innerHTML = css;
                head.appendChild(style);
            });
        }
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
        // event === 0 -> change requested from popup (click/slider)
        // event !== 0 -> init/load from storage (page load)
        if (event === 0) {
            // If value is numeric (from slider), set directly
            if (!isNaN(parseInt(value))) {
                let newFontSize = parseInt(value);
                this.setStorage('zoom', newFontSize);
                document.body.style.zoom = newFontSize + "%";
                if (document.documentElement) document.documentElement.style.zoom = newFontSize + "%";
            } else {
                // fallback to original plus/minus/on behavior
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
            // On page load: prefer using the value passed (if numeric), otherwise read from storage.
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
            let sesc = document.querySelectorAll("td.maintab_back a[href*='index.php?action=logout;' ");
            if (sesc.length === 0) {
                return;
            }
            sesc = /;sesc=(.*)/.exec(sesc[0].getAttribute("href"))[1];

            let merit = document.querySelectorAll("td.td_headerandpost div[id^=ignmsgbttns] a[href*='index.php?action=merit;msg='");
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
                        nodeForm.querySelectorAll("div[class^=result]"
                    }
                    .... 
                }
            });
        }
    },
    displayPostPins: function (currentListPost) {
        // function code ...
    },
    removePostPins: function (url) {
        // function code ...
    },
    pinsPost: async function (value) {
        // function code ...
    },
    scrollToTop: function () {
        // function code ...
    },
    sumMerit: function () {
        // function code ...
    },
    highlightMyNameInMerit: function () {
        // function code ...
    },
    enhancedReportToModeratorUI: function () {
        // function code ...
    }
};