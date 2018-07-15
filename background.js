/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* Open Bookmarks Slowly: The default "Open All in Tabs" on bookmark folders
 * just opens bookmarks all at once; for large folders it warns about
 * performance but doesn't do anything differently.  This extension is a way to
 * open all the bookmarks a few at a time so they all have a chance to load
 * completely.
 */

'use strict';

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

    let tab = await browser.tabs.create({ url: '/status.html' });
    browser.tabs.onUpdated.addListener(function listener() {
        browser.tabs.onUpdated.removeListener(listener);
        browser.tabs.sendMessage(tab.id, {bookmarks});
    }, {tabId: tab.id, properties: ['status']});
});

async function getBookmarks(bookmarkId) {
    let bookmarks = await browser.bookmarks.getChildren(bookmarkId);
    return bookmarks.filter(bookmark =>
        bookmark.type === 'bookmark' && bookmark.url);
}
