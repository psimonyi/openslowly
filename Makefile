# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

.PHONY: default
default: openslowly.xpi

files := manifest.json background.js \
    options.css options.html options.js prefs.js \
    status.css status.html status.js \
    Check.svg More.svg Warning.svg tab-loading.png \
    _locales

openslowly.xpi: $(files)
	zip --filesync --quiet --recurse-paths $@ $^
