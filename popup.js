var ACTION_STOP = 'ACTION_STOP';
var ACTION_MUTE = 'ACTION_MUTE';
var SET_VOICE = 'SET_VOICE';
var NOTIFICATION = 'NOTIFICATION';

$(document).ready(function () {

    function getTask() {
        return {
            url: $('#url').val(),
            interval: (+$('#interval').val() > 0) ? (+$('#interval').val()) : 10,
            excludes: $('#excludes').val() ? $('#excludes').val().split(';') : [],
            includes: $('#includes').val() ? $('#includes').val().split(';') : [],
            notification: $('#notification').val(),
            lockUrl: $('#lockUrl').prop('checked'),
            advanced: $('#advanced').prop('checked'),
            clickBefore: $('#clickBefore').val() ? $('#clickBefore').val().split(';') : [],
            clickAfter: $('#clickAfter').val() ? $('#clickAfter').val().split(';') : []
        };
    }

    function sendMessage(type, data) {
        chrome.tabs.query({currentWindow: true, active: true}, function (tabs){
            var activeTab = tabs[0];
            chrome.tabs.sendMessage(activeTab.id, {
                type: type,
                data: data
            });
        });
    }

    function refresh() {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.update(tabs[0].id, {url: tabs[0].url});
        });
    }

    $('input').on('input', function () {
        if (!$('#stop').prop('disabled')) {
            $('#stop').click();
        }
    });

    function validate() {
        if ($('#interval').val() <= 0) {
            $('#err').text('Interval must be greater than 0.');
            return false;
        }
        if (!$('#excludes').val() && !$('#includes').val()) {
            if ($('#advanced').prop('checked')) {
                $('#err').text('Excludes OR Includes(Advanced) must be filled.');
            } else {
                $('#err').text('Excludes must be filled.');
            }

            return false;
        }
        return true;
    }

    $('#start').click(function () {
        if (!validate()) return;
        var task = getTask();
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            task.id = tabs[0].id;
            chrome.storage.sync.get(['tasks', 'preloads'], function(result) {
                var tasks = result.tasks || {};
                var preloads = result.preloads || {};
                task.started = true;
                tasks[task.id] = task;
                var urlMatch = task.url.match(/(?:[\w-]+\.)+[\w-]+/);
                if (urlMatch) {
                    var urlKey = urlMatch ? urlMatch[0] : '';
                    preloads[urlKey] = task;
                }
                chrome.storage.sync.set({
                    tasks: tasks,
                    preloads: preloads
                });
                $('#start').prop('disabled', true);
                $('#stop').prop('disabled', false);
                chrome.runtime.sendMessage({
                    type: NOTIFICATION,
                    data: ''
                });
                refresh(); // refresh to start
                window.close();
            });
        });
    });

    $('#stop').click(function () {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            var id = tabs[0].id;
            chrome.storage.sync.get('tasks', function(result) {
                var tasks = result.tasks || {};
                if (tasks[id]) {
                    tasks[id].started = false;
                    chrome.storage.sync.set({
                        tasks: tasks
                    });
                    $('#start').prop('disabled', false);
                    $('#stop').prop('disabled', true);
                    chrome.runtime.sendMessage({
                        type: NOTIFICATION,
                        data: ''
                    });
                    sendMessage(ACTION_STOP);
                }
            });
        });
    });

    $('#mute').click(function () {
        sendMessage(ACTION_MUTE);
        window.close();
    });

    $('#advanced').on('change', function () {
        if ($(this).prop('checked')) {
            $('#advanced_options').show();
        } else {
            $('#advanced_options').hide();
        }
    });

    // init voices
    chrome.tts.getVoices(function(voices) {
        var $voices = $('#voices');
        for (var i = 0; i < voices.length; i++) {
            if (voices[i].lang === 'en-US') { // for US only
                $voices.append('<option value="' + voices[i].voiceName + '">' + voices[i].voiceName + '</option>');
            }
        }
    });

    $('#voices').on('change', function () {
        var selectedVoice = $(this).find(":selected").val();
        chrome.runtime.sendMessage({
            type: SET_VOICE,
            data: selectedVoice
        });
        chrome.runtime.sendMessage({
            type: NOTIFICATION,
            data: selectedVoice + ' will notify you.'
        });
        chrome.storage.sync.set({
            voice: selectedVoice
        });
    });

    chrome.tabs.query({active: true, lastFocusedWindow: true}, tabs => {
        var url = tabs[0].url;
        $('#url').val(url);
    });

    function preload(task) {
        $('#interval').val(task.interval);
        $('#excludes').val(task.excludes.join(';'));
        $('#includes').val(task.includes.join(';'));
        $('#notification').val(task.notification);
        $('#lockUrl').prop('checked', task.lockUrl);
        if (task.advanced) {
            $('#advanced').prop('checked', task.advanced);
            $('#advanced_options').show();
        }
        $('#clickBefore').val(task.clickBefore.join(';'));
        $('#clickAfter').val(task.clickAfter.join(';'));
    }

    chrome.storage.sync.get(['tasks', 'voice', 'preloads'], function(result) {
        var tasks = result.tasks || {};
        var voice = result.voice || '';
        var preloads = result.preloads || {};
        chrome.tabs.query({active: true, lastFocusedWindow: true}, tabs => {
            var id = tabs[0].id;
            var url = tabs[0].url;
            var task = tasks[id];
            if (task) {
                preload(task);
                if (task.started) {
                    $('#start').prop('disabled', true);
                    $('#stop').prop('disabled', false);
                } else {
                    $('#start').prop('disabled', false);
                    $('#stop').prop('disabled', true);
                }
            } else {
                $('#start').prop('disabled', false);
                $('#stop').prop('disabled', true);

                // preload
                var urlKey = url.match(/(?:[\w-]+\.)+[\w-]+/) ? url.match(/(?:[\w-]+\.)+[\w-]+/)[0] : '';
                if (preloads && preloads[urlKey]) {
                    task = preloads[urlKey];
                    preload(task);
                }
            }
            if (voice) {
                $('#voices').val(voice);
            }
            chrome.runtime.sendMessage({
                type: SET_VOICE,
                data: voice
            });
        });
    });

});