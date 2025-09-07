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
        if (event === 0) {
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
        } else {
            this.getAnStorage('zoom', function (res) {
                document.body.style.zoom = (!isNaN(parseInt(res)) ? parseInt(res) : 100) + "%";
            });
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
    }
};

// الاستماع للرسائل من popup.js
chrome.runtime.onMessage.addListener(
    function (message) {
        Bitcointalk.init(message.key, message.value, 0);
    }
);

// التهيئة عند تحميل الصفحة
chrome.storage.local.get('bitcointalk', function (storage) {
    Bitcointalk.externalLink();
    Bitcointalk.scrollToTop();
    Bitcointalk.sumMerit();
    Bitcointalk.highlightMyNameInMerit();
    Bitcointalk.enhancedReportToModeratorUI();
    Bitcointalk.toggleMerit();

    if (typeof Object.keys(storage) !== 'undefined' && Object.keys(storage).length > 0) {
        Object.keys(storage.bitcointalk).map(function (key) {
            Bitcointalk.init(key, storage.bitcointalk[key], 1);
        });
    }
});