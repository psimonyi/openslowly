/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import {prefsReady} from '/prefs.js';
import '/stepbox.js';

const getMessage = browser.i18n.getMessage;

document.addEventListener('DOMContentLoaded', () => {
    let max = document.getElementById('inflight-max');
    let notify = document.getElementById('notify');

    prefsReady.then(prefs => {
        max.value = prefs.inflight_max;
        notify.checked = prefs.notify;
    });

    max.addEventListener('change', () => {
        if (/^[0-9]+$/.test(max.value)) {
            let value = Number.parseInt(max.value);
            if (value < 1) value = 1;
            browser.storage.sync.set({inflight_max: value});
        }
    });

    notify.addEventListener('change', async () => {
        if (notify.checked) {
            let havePermission = await browser.permissions.request({
                permissions: ['notifications']
            });
            if (!havePermission) {
                notify.checked = false;
            }
        }
        browser.storage.sync.set({notify: notify.checked});
    });

    document.getElementById('tip-show').addEventListener('click', () => {
        document.getElementById('tip').classList.toggle('expanded')
    });

    setPlatformText();
});

async function setPlatformText() {
    let {os} = await browser.runtime.getPlatformInfo();
    let fxPrefs = getMessage(os == 'win' ? 'fxPrefsWin' : 'fxPrefs');
    document.getElementById('fx-prefs').textContent = fxPrefs;
}
