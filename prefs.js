/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* Prefs handler - Exports:
 * prefsReady is a promise that resolves to the _prefs object when it's ready;
 * that is a live-updating view of the current prefs.  (Do not modify it.)
 */

export let _addons_linter_workaround = 1;

const DEFAULT_PREFS = {
    inflight_max: 6,
};

let _prefs = Object.assign({}, DEFAULT_PREFS);

export let prefsReady = browser.storage.sync.get()
                        .then(loaded => Object.assign(_prefs, loaded));

browser.storage.onChanged.addListener(changes => {
    for (let key of Object.keys(changes)) {
        _prefs[key] = changes[key].newValue;
    }
});
