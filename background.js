/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const MENUID = 'menuitem';

// Before Firefox 63, onShown didn't work for bookmarks.
let menuShown = true;
browser.menus.create({
    id: MENUID,
    title: browser.i18n.getMessage("menuLabel"),
    contexts: ['bookmark'],
});

browser.menus.onShown.addListener(async function onShown(info) {
    if (!info.contexts.includes('bookmark')) return;

    onShown.currentShowing = 1 + (onShown.currentShowing || 0);
    let thisShowing = onShown.currentShowing;

    let bookmarks = await browser.bookmarks.get(info.bookmarkId);
    let bookmark = bookmarks[0];
    if (thisShowing != onShown.currentShowing) return;

    if (bookmark.type === 'folder' && !menuShown) {
        browser.menus.create({
            id: MENUID,
            title: browser.i18n.getMessage("menuLabel"),
            contexts: ['bookmark'],
        });
        menuShown = true;
        browser.menus.refresh();
    } else if (bookmark.type !== 'folder' && menuShown) {
        browser.menus.remove(MENUID);
        menuShown = false;
        browser.menus.refresh();
    }
});

browser.menus.onClicked.addListener(async function (info) {
    let bookmarks = await getBookmarks(info.bookmarkId);
    if (bookmarks.length === 0) return;

    browser.runtime.onMessage.addListener(function f(msg, sender, respond) {
        browser.runtime.onMessage.removeListener(f);
        respond(bookmarks);
    });

    let tab = await getReusableTab();
    if (tab) {
        browser.tabs.update(tab.id, { url: '/status.html' });
    } else {
        browser.tabs.create({ url: '/status.html' });
    }
});

// Returns the Tab object for the current tab if it is suitable to reuse for
// opening a new page; otherwise returns undefined.  The tab is suitable if
// it's a fresh blank tab that's the last in its window.
async function getReusableTab() {
    const BLANK_URLS = ['about:blank', 'about:home', 'about:newtab'];

    let queryResult = await browser.tabs.query({
        currentWindow: true,
        active: true,
    });
    if (queryResult.length != 1) return;
    let currentTab = queryResult[0];

    if (currentTab.status != 'complete') return;
    if (currentTab.pinned) return;
    if (!BLANK_URLS.includes(currentTab.url)) return;

    // Make sure this is the last tab in its window.
    queryResult = await browser.tabs.query({
        windowId: currentTab.windowId,
        index: currentTab.index + 1,
    });
    if (queryResult.length != 0) return;

    return currentTab;
}

async function getBookmarks(bookmarkId) {
    let bookmarks = await browser.bookmarks.getChildren(bookmarkId);
    return bookmarks.filter(bookmark =>
        bookmark.type === 'bookmark' && bookmark.url);
}

/* There may be multiple sets of bookmarks being opened slowly, but we should
 * maintain the limit on how many can load at once across all sessions.  This
 * part of the background script keeps track of how many slots for loading a
 * tab are available or in use and allocates them to sessions.
 */

import {prefsReady} from '/prefs.js';

let total_slots_in_use = 0;
let queue = [];
async function advance_queue() {
    let prefs = await prefsReady;
    while (total_slots_in_use < prefs.inflight_max && queue.length) {
        let port = queue.shift();
        port.slots_in_use += 1;
        total_slots_in_use += 1;
        port.postMessage('slot assigned');
    }
}

browser.runtime.onConnect.addListener(port => {
    port.slots_in_use = 0;

    port.onDisconnect.addListener(port => {
        if (port.error) {
            console.error("Port error", port.error);
        }
        total_slots_in_use -= port.slots_in_use;
        let index = queue.indexOf(port);
        if (index != -1) {
            queue.splice(index, 1);
        }
        advance_queue();
    });
    port.onMessage.addListener(message => {
        if (message == 'request slot') {
            queue.push(port);
            advance_queue();
        } else if (message == 'release slot') {
            port.slots_in_use -= 1;
            total_slots_in_use -= 1;
            advance_queue();
        } else {
            console.error("Unrecognized message", message);
        }
    });
});
