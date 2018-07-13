/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import prefs from '/prefs.js';
import '/stepbox.js';

document.addEventListener('DOMContentLoaded', () => {
    let elem = document.getElementById('inflight-max');
    elem.value = prefs.inflight_max;
    elem.addEventListener('change', () => {
        if (/^[0-9]+$/.test(elem.value)) {
            let value = Number.parseInt(elem.value);
            browser.storage.sync.set({inflight_max: value});
        }
    });
});
