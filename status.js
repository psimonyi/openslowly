/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import prefs from '/prefs.js';

const noop = () => {};
const getMessage = browser.i18n.getMessage;

browser.runtime.onMessage.addListener(function listener(message, sender) {
    browser.runtime.onMessage.removeListener(listener);

    showList(message.bookmarks);
    openAll(message.bookmarks);
});

function showList(bookmarks) {
    let ol = document.getElementById('bookmarks-list');
    for (let bookmark of bookmarks) {
        let li = document.createElement('li');
        li.textContent = bookmark.title;
        li.dataset.status = 'enqueued';
        li.dataset.id = bookmark.id;
        ol.appendChild(li);
    }
}

function showError(li, message) {
    let div = document.createElement('div');
    div.textContent = message;
    div.className = 'error-message';
    li.appendChild(div);
    li.dataset.status = 'error';
}

async function openAll(bookmarks) {
    for (let bookmark of bookmarks) {
        if (pending.size >= prefs.inflight_max) {
            await nextReady();
        }

        let li = document.querySelector(`li[data-id="${bookmark.id}"]`);
        li.dataset.status = 'loading';

        let thisTab = await browser.tabs.getCurrent();
        let tab;
        try {
            let flag = newFlag();
            tab = await browser.tabs.create({
                url: bookmark.url,
                active: false,
                index: thisTab.index,
                windowId: thisTab.windowId,
            });
            pending.set(tab.id, flag);
            flag.then(() => li.dataset.status = 'complete')
                .catch(() => showError(li, getMessage('errorLoad')));
        } catch (e) {
            showError(li, getMessage('errorOpen@', e.message));
        }
        console.log("Opened tab", tab, bookmark.url);
    }
    showResult();
}

async function showResult() {
    // Promise.all settles on the first rejection.  We want to wait for all
    // promises to settle, so wrap them all with a catch.
    await Promise.all(Array.from(pending.values(), p => p.catch(noop)));
    document.getElementById('status-heading').textContent =
        getMessage('headingDone');
}

// tabId -> Flag (which is a promise)
let pending = new Map();

async function nextReady() {
    // This resolves even if the race winner rejected.
    await Promise.race(pending.values()).catch(noop);
}

browser.webNavigation.onErrorOccurred.addListener(handleNavigationResult);
browser.webNavigation.onCompleted.addListener(handleNavigationResult);
function handleNavigationResult(details) {
    // We only care about the result of the main tab, not subframes.
    if (details.frameId !== 0) return;

    let promise = pending.get(details.tabId);
    if (!promise) return; // This isn't about one of our tabs.

    pending.delete(details.tabId);
    if (details.error) {
        promise.reject(details.error);
    } else {
        promise.resolve();
    }
}

function newFlag() {
    let _resolve, _reject;
    let flag = new Promise((resolve, reject) => {
        _resolve = resolve;
        _reject = reject;
    });
    flag.resolve = _resolve;
    flag.reject = _reject;
    return flag;
}
