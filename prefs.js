/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const DEFAULT_PREFS = {
    inflight_max: 2,
};

let prefs = Object.assign({}, DEFAULT_PREFS);
browser.storage.sync.get().then(loaded => Object.assign(prefs, loaded));
browser.storage.onChanged.addListener(changes => {
    for (let key of Object.keys(changes)) {
        prefs[key] = changes[key].newValue;
    }
});

export default prefs;
