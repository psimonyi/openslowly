/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Stepboxes: replace default spinboxes with GTK-style spinboxes.

document.addEventListener('DOMContentLoaded', () => {
    let spinboxes = document.querySelectorAll('input[type="number"]');
    for (let input of spinboxes) {
        let min = parseFloat(input.min);
        let max = parseFloat(input.max);
        let step = parseFloat(input.step);

        // Properties of valid input:
        let integer = Number.isInteger(step);
        let nonnegative = min >= 0;

        let wrapper = document.createElement('div');
        wrapper.className = 'stepbox';
        let decr = document.createElement('button');
        decr.className = 'decrement';
        decr.addEventListener('click', stepDown.bind(input, 1));
        decr.textContent = "\u2212"; // MINUS SIGN
        let incr = document.createElement('button');
        incr.className = 'increment';
        incr.addEventListener('click', stepUp.bind(input, 1));
        incr.textContent = "+";
        input.type = 'text';
        input.setAttribute('inputmode', 'numeric');
        input.pattern =
            (nonnegative ? '' : '-?') +
            (integer ? '[0-9]+'
                     : '(?:[0-9]+[.]?[0-9]*|[.][0-9]+)');
        input.parentNode.replaceChild(wrapper, input);
        wrapper.appendChild(input);
        wrapper.appendChild(decr);
        wrapper.appendChild(incr);
        // Ugh, I don't know how to do width-for-height aspect ratios in CSS.
        wrapper.style.setProperty('--height',
            getComputedStyle(decr).getPropertyValue('height'));
    }
});

function stepUp(n) { return step.call(this, n, +1); }
function stepDown(n) { return step.call(this, n, -1); }

function step(n, direction) {
    let value = parseFloat(this.value) || 0;
    let originalValue = value;
    let step_base =
           (this.hasAttribute('min')
               && parseFloat(this.min))
        || (this.hasAttribute('value')
               && parseFloat(this.getAttribute('value')))
        || 0;

    let step = parseFloat(this.step);
    if (!this.hasAttribute('step')) step = 1;
    if (!step || step <= 0) step = 1;

    let min;
    if (this.hasAttribute('min')) {
        min = parseFloat(this.getAttribute('min'));
        // We want the smallest integer k such that
        // step_base + k * step >= min
        // k * step >= min - step_base
        // k >= (min - step_base) / step [note: step > 0]
        let k = Math.ceil((min - step_base) / step);
        min = step_base + k * step;
    }

    let max;
    if (this.hasAttribute('max')) {
        max = parseFloat(this.getAttribute('max'));
        // We want the largest integer k such that
        // step_base + k * step <= max
        // k * step <= max - step_base
        // k <= (max - step_base) / step
        let k = Math.floor((max - step_base) / step);
        max = step_base + k * step;
    }

    if (max !== undefined && min !== undefined && max < min) return;

    /*
    let op = direction > 0 ? Math.ceil : Math.floor;
    let k = op((value - step_base) / step);
    value = step_base + k * step;
    */

    // Note: step is always strictly greater than zero.
    let rem = (step_base - value) % step;
    if (rem !== 0) {
        value += rem;
        if (direction === -1) value -= step;
    } else {
        value += n * step * direction;
    }

    if (min !== undefined && value < min) value = min;
    if (max !== undefined && value > max) value = max;
    if (direction === -1 && value > originalValue) return;
    if (direction === +1 && value < originalValue) return;

    this.value = value;
}

// I am pretty sure that the HTML5 "rules for parsing floating-point number
// values" are very close to what parseFloat does, including the stopping at
// unexpected characters behaviour.  The differences are as follows: parseFloat
// parse the non-finite values ±Infinity and NaN; parseFloat will skip more
// kinds of whitespace (both skip TAB, LF, FF, CR, and SPACE but parseFloat
// additionally will skip VT, NBSP, ZWNBSP, LINE SEPARATOR, PARAGRAPH
// SEPARATOR, and any other Unicode category 'Zs' Space_Separator code point);
// parseFloat will return -0 for "-0", "-.0e1" and other input mathematically
// equal to zero starting with "-" whereas the HTML5 rules can never return -0.
// https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#rules-for-parsing-floating-point-number-values
// https://tc39.github.io/ecma262/#sec-parsefloat-string
function parseFloat(s) {
    // We'll ignore the extra whitespace permissiveness.
    let es_num = Number.parseFloat(s);
    // Input that ES makes non-finite values would be an error in HTML.
    if (!Number.isFinite(es_num)) return undefined;
    // Convert -0 to +0 if needed.
    if (es_num === 0) return 0;
    return es_num;
}
