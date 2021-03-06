/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import {l10n} from '/fluent/bundle.js';
import {pending, Flag} from '/pending.js';
import {nsresult_to_code} from '/nsresult.js';
import {prefsReady} from '/prefs.js';

document.addEventListener('DOMContentLoaded', async () => {
    let {os} = await browser.runtime.getPlatformInfo();
    document.documentElement.classList.add(`os-${os}`);

    // For the .card-no-hover rule, we want to know if version<70
    let {version} = await browser.runtime.getBrowserInfo();
    let majorVersion = +version.split('.', 1);
    if (majorVersion < 70) {
        document.documentElement.classList.add(`fxlt70`);
    }

    if (inDarkMode()) {
        document.documentElement.classList.add(`dark-mode`);
    }

    let {bookmarks, folderName} = await browser.runtime.sendMessage('ready');
    showList(bookmarks, folderName);
    openAll(bookmarks, folderName);
});

// The CSS wants to know whether dark mode is enabled.  This is usually managed
// by the prefers-color-scheme media query.  However, because we use
// in-content/common.css we need to use dark mode exactly when it does.
// In Firefox < 67, p-c-s is not supported; mode is always light.
// In Firefox 67, p-c-s is supported but common.css doesn't use it.
// In Firefox 68-69, in-content dark mode is controlled by a pref, default off.
// In Firefox >= 70 that pref defaults on, so in-content dark mode is
// controlled by p-c-s and all is right in the world.
// So in Firefox 67-69, there's a good chance that our p-c-s rules match but
// should not because in-content isn't in dark mode.  We fix that by also
// adding a class to indicate whether the page is in dark mode.
// This detects whether the page is in dark mode by checking whether the text
// colour is lighter than the background colour.
function inDarkMode() {
    let style = getComputedStyle(document.documentElement);
    // (Note that this must compare the computed 'color' and 'background-color'
    // properties because those will be normalized to rgb() style; custom
    // properties like '--in-content-page-color' are returned as written.)
    let fg = luminance(...parseCSSColor(style.color));
    let bg = luminance(...parseCSSColor(style.backgroundColor));
    return fg > bg;
}

// Parse a CSS rgb() colour, and return the components [r, g, b] in the range
// [0,1].  Ignore any alpha component.
function parseCSSColor(s) {
    let m = /^rgba?\(([0-9.]+), ([0-9.]+), ([0-9.]+)(?:, [0-9.]+)?\)$/.exec(s);
    return [+m[1] / 255, +m[2] / 255, +m[3] / 255];
}

// Given colour components in the range [0,1], convert the colour from sRGB to
// a linear (not gamma-compressed) luminance value.
// https://en.wikipedia.org/wiki/Grayscale
function luminance(r, g, b) {
    function ungamma(c) {
        if (c <= 0.04045) {
            return c / 12.92
        } else {
            return Math.pow((c + 0.055) / 1.055, 2.4)
        }
    }
    return 0.2126 * ungamma(r) + 0.7152 * ungamma(g) + 0.0722 * ungamma(b);
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('pause').addEventListener('click', function () {
        if (this.promise) {
            this.promise.resolve();
            delete this.promise;
            l10n.setAttributes(this, 'button-pause');
        } else {
            this.promise = new Flag();
            l10n.setAttributes(this, 'button-resume');
        }
    });

    document.getElementById('prefs').addEventListener('click', () => {
        browser.runtime.openOptionsPage();
    });
});

function showList(bookmarks, folderName) {
    let ol = document.getElementById('bookmarks-list');
    for (let bookmark of bookmarks) {
        let li = document.createElement('li');
        li.textContent = bookmark.title;
        li.dataset.status = 'enqueued';
        li.dataset.id = bookmark.id;
        ol.appendChild(li);
    }
    let progress = document.getElementById('progress');
    progress.max = bookmarks.length;
    progress.value = 0;
    let heading = document.getElementById('bookmarks-heading');
    heading.textContent = folderName;
}

function showError(li, message) {
    let div = document.createElement('div');
    l10n.setAttributes(div, message.key, message.args);
    div.className = 'error-message';
    li.appendChild(div);
    li.dataset.status = 'error';
    let progress = document.getElementById('progress');
    progress.value += 1;
}

