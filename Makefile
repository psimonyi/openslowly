# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

.PHONY: default
default: openslowly.xpi

files := manifest.json background.html background.js \
    nsresult.js pending.js \
    options.css options.html options.js prefs.js \
    status.css status.html status.js \
    stepbox.css stepbox.js \
    Check.svg More.svg Preferences.svg Warning.svg tab-loading.png \
    icon.svg icon24.svg icon16.svg icon-notify-gnome.svg \
    locale fluent/bundle.js

openslowly.xpi: $(files)
	zip --filesync --quiet --recurse-paths $@ $^

icon-notify-gnome.svg: icon16.svg
	sed -re 's/fill:#000000/fill:#bebeb6/' $^ > $@

fluent/bundle.js: fluent/index.js fluent/rollup.config.js fluent/node_modules
	fluent/node_modules/.bin/rollup $< --file $@ \
	    --format esm --config fluent/rollup.config.js

fluent/node_modules: fluent/package.json
	cd fluent; npm install
	touch $@
