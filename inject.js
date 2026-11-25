/* tv-nav.js - D-pad spatial navigation for any website on Samsung Tizen TV.
 * Arrows move focus to the nearest clickable element in that direction,
 * Enter clicks, Back goes back. If nothing is in that direction, the page scrolls.
 */
(function () {
  if (window.__tvNav) return;
  window.__tvNav = true;

  var SELECTOR = [
    'a[href]', 'button', 'input', 'select', 'textarea', 'summary',
    '[tabindex]:not([tabindex="-1"])', '[role="button"]', '[role="link"]',
    '[role="tab"]', '[role="menuitem"]', '[onclick]'
  ].join(',');
  var SCROLL_STEP = 300;
  var KEY = { 37: 'left', 38: 'up', 39: 'right', 40: 'down' };

  // Visible focus ring (the "selected tile" look)
  var style = document.createElement('style');
  style.textContent =
    '.tvnav-focus{outline:4px solid #fff !important;outline-offset:3px !important;' +
    'box-shadow:0 0 0 8px rgba(229,9,20,.85) !important;transform:scale(1.05);' +
    'transition:transform .12s ease;z-index:2147483000;position:relative}';
  (document.head || document.documentElement).appendChild(style);

  function visible(el) {
    var r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return false;
    var cs = getComputedStyle(el);
    return cs.visibility !== 'hidden' && cs.display !== 'none' && !el.disabled;
  }

  function candidates() {
    var list = [];
    var nodes = document.querySelectorAll(SELECTOR);
    for (var i = 0; i < nodes.length; i++) if (visible(nodes[i])) list.push(nodes[i]);
    return list;
  }

  var current = null;
  function setFocus(el) {
    if (current) current.classList.remove('tvnav-focus');
    current = el;
    el.classList.add('tvnav-focus');
    if (!el.hasAttribute('tabindex') && !/^(A|BUTTON|INPUT|SELECT|TEXTAREA|SUMMARY)$/.test(el.tagName)) {
      el.setAttribute('tabindex', '0');
    }
    el.focus({ preventScroll: true });
    el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
  }

  function center(r) { return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }

  function findNext(dir) {
    var from = current && document.contains(current) ? current : null;
    var list = candidates();
    if (!from) {
      // first press: pick the element closest to the top-left of the viewport
      var best0 = null, bd = Infinity;
      list.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) return;
        var d = r.top * 2 + r.left;
        if (d < bd) { bd = d; best0 = el; }
      });
      return best0;
    }
    var fr = from.getBoundingClientRect(), fc = center(fr);
    var best = null, bestScore = Infinity;
    list.forEach(function (el) {
      if (el === from || from.contains(el) || el.contains(from)) return;
      var r = el.getBoundingClientRect(), c = center(r);
      var dx = c.x - fc.x, dy = c.y - fc.y, main, cross;
      if (dir === 'right') { if (r.left < fr.right - 2) return; main = r.left - fr.right; cross = Math.abs(dy); }
      if (dir === 'left')  { if (r.right > fr.left + 2) return; main = fr.left - r.right; cross = Math.abs(dy); }
      if (dir === 'down')  { if (r.top < fr.bottom - 2) return; main = r.top - fr.bottom; cross = Math.abs(dx); }
      if (dir === 'up')    { if (r.bottom > fr.top + 2) return; main = fr.top - r.bottom; cross = Math.abs(dx); }
      var score = Math.max(main, 0) + cross * 2.5;
      if (score < bestScore) { bestScore = score; best = el; }
    });
    return best;
  }

  document.addEventListener('keydown', function (e) {
    var dir = KEY[e.keyCode];
    var tag = document.activeElement && document.activeElement.tagName;
    var typing = (tag === 'INPUT' || tag === 'TEXTAREA') && document.activeElement.type !== 'checkbox'
      && document.activeElement.type !== 'radio' && document.activeElement.type !== 'button'
      && document.activeElement.type !== 'submit';

    if (dir) {
      // let left/right move the caret while typing; up/down leave the field
      if (typing && (dir === 'left' || dir === 'right')) return;
      e.preventDefault();
      var next = findNext(dir);
      if (next) setFocus(next);
      else {
        window.scrollBy({
          top: dir === 'down' ? SCROLL_STEP : dir === 'up' ? -SCROLL_STEP : 0,
          left: dir === 'right' ? SCROLL_STEP : dir === 'left' ? -SCROLL_STEP : 0,
          behavior: 'smooth'
        });
      }
    } else if (e.keyCode === 13 && current && !typing) {
      e.preventDefault();
      if (/^(INPUT|TEXTAREA)$/.test(current.tagName) &&
          !/^(checkbox|radio|button|submit)$/.test(current.type)) current.focus();
      else current.click();
    } else if (e.keyCode === 10009 || e.keyCode === 27) { // Tizen Back / Esc
      if (typing) { document.activeElement.blur(); return; }
      if (history.length > 1) history.back();
    }
  }, true);
})();