function markDone(li) {
    li.dataset.status = 'complete';
    let progress = document.getElementById('progress');
    progress.value += 1;
}

function showReload(li) {
    li.classList.add('reload');
    li.addEventListener('animationend',
                        () => li.classList.remove('reload'),
                        {once: true});
}

async function openAll(bookmarks, folderName) {
    let pause = document.getElementById('pause');
    for (let bookmark of bookmarks) {
        while (true) {
            await pending.may_load();
            if (pause.promise) {
                pending.relinquish_slot();
                await pause.promise;
            } else {
                break;
            }
        }

        let li = document.querySelector(`li[data-id="${bookmark.id}"]`);
        li.dataset.status = 'loading';

        let thisTab = await browser.tabs.getCurrent();
        try {
            let tab = await browser.tabs.create({
                url: bookmark.url,
                active: false,
                index: thisTab.index,
                windowId: thisTab.windowId,
            });
            let flag = pending.add(tab.id);
            flag.metadata.url = bookmark.url;
            flag.metadata.li = li;
            flag.then(() => markDone(li))
                .catch((message) => showError(li, message));
        } catch (e) {
            showError(li, { key: 'error-open', args: { message: e.message }});
        }
    }
    showResult(folderName);
}

pending.onAdd = function (metadata, tabId) {
    metadata.retried = 0;
    metadata.timestamp = Date.now();
    metadata.timeoutId = setTimeout(checkHungTab, hungTabTimeout(), tabId);
    metadata.committed = false;
}

pending.onReload = function (metadata, tabId) {
    metadata.retried += 1;
    metadata.timestamp = Date.now();
    clearTimeout(metadata.timeoutId);
    metadata.timeoutId = setTimeout(checkHungTab, hungTabTimeout(), tabId);
    metadata.committed = false;
}

pending.onFinished = function (metadata, tabId) {
    clearTimeout(metadata.timeoutId);
}

async function showResult(folderName) {
    document.getElementById('pause').classList.add('finished');
    await pending.wait_all();
    // TODO: should also indicate whether there were any errors.
    document.getElementById('status').classList.add('success');
    l10n.setAttributes(document.getElementById('status-heading'),
        'heading-done');

    // Show an alert, but only if the preference is set and the status page is
    // not the current focus.

    let prefs = await prefsReady;
    if (!prefs.notify) return;

    let win = await browser.windows.getCurrent();
    let tab = await browser.tabs.getCurrent();
    if (win.focused && tab.active) return;

    // We don't know how the icon will be used by the notification system.
    // GNOME resizes anything to 16x16, and shows it on a dark background.
    // Hopefully the regular icon will be good enough on other systems.
    let platform = await browser.runtime.getPlatformInfo();
    let notificationId = await browser.notifications.create({
        type: 'basic',
        title: await l10n.formatValue('notification-title'),
        message: await l10n.formatValue('notification-body', {folderName}),
        iconUrl: (platform.os == 'linux'
            ? '/icon-notify-gnome.svg'
            : '/icon.svg'),
    });

    function handleClick(thisId) {
        if (notificationId == thisId) {
            browser.tabs.update(tab.id, { active: true });
            browser.windows.update(win.id, { focused: true });
        }
    }

    browser.notifications.onClicked.addListener(handleClick);
    browser.notifications.onClosed.addListener(function f() {
        browser.notifications.onClicked.removeListener(handleClick);
        browser.notifications.onClosed.removeListener(f);
    });
}

