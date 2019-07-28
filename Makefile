# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

.PHONY: default
default: openslowly.xpi fluent-version-check-if-needed

glyphs := $(foreach suffix,.svg -dark.svg,$(addsuffix $(suffix),\
    Check More Preferences Refresh Warning))

files := manifest.json background.html background.js \
    nsresult.js pending.js \
    options.css options.html options.js prefs.js \
    status.css status.html status.js \
    stepbox.css stepbox.js \
    $(glyphs) tab-loading.png \
    icon.svg icon24.svg icon16.svg icon-notify-gnome.svg \
    locale fluent/bundle.js fluent/NOTICE

openslowly.xpi: $(files)
	zip --filesync --quiet --recurse-paths $@ $^

icon-notify-gnome.svg: icon16.svg
	sed -re 's/fill:#000000/fill:#bebeb6/' $^ > $@

%-dark.svg: %.svg
	sed -re 's/rgba\(12, 12, 13, \.8\)/rgba(249, 249, 250, .8)/' $^ > $@

fluent/bundle.js: fluent/index.js fluent/rollup.config.js fluent/node_modules
	fluent/node_modules/.bin/rollup $< --file $@ \
	    --format esm --config fluent/rollup.config.js

fluent/node_modules: fluent/package.json
	cd fluent; npm install
	touch $@

# Check that the Fluent libraries are up to date, but only check once a week.
# If package-lock.json is more than a week old, this evaluates to
# 'fluent-version-check'; otherwise it's blank.
fluent-version-check-if-needed := $(shell \
    [[ $$(date --reference=fluent/package-lock.json '+%s') \
    -lt $$(date --date='-1 week' '+%s') ]] && echo 'fluent-version-check')
.PHONY: fluent-version-check-if-needed
fluent-version-check-if-needed: $(fluent-version-check-if-needed)

# This rule actually does the update check (slow, because it uses the network).
# If everything is up to date, touch package-lock.json so we won't check again
# for another week.  `npm outdated` returns 1 if anything is outdated.
# `true` at the end allows the build to continue with old libraries.
.PHONY: fluent-version-check
fluent-version-check:
	cd fluent; npm outdated && touch package-lock.json; true

.PHONY: source.zip
source.zip:
	git archive --format=zip --output=source-$$(git describe).zip -9 HEAD
	@echo Created source-$$(git describe).zip
