$(document).ready(function () {
    var title = document.title;
    var url = window.location.href;

    // constants
    var ACTION_START = 'ACTION_START';
    var ACTION_STOP = 'ACTION_STOP';
    var ACTION_MUTE = 'ACTION_MUTE';
    var NOTIFICATION = 'NOTIFICATION';
    var GET_TASKS = 'GET_TASKS';

    // flags
    var mute = false;
    var task = null;

    function sendNotification(text, once) {
        if (!task) return;
        chrome.runtime.sendMessage({
            type: NOTIFICATION,
            data: text ? text : (task ? task.notification : '')
        });
        if (once) return;
        var it = setInterval(function () {
            if (mute) {
                clearInterval(it);
                return;
            }
            chrome.runtime.sendMessage({
                type: NOTIFICATION,
                data: text ? text : (task ? task.notification : '')
            });
        }, 3000);
    }

    var delay = 1000;

    function clickButtons(clickArray) {
        if (!clickArray.length) return;
        var $buttons = $('button:visible, input[type="button"]:visible');
        clickArray.forEach(function (text) {
            $buttons.each(function () {
                var $button = $(this);
                text = text || '';
                text = text.toLowerCase();
                if ($button.text().toLowerCase() === text) {
                    setTimeout(function () {
                        $button.click();
                    }, delay);
                    delay += 1000;
                }
            });
        });
    }

    function check() {
        if (!task) return;

        clickButtons(task.clickBefore);

        setTimeout(function () { // wait till before buttons are clicked.
            var pageVisibleContent = $('*:not(:has(*)):visible').text().toLowerCase();
            var notify = false;
            // check includes
            var includesCount = 0;
            task.includes.forEach(function (include) {
                include = include || '';
                include = include.toLowerCase();
                if (pageVisibleContent.indexOf(include) !== -1) {
                    includesCount++;
                }
            });
            // check excludes
            var excludesCount = 0;
            task.excludes.forEach(function (exclude) {
                exclude = exclude || '';
                exclude = exclude.toLowerCase();
                if (pageVisibleContent.indexOf(exclude) === -1) {
                    excludesCount++;
                }
            });

            if (includesCount > 0 || excludesCount > 0) {
                if (includesCount === task.includes.length && excludesCount === task.excludes.length) {
                    notify = true;
                }
            }

            if (notify) {
                sendNotification();
                clickButtons(task.clickAfter);
                return;
            }

            // refresh
            setTimeout(function () {
                location.reload();
            }, (task.clickBefore.length + task.clickAfter.length) * 1000);
        }, task.clickBefore.length * 1200);
    }

    chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
        switch (message.type) {
            case ACTION_START:
                mute = false;
                task = JSON.parse(message.data);
                break;
            case ACTION_STOP:
                task = null;
                mute = true;
                break;
            case ACTION_MUTE:
                mute = true;
                break;
            default:
                break;
        }
    });

    chrome.runtime.sendMessage({
        type: GET_TASKS
    }, function (message) {
        var tasks = message.data;
        var activeTabId = message.tabId;
        task = tasks[activeTabId];
        mute = false;
        if (task) {
            // check url changes
            if (task.url === url) {
                setTimeout(function () {
                    check();
                }, task.interval * 1000);
            } else {
                if (task.lockUrl && task.started) {
                    sendNotification('Your url changed. Please stop extension.');
                }
            }
        }
    });

    window.onunload = function () {

    };

});