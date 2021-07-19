var NOTIFICATION = 'NOTIFICATION';
var GET_TASKS = 'GET_TASKS';
var SET_VOICE = 'SET_VOICE';
var options = {

};

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.type === NOTIFICATION) {
        message.data = message.data || '';
        chrome.tts.speak(message.data, options);
        sendResponse();
    } else if (message.type === SET_VOICE) {
        options.voiceName = message.data;
        sendResponse();
    } else if (message.type === GET_TASKS) {
        chrome.storage.sync.get('tasks', function(result) {
            var tasks = result.tasks;
            sendResponse({
                data: tasks,
                tabId: sender.tab.id
            });
        });
    }
    return true;
});

chrome.tabs.onRemoved.addListener(function (tabId, removeInfo) {
    chrome.storage.sync.get('tasks', function(result) {
        var tasks = result.tasks;
        if (tasks && tasks[tabId]) {
            delete tasks[tabId];
            chrome.storage.sync.set({
                tasks: tasks
            });
        }
    });
});