browser.webNavigation.onErrorOccurred.addListener(handleNavigationResult);
browser.webNavigation.onCompleted.addListener(handleNavigationResult);
async function handleNavigationResult(details) {
    // We only care about the result of the main tab, not subframes.
    if (details.frameId !== 0) return;

    // We only care if it's a tab we're waiting on.
    if (!pending.has(details.tabId)) return;

    if (details.error) {
        // The error might be a JS reload/redirect.  Wait a bit and see if the
        // tab loads something else.  If something else is loading, we should
        // wait for it too; it will trigger this again when it finishes.
        // Note: this also happens when we reload a hung tab.
        await new Promise(resolve => setTimeout(resolve, 100));
        let tab = await browser.tabs.get(details.tabId).catch(() => null);
        if (tab && tab.status === 'loading') return;
    }

    if (details.error) {
        let message = { key: 'error-load', args: { message: details.error }};
        let match = /^Error code ([0-9]+)$/.exec(details.error);
        let stopped = false;
        if (match) {
            let code = nsresult_to_code[match[1]];
            if (code == 'NS_BINDING_ABORTED') {
                message = { key: 'error-stopped' };
                stopped = true;
            } else if (code) {
                message = { key: 'error-load', args: { message: code }};
            }
        }

        if (!stopped) {
            // If reloadTab decides not to (e.g. because we already tried too
            // many times) it's important not to return early before calling
            // pending.finished so the failure will be reported properly.
            if (await reloadTab(details.tabId)) return;
        }

        pending.finished(details.tabId, false, message);
    } else {
        let metadata = pending.metadata(details.tabId);
        let loadtime = details.timeStamp - metadata.timestamp;
        timing.push(loadtime);
        // TODO: Maybe only count a load if it's not too much of an outlier?
        pending.finished(details.tabId, true);
    }
}

const MAX_RETRIES = 2;

// Reload the tab (with some exceptions).  Return false if we didn't.
async function reloadTab(tabId) {
    let metadata = pending.metadata(tabId);

    if (metadata.retried >= MAX_RETRIES) return false;

    // Don't reload the current foreground tab if it's started loading
    // something; that's just rude.
    let tab = await browser.tabs.get(tabId);
    let win = await browser.windows.get(tab.windowId);
    if (metadata.committed && tab.active && win.focused) return false;

    pending.onReload(metadata, tabId);
    showReload(metadata.li);
    if (metadata.committed) {
        browser.tabs.reload(tabId);
    } else {
        // tabs.reload() would "reload" about:blank, which is useless.
        browser.tabs.update(tabId, {url: metadata.url});
    }
    return true;
}

browser.webNavigation.onCommitted.addListener(function (details) {
    if (details.frameId != 0) return;

    // We'll only record this for tabs that we're waiting on.  `metadata`
    // returns undefined for other tabs.
    let metadata = pending.metadata(details.tabId);
    if (!metadata) return;

    metadata.committed = true;
});

browser.tabs.onRemoved.addListener(tabId => {
    if (pending.has(tabId)) {
        pending.finished(tabId, false, { key: 'error-tab-closed' });
    }
});

// Array of successful page load times (in ms).
var timing = [];

// Minimum number of successful loads in `timing` before we can use it to guess
// how long a tab should take.
const MIN_DATA_POINTS = 8;

// Without a good guess, how long should we give a tab before checking in?
const GUESS_DELAY = 5000; //ms

// Number of standard deviations from the mean page load time before we want to
// try reloading the tab.
const OKAY_DEVIATIONS = 5;

function checkHungTab(tabId) {
    let metadata = pending.metadata(tabId);

    // If this is one of the first tabs, we don't have enough data to tell
    // whether it's hung yet or not.  Come back later.
    if (timing.length < MIN_DATA_POINTS) {
        metadata.timeoutId = setTimeout(checkHungTab, GUESS_DELAY, tabId);
        return;
    }

    // Even after MIN_DATA_POINTS, we might have a more accurate guess by now.
    let delay = hungTabTimeout();
    let now = Date.now();
    if (metadata.timestamp + delay > now) {
        let new_delay = delay - (now - metadata.timestamp);
        metadata.timeoutId = setTimeout(checkHungTab, new_delay, tabId);
        return;
    }

    reloadTab(tabId);
}

// Return the delay to use before checking a tab for being hung.
function hungTabTimeout() {
    if (timing.length < MIN_DATA_POINTS) return GUESS_DELAY;
    return tooLong();
}

// How long should we wait for a tab to load?  OKAY_DEVIATIONS standard
// deviations longer than the mean successful load time so far for other tabs.
// Not sure this is the best stat to use, since the data isn't really normal.
function tooLong() {
    function sum(ys) { return ys.reduce((accum, y) => accum + y) }
    let xs = timing;
    let n = xs.length;
    let mean = sum(xs) / n;
    let sq_diffs = xs.map(x => Math.pow(x - mean, 2));
    let stdev = Math.sqrt(1 / (n-1) * sum(sq_diffs));
    return mean + stdev * OKAY_DEVIATIONS;
}
