$(document).ready(function () {
    let zoom = 100;

    function updateSliderBackground(el, val) {
        if (!el) return;
        const min = parseInt(el.getAttribute('min')) || 50;
        const max = parseInt(el.getAttribute('max')) || 200;
        const pct = Math.round(((val - min) / (max - min)) * 100);
        // green from 0..pct, grey after pct
        el.style.background = `linear-gradient(90deg, #28a745 0%, #28a745 ${pct}%, #ddd ${pct}%, #ddd 100%)`;
    }
    
    chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
        if (tabs[0].url === undefined || !tabs[0].url.includes("https://bitcointalk.org")) {
            $('#menu').hide();
            $('#not').show();
        }
    });
    
    chrome.storage.local.get('bitcointalk', function (storage) {
        if (storage && storage.bitcointalk) {
            $.each(storage.bitcointalk, function (key, value) {
                setButton(key, value, 1);
            });
        }
    });
    
    // Buttons (theme, price, pins, signature, avatar, direction)
    $('button').click(function () {
        var key = $(this).attr('data-key');
        var value = $(this).attr('data-value');
        setButton(key, value, 0);
        
        chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {key: key, value: value, tabs: tabs[0].id});
        });
    });

    // Slider: update on input, send message on change (or input for live)
    $('#zoomSlider').on('input change', function () {
        let val = parseInt($(this).val());
        zoom = val;
        $('#zoom').html(val);
        $('#zoomValue').html(val + '%');

        // update the visual filled track
        updateSliderBackground(this, val);

        // send numeric value to content script
        chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {key: 'zoom', value: val, tabs: tabs[0].id});
        });

        // update visual state if needed
        setButton('zoom', val, 0);
    });
    
    function setButton(key, value, event) {
        if (key === "zoom") {
            if (event === 1) {
                // initialization from storage
                // value is expected to be numeric (stored zoom) or string "on"/"plus"/"minus"
                if (!isNaN(parseInt(value))) {
                    zoom = parseInt(value);
                } else if (value === "on") {
                    zoom = 100;
                } else if (value === "plus") {
                    zoom = 105;
                } else if (value === "minus") {
                    zoom = 95;
                }
                $('#zoom').html(zoom);
                $('#zoomValue').html(zoom + '%');
                $('#zoomSlider').val(zoom);
                // update slider background on init
                updateSliderBackground(document.getElementById('zoomSlider'), zoom);
                // normalize value used for button-state logic
                value = (zoom > 100 ? "plus" : (zoom < 100 ? "minus" : "on"));
            } else {
                // event === 0 from user action (we already handled via slider)
                // if value is numeric, set zoom accordingly
                if (!isNaN(parseInt(value))) {
                    zoom = parseInt(value);
                    $('#zoom').html(zoom);
                    $('#zoomValue').html(zoom + '%');
                    $('#zoomSlider').val(zoom);
                    // update slider background when set programmatically
                    updateSliderBackground(document.getElementById('zoomSlider'), zoom);
                    value = (zoom > 100 ? "plus" : (zoom < 100 ? "minus" : "on"));
                } else {
                    // fallback to original behavior (plus/minus/on)
                    zoom = (value === "plus" ? zoom + 5 : (value === "minus" ? zoom - 5 : 100));
                    value = (zoom === 100 ? "on" : value);
                    $('#zoom').html(zoom);
                    $('#zoomValue').html(zoom + '%');
                    $('#zoomSlider').val(zoom);
                    updateSliderBackground(document.getElementById('zoomSlider'), zoom);
                }
            }
        }
        // reset icon classes for the group
        $(`.${key} button i`).attr("class", "circle");
        $(`.${key} button[data-value='${value}']`).find('i').addClass((value === "on" || value === "ltr") ? "circle-on" : "circle-off");
        $(`.${key} button span`).removeAttr('style');
        $(`.${key} button[data-value='${value}']`).find('span').attr('style', 'font-weight: bold;');
    }
});