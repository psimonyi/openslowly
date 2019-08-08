/* Lots of this is from fluent-web. */

import { negotiateLanguages } from '@fluent/langneg';
import { FluentBundle } from '@fluent/bundle';
import { DOMLocalization } from '@fluent/dom';

// TODO: reconsider how this info is provided
import { locales, fallbackLocale } from '/locale/meta.js';

function documentReady() {
    const rs = document.readyState;
    if (rs === 'interactive' || rs === 'completed') {
        return Promise.resolve();
    }

    return new Promise(
        resolve => document.addEventListener(
            'readystatechange', resolve, { once: true },
        ),
    );
}

function getResourceLinks(elem) {
    return Array.prototype.map.call(
        elem.querySelectorAll('link[rel="localization"]'),
        el => el.getAttribute('href'),
    );
}

async function fetchSource(locale, id) {
    const url = id.replace('{locale}', locale);
    const response = await fetch(url);
    return response.text();
}

async function createBundle(locale, resourceIds) {
    const {os} = await browser.runtime.getPlatformInfo();
    const options = {
        functions: {
            PLATFORM: () => os,
        },
    };
    const bundle = new FluentBundle([locale], options);

    // First fetch all resources
    const resources = await Promise.all(
        resourceIds.map(id => fetchResource(locale, id)),
    );

    // Then apply them preserving order
    for (const resource of resources) {
        bundle.addResource(resource);
    }
    return bundle;
}

async function* generateBundles(resourceIds) {
    // Note: browser.i18n.getUILanguage() seems like it would be the right
    // choice here, but it only returns one language.  navigator.languages
    // gives them all.
    const localesToUse = negotiateLanguages(
        navigator.languages,
        locales,
        { defaultLocale: fallbackLocale },
    );
    for (const locale of localesToUse) {
        yield createBundle(locale, resourceIds);
    }
}


const resourceIds = getResourceLinks(document.head);
const l10n = new DOMLocalization(
    resourceIds, generateBundles,
);

// Firefox defines a getter-only document.l10n that doesn't actually work, so
// we need to replace that before we can assign our DOMLocalization to it.
Object.defineProperty(document, 'l10n', {
    configurable: true,
    enumerable: true,
    value: undefined,
    writable: true,
});
document.l10n = l10n;

window.addEventListener('languagechange', document.l10n);

document.l10n.ready = documentReady().then(() => {
    document.l10n.connectRoot(document.documentElement);
    return document.l10n.translateRoots();
});

export { l10n };
