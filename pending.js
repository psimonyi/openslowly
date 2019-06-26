/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* Pending tabs manager: This module handles the content side of keeping track
 * of currently loading tabs and hands out permission to load another when the
 * background.js counterpart gives us a slot.
 */

export let pending = {
    // currently loading tabs (tab ID -> Flag)
    flags: new Map(),

    port: browser.runtime.connect(),

    // Resolves when the caller may load a tab.
    may_load() {
        let port = this.port;
        let rv = new Promise(resolve => {
            port.onMessage.addListener(function listener(msg) {
                port.onMessage.removeListener(listener);
                console.assert(msg == 'slot assigned');
                resolve();
            });
        });
        port.postMessage('request slot');
        return rv;
    },

    // Return a promise that resolves when all the flags are settled.
    async wait_all() {
        // Promise.all settles on the first rejection.  We want to wait for all
        // promises to settle, so wrap them all with a catch.
        const noop = () => {};
        await Promise.all(Array.from(this.flags.values(), p => p.catch(noop)));
    },

    add(tabId) {
        let flag = new Flag();
        this.flags.set(tabId, flag);
        this.onAdd && this.onAdd(flag.metadata, tabId);
        return flag;
    },

    has(tabId) {
        return this.flags.has(tabId);
    },

    finished(tabId, success, result) {
        let flag = this.flags.get(tabId);
        this.flags.delete(tabId);
        flag[success ? 'resolve' : 'reject'](result);
        this.port.postMessage('release slot');
        this.onFinished && this.onFinished(flag.metadata, tabId);
    },

    // Relinquish a slot granted by may_load().
    relinquish_slot() {
        this.port.postMessage('release slot');
    },

    // Get an Object on which metadata can be stored for a tab.
    // It only exists while the tab is pending.
    metadata(tabId) {
        let flag = this.flags.get(tabId);
        return flag ? flag.metadata : undefined;
    },
};

// A Flag is a Promise that exposes its resolve and reject functions as
// methods.
export function Flag() {
    let _resolve, _reject;
    let flag = new Promise((resolve, reject) => {
        _resolve = resolve;
        _reject = reject;
    });
    flag.resolve = _resolve;
    flag.reject = _reject;
    flag.metadata = {};
    return flag;
}
