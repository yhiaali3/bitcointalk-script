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

    const MAX_HIDE_TIMEOUT = 3000; // ms - قابل للتعديل
    const TEST_VAR_NAME = '--bt-inject-test';
    const extensionCssPath = chrome.runtime.getURL('css/bitcointalk/custom.css');

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
            let sesc = document.querySelectorAll("td.maintab_back a[href*='index.php?action=logout;'");
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
        if (typeof Object.keys(currentListPost) !== 'undefined' && Object.keys(currentListPost).length === 0) {
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
        bodyarea.insertBefore(postsPinned, bodyarea.firstChild);

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

                    for (let i = 0; i < currentListPost.length; i++) {
                        if (currentListPost[i].url === url) {
                            spanNode.innerHTML = `<img data-url="${url}" src="${minusIcon}" height="16" width="16" alt="minus-icon"/>`;
                        }
                    }
                    postElement[i].appendChild(spanNode);

                    spanNode.addEventListener("click", async () => {
                        let listPost = [];
                        this.getAnStorage('list-post', (res) => {
                            listPost = res.length > 0 ? res : listPost;

                            let flagExist = 0;
                            for (let i = 0; i < listPost.length; i++) {
                                if (listPost[i].url === url) {
                                    flagExist = 1;
                                    listPost.splice(i, 1);
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
        document.getElementById('footerarea').appendChild(divNode);

        window.onscroll = function () {
            if (document.body.scrollTop > 200 || document.documentElement.scrollTop > 200) {
                divNode.style.display = "block";
                if (dialogPrice.length > 0) dialogPrice[0].style.display = "block";
            } else {
                divNode.style.display = "none";
                if (dialogPrice.length > 0) dialogPrice[0].style.display = "none";
            }
        };
        divNode.getElementsByTagName("img")[0].addEventListener("click", () => {
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
            let myName = document.querySelector("#hellomember b").textContent;
            let allMerits = [...post.querySelectorAll(".smalltext i > a")];
            let myMerit = allMerits.find(e => e.textContent === myName);
            if (myMerit) {
                myMerit.style["font-weight"] = "bold";
                if (allMerits.indexOf(myMerit) !== 0) {
                    let myScore = myMerit.nextSibling;
                    post.querySelector(".smalltext i").removeChild(myMerit);
                    post.querySelector(".smalltext i").removeChild(myScore);
                    allMerits[0].before(myScore);
                    if (allMerits.length > 0)
                        myScore.after(document.createElement("div").innerHTML = ", ");
                    myScore.before(myMerit)
                }
            }
        })
    },
    enhancedReportToModeratorUI: function () {
        if (document.location.href.match(/https:\/\/bitcointalk.org\/index.php\?action=profile;(.*?)sa=showPosts/s)) {
            let button = document.querySelectorAll("span[class=middletext]");
            let flagIcon = chrome.runtime.getURL(`icons/flag.png`);

            [...document.querySelectorAll("td[class=middletext] a:last-of-type")].forEach((post, i) => {
                let a = document.createElement("a");
                a.setAttribute("href", post.getAttribute("href").replace("index.php?", "index.php?action=reporttm;").replace(".msg", ";msg="));
                a.innerHTML = `<img src="${flagIcon}" alt="Reply" align="middle"> <b>Report to moderator</b>`;
                button[(i + 1)].prepend(a);
            });
        }
    },
    displayBitcoinPrice: function (value) {
        let header = document.querySelectorAll("td.catbg")[1];
        if (value === "on") {
            this.getAnStorage("storagePrice", storagePrice => {
                let dialogPriceNode = document.createElement("div");
                dialogPriceNode.style = "display: none;position: fixed;top: 0;right: 0;z-index: 100;padding: 10px;border-radius:50px;margin: 5px 5px 0px 0px;";
                dialogPriceNode.setAttribute("class", "dialog-price catbg");

                if (storagePrice && Object.keys(storagePrice).length > 0 && (storagePrice.timestamp + 600) > Math.floor(Date.now() / 1000)) {
                    header.innerHTML = storagePrice.html;
                    dialogPriceNode.innerHTML = storagePrice.html;
                    document.getElementsByClassName('tborder')[0].appendChild(dialogPriceNode);
                } else {
                    this.httpGet("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd", response => {
                        let price = JSON.parse(response);
                        if (price.bitcoin && price.ethereum) {
                            let html = [
                                `$${price.bitcoin.usd.toLocaleString()}/BTC`,
                                ` | `,
                                `$${price.ethereum.usd.toLocaleString()}/ETH`
                            ].join("");
                            header.innerHTML = html;
                            dialogPriceNode.innerHTML = html;
                            document.getElementsByClassName('tborder')[0].appendChild(dialogPriceNode);
                            this.setStorage('storagePrice', {
                                'html': html,
                                'timestamp': Math.floor(Date.now() / 1000)
                            });
                        } else {
                            header.innerHTML = "Can't get the price of Bitcoin";
                        }
                    });
                }
            });
        } else {
            let dialogPrice = document.getElementsByClassName("dialog-price");
            if (dialogPrice.length > 0) dialogPrice[0].remove();
        }
    },
    // New: toggle page direction (rtl / ltr)
    toggleDirection: function (value) {
        // value expected 'rtl' or 'ltr'
        try {
            if (value === 'rtl') {
                if (document.documentElement) document.documentElement.setAttribute('dir', 'rtl');
                if (document.body) document.body.style.direction = 'rtl';
            } else if (value === 'ltr') {
                if (document.documentElement) document.documentElement.setAttribute('dir', 'ltr');
                if (document.body) document.body.style.direction = 'ltr';
            } else {
                // if something else, reset to default (ltr)
                if (document.documentElement) document.documentElement.removeAttribute('dir');
                if (document.body) document.body.style.direction = '';
            }
        } catch (e) {
            console.error('toggleDirection error', e);
        }
    },

    isLoggedIn: function () {
        return [...document.querySelectorAll("td.maintab_back")].length === 8; // count how many tabs there is, to determine if user is logged in.
    },

    // Quick Quote feature integrated (updated positioning & robustness)
    initQuickQuote: function () {
        (function () {
            'use strict';

            // Prevent double-injection if content script runs multiple times
            if (window.__bitcointalkCopyQuoteInjected) return;
            window.__bitcointalkCopyQuoteInjected = true;

            // Inject minimal CSS to style the button
            const style = document.createElement('style');
            style.textContent = `
                .__cq-btn {
                    position: absolute;
                    display: none;
                    z-index: 2147483647;
                    background: #e7eaef;
                    color: #000;
                    border: 1px solid rgba(0,0,0,0.1);
                    padding: 6px 10px;
                    border-radius: 4px;
                    box-shadow: 2px 2px 6px rgba(0,0,0,0.12);
                    cursor: pointer;
                    font-size: 12px;
                    font-weight: 700;
                    user-select: none;
                    -webkit-user-select: none;
                    transition: transform .12s ease, opacity .12s ease;
                }
                .__cq-btn.__cq-hidden { opacity: 0; transform: scale(0.98); pointer-events: none; }
            `;
            document.head.appendChild(style);

            const btn = document.createElement('button');
            btn.className = '__cq-btn __cq-hidden';
            btn.type = 'button';
            btn.setAttribute('aria-hidden', 'true');
            btn.textContent = '❝ Copy Quote';
            document.body.appendChild(btn);

            function debounce(fn, wait = 30) {
                let t;
                return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), wait); };
            }

            function hideButton() {
                btn.style.display = 'none';
                btn.classList.add('__cq-hidden');
                btn.setAttribute('aria-hidden', 'true');
            }

            function showButton() {
                btn.style.display = 'block';
                btn.classList.remove('__cq-hidden');
                btn.setAttribute('aria-hidden', 'false');
            }

            function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

            // Calculate and set the button position relative to the selection
            function updateButtonPositionForSelection(selection) {
                if (!selection || selection.isCollapsed) { hideButton(); return; }
                let range;
                try {
                    range = selection.getRangeAt(0);
                } catch (e) {
                    hideButton(); return;
                }

                const rects = range.getClientRects();
                let rect = (rects && rects.length) ? rects[rects.length - 1] : range.getBoundingClientRect();
                if (!rect || (rect.width === 0 && rect.height === 0)) { hideButton(); return; }

                const scrollX = window.scrollX || window.pageXOffset || 0;
                const scrollY = window.scrollY || window.pageYOffset || 0;
                const gap = 8;
                let left = rect.left + scrollX;
                let top = rect.bottom + scrollY + gap;

                // Temporarily ensure button is displayed to measure it
                const prevDisplay = btn.style.display;
                btn.style.left = '0px';
                btn.style.top = '0px';
                btn.style.display = 'block';
                const btnBox = btn.getBoundingClientRect();
                btn.style.display = prevDisplay || (btn.classList.contains('__cq-hidden') ? 'none' : 'block');

                const vw = document.documentElement.clientWidth;
                const vh = document.documentElement.clientHeight;

                // Clamp horizontally within viewport (with small margin)
                left = clamp(left, scrollX + 8, scrollX + vw - btnBox.width - 8);

                // If not enough space below, place above selection
                if (top + btnBox.height > scrollY + vh - 8) {
                    top = rect.top + scrollY - btnBox.height - gap;
                }

                // Ensure button stays within document bounds
                top = Math.max(scrollY + 8, Math.min(top, scrollY + document.documentElement.scrollHeight - btnBox.height - 8));

                btn.style.left = `${Math.round(left)}px`;
                btn.style.top = `${Math.round(top)}px`;

                showButton();
            }

            // Clipboard helpers with fallback
            function fallbackCopyTextToClipboard(text) {
                const textArea = document.createElement("textarea");
                textArea.value = text;
                textArea.style.position = "fixed";
                textArea.style.top = 0;
                textArea.style.left = 0;
                textArea.style.width = "2em";
                textArea.style.height = "2em";
                textArea.style.padding = 0;
                textArea.style.border = "none";
                textArea.style.outline = "none";
                textArea.style.boxShadow = "none";
                textArea.style.background = "transparent";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();

                try {
                    const successful = document.execCommand('copy');
                    document.body.removeChild(textArea);
                    return successful;
                } catch (err) {
                    document.body.removeChild(textArea);
                    return false;
                }
            }

            async function copyToClipboard(text) {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    try {
                        await navigator.clipboard.writeText(text);
                        return true;
                    } catch (e) {
                        // fallback below
                    }
                }
                return fallbackCopyTextToClipboard(text);
            }

            // Build a safe text fragment for URL fragment (approximation)
            function safeEncode(str) {
                return encodeURIComponent(str).replace(/'/g, '%27');
            }
            function generateTextFragment(text) {
                const cleanText = text.replace(/\s+/g, ' ').trim();
                const words = cleanText.split(' ').filter(Boolean);
                if (words.length <= 8) {
                    return safeEncode(cleanText);
                }
                const textStart = words.slice(0, 4).join(' ');
                const textEnd = words.slice(-4).join(' ');
                return `${safeEncode(textStart)},${safeEncode(textEnd)}`;
            }

            function getFormattedDateString() {
                const date = new Date();
                const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                const month = months[date.getMonth()];
                const day = date.getDate();
                const year = date.getFullYear();
                return `${month} ${day}, ${year}`;
            }

            // Process selected text into BBCode quote and copy
            function processQuote(postDiv, selectedText) {
                try {
                    let contentTd = postDiv.closest('td.td_headerandpost') || postDiv.querySelector('td.td_headerandpost') || (postDiv.classList.contains('td_headerandpost') ? postDiv : null);
                    if (!contentTd) {
                        contentTd = postDiv.closest('td');
                    }
                    if (!contentTd) throw new Error("Could not find post container");

                    const authorTd = contentTd.previousElementSibling;
                    let authorName = "Unknown";
                    if (authorTd && authorTd.classList && authorTd.classList.contains('poster_info')) {
                        const bElement = authorTd.querySelector('b');
                        if (bElement) authorName = bElement.textContent.trim();
                    } else {
                        const possibleName = contentTd.querySelector('.username, .poster_info b, .poster > b');
                        if (possibleName) authorName = possibleName.textContent.trim();
                    }

                    let permalink = "";
                    const subjectDiv = contentTd.querySelector('div.subject');
                    if (subjectDiv) {
                        const linkElem = subjectDiv.querySelector('a');
                        if (linkElem) permalink = linkElem.href;
                    }
                    if (!permalink) {
                        const anchorLink = contentTd.querySelector('a[href*="#msg"]');
                        if (anchorLink) permalink = anchorLink.href;
                    }
                    if (permalink) {
                        const parts = permalink.split('#');
                        let cleanBase = parts[0].split(';')[0];
                        if (parts[1]) permalink = cleanBase + '#' + parts[1];
                    }

                    let rawDate = "";
                    if (subjectDiv && subjectDiv.parentElement) {
                        const smallTextDiv = subjectDiv.parentElement.querySelector('.smalltext');
                        if (smallTextDiv) rawDate = smallTextDiv.textContent.trim();
                    }
                    if (rawDate && rawDate.startsWith("Today")) {
                        const fullDate = getFormattedDateString();
                        rawDate = rawDate.replace("Today", fullDate).replace(" at ", ", ");
                    }

                    const fragment = generateTextFragment(selectedText);
                    const dateStr = rawDate || "Unknown Date";
                    const authorStr = authorName || "Unknown Author";

                    const finalUrl = permalink ? `${permalink}#:~:text=${fragment}` : `#:~:text=${fragment}`;
                    const quoteHeader = `[url=${finalUrl}]${authorStr} on ${dateStr}[/url]`;
                    const bbcode = `[quote="${quoteHeader}"]\n${selectedText}\n[/quote]`;

                    copyToClipboard(bbcode).then(success => {
                        const originalText = btn.textContent;
                        if (success) {
                            btn.textContent = "Copied!";
                            btn.style.backgroundColor = "#dff0d8";
                            btn.style.color = "#3c763d";
                            setTimeout(() => {
                                btn.textContent = originalText;
                                btn.style.backgroundColor = "#e7eaef";
                                btn.style.color = "#000";
                                hideButton();
                            }, 1000);
                        } else {
                            btn.textContent = "Copy failed";
                            btn.style.backgroundColor = "#f2dede";
                            setTimeout(() => {
                                btn.textContent = originalText;
                                btn.style.backgroundColor = "#e7eaef";
                                btn.style.color = "#000";
                                hideButton();
                            }, 1500);
                        }
                    });

                } catch (err) {
                    console.error("Quote Error:", err);
                    btn.textContent = "Error";
                    btn.style.backgroundColor = "#f2dede";
                    setTimeout(hideButton, 1500);
                }
            }

            // Show button on selection (mouseup) if selection inside a post
            document.addEventListener('mouseup', function (e) {
                const selection = window.getSelection();
                const selectedText = selection.toString().trim();

                if (selectedText.length < 1) {
                    hideButton();
                    return;
                }

                let node = selection.anchorNode;
                if (!node) {
                    hideButton();
                    return;
                }
                if (node.nodeType === 3) node = node.parentNode;

                const postDiv = node.closest('div.post') || node.closest('td.td_headerandpost');

                if (!postDiv) {
                    hideButton();
                    return;
                }

                try {
                    updateButtonPositionForSelection(selection);
                } catch (err) {
                    hideButton();
                    return;
                }

                btn.onclick = function () {
                    processQuote(postDiv, selectedText);
                };
            });

            // Hide when clicking elsewhere (but allow clicking the button)
            document.addEventListener('mousedown', function (e) {
                if (e.target !== btn && !btn.contains(e.target)) {
                    // slight delay to allow click on button to register
                    setTimeout(() => {
                        const sel = document.getSelection();
                        if (!sel || sel.isCollapsed) hideButton();
                    }, 50);
                }
            });

            // Update position while selection changes, on scroll and resize
            const debouncedUpdate = debounce(() => {
                const sel = document.getSelection();
                if (sel && !sel.isCollapsed && btn.style.display !== 'none') {
                    updateButtonPositionForSelection(sel);
                }
            }, 25);
            document.addEventListener('selectionchange', debouncedUpdate);
            window.addEventListener('scroll', debouncedUpdate, true);
            window.addEventListener('resize', debouncedUpdate);

            // Hide initially
            hideButton();

        })();
    },

    // end of Bitcointalk object
};

// Listener from popup.js
chrome.runtime.onMessage.addListener(
    function (message) {
        // Support handling toggles from popup for future extension
        if (message && message.type === 'emoji-toolbar-toggle') {
            // emoji toolbar is handled by emoji-toolbar.js
        } else if (message && message.type === 'emoticon-replacer-toggle') {
            // emoticon replacer handled if included separately
        } else if (message && message.key) {
            Bitcointalk.init(message.key, message.value, 0);
        }
    }
);

// Defer DOM-dependent initialization until DOM is ready
(function runWhenReady() {
    function doInit() {
        chrome.storage.local.get('bitcointalk', function (storage) {
            try {
                Bitcointalk.externalLink();
                Bitcointalk.scrollToTop();
                Bitcointalk.sumMerit();
                Bitcointalk.enhancedReportToModeratorUI();
                Bitcointalk.toggleMerit();

                if (Bitcointalk.isLoggedIn()) {
                    Bitcointalk.highlightMyNameInMerit();
                }

                // initialize Quick Quote
                try {
                    if (typeof Bitcointalk.initQuickQuote === 'function') {
                        Bitcointalk.initQuickQuote();
                    }
                } catch (e) {
                    console.error('initQuickQuote error', e);
                }

                if (typeof Object.keys(storage) !== 'undefined' && Object.keys(storage).length > 0) {
                    Object.keys(storage.bitcointalk).map(function (key) {
                        Bitcointalk.init(key, storage.bitcointalk[key], 1);
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
        // DOM already ready
        doInit();
    }
})();