$(document).ready(function () {
    let zoom;
    
    chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
        if (tabs[0].url === undefined || !tabs[0].url.includes("https://bitcointalk.org")) {
            $('#menu').hide();
            $('#not').show();
        }
    });
    
    chrome.storage.local.get('bitcointalk', function (storage) {
        $.each(storage.bitcointalk, function (key, value) {
            setButton(key, value, 1);
        });
    });
    
    $('button').click(function () {
        var key = $(this).attr('data-key');
        var value = $(this).attr('data-value');
        setButton(key, value, 0);
        
        chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {key: key, value: value, tabs: tabs[0].id});
        });
    });
    
    function setButton(key, value, event) {
        if (key === "zoom") {
            if (event === 1) {
                zoom = value;
                $('#zoom').html(value);
                value = (value > 100 ? "plus" : (value < 100 ? "minus" : "on"));
            } else {
                zoom = (value === "plus" ? zoom + 5 : (value === "minus" ? zoom - 5 : 100));
                value = (zoom === 100 ? "on" : value);
                $('#zoom').html(zoom);
            }
        }
        $(`.${key} button i`).attr("class", "circle");
        $(`.${key} button[data-value='${value}']`).find('i').addClass(value === "on" ? "circle-on" : "circle-off");
        $(`.${key} button span`).removeAttr('style');
        $(`.${key} button[data-value='${value}']`).find('span').attr('style', 'font-weight: bold;');
    }
});