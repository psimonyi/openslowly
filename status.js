/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import prefs from '/prefs.js';
import {nsresult_to_code} from '/nsresult.js';

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
        try {
            let flag = newFlag();
            let tab = await browser.tabs.create({
                url: bookmark.url,
                active: false,
                index: thisTab.index,
                windowId: thisTab.windowId,
            });
            pending.set(tab.id, flag);
            flag.then(() => li.dataset.status = 'complete')
                .catch((code) => showError(li, getMessage('errorLoad', code)));
        } catch (e) {
            showError(li, getMessage('errorOpen@', e.message));
        }
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
async function handleNavigationResult(details) {
    // We only care about the result of the main tab, not subframes.
    if (details.frameId !== 0) return;

    let promise = pending.get(details.tabId);
    if (!promise) return; // This isn't about one of our tabs.

    if (details.error) {
        // The error might be a JS reload/redirect.  Wait a bit and see if the
        // tab loads something else.  If something else is loading, we should
        // wait for it too; it will trigger this again when it finishes.
        await new Promise(resolve => setTimeout(resolve, 100));
        let tab = await browser.tabs.get(details.tabId).catch(() => null);
        if (tab && tab.status === 'loading') return;
    }

    pending.delete(details.tabId);
    if (details.error) {
        let nsresult = /^Error code ([0-9]+)$/.exec(details.error)[1];
        promise.reject(nsresult_to_code[nsresult]);
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
