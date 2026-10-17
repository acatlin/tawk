/* ------------------------------------------------------------------
   hmac-lab.js — see a webhook signature with your own eyes.

   Computes HMAC digests in the browser (WebCrypto) so you can watch the
   X-Tawk-Signature value change when one byte of the body changes, when
   the body is pretty-printed, or when the secret is wrong; and replay a
   delivery with the same X-Hook-Event-Id to see idempotency in action.

   tawk.to signs with HMAC-SHA1, hex, over the raw body
   (https://developer.tawk.to/webhooks/, checked 2026-10-17). SHA-256 is
   offered only for comparison.

   Usage: HmacLab.mount(root, { secret: 'whsec_demo', body: '{...}' })
   ------------------------------------------------------------------ */
(function () {
  'use strict';

  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { if (k === 'text') n.textContent = attrs[k]; else if (k === 'html') n.innerHTML = attrs[k]; else n.setAttribute(k, attrs[k]); });
    (children || []).forEach(function (c) { if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  async function hmacHex(algo, key, message) {
    var enc = new TextEncoder();
    var k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: algo }, false, ['sign']);
    var sig = await crypto.subtle.sign('HMAC', k, enc.encode(message));
    return Array.prototype.map.call(new Uint8Array(sig), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
  }

  var DEFAULT_BODY = JSON.stringify({
    event: 'chat:start', chatId: '70fe3290-99ad-11e9-a30a-51567162179f', time: '2019-06-28T14:03:04.646Z', domain: 'tawk.to', referrer: 'https://www.google.com/',
    message: { text: 'Sample message', type: 'msg', sender: { type: 'visitor' } },
    visitor: { name: 'V1561719148780935', email: 'hello@test.com', city: 'jelgava', country: 'LV' },
    property: { id: '58ca8453b8a7e060cd3b1ecb', name: 'Bobs Burgers' }
  });

  function mount(root, opts) {
    opts = opts || {};
    root.classList.add('lab'); root.innerHTML = '';
    root.appendChild(el('h3', { text: opts.title || 'Webhook signature lab' }));
    root.appendChild(el('p', { 'class': 'hint', html: 'tawk.to computes <code>HMAC-SHA1(secret, raw body)</code> as hex and sends it in <code>X-Tawk-Signature</code>. Your endpoint recomputes it over the exact bytes it received and compares. Change anything on the left and watch the right.' }));

    var secret = el('input', { type: 'text', value: opts.secret || 'whsec_demo', 'aria-label': 'Webhook secret', style: 'min-width:14rem' });
    var algo = el('select', { 'aria-label': 'Algorithm' });
    [['SHA-1', 'HMAC-SHA1 (what tawk.to uses)'], ['SHA-256', 'HMAC-SHA256 (for comparison)']].forEach(function (p) { algo.appendChild(el('option', { value: p[0], text: p[1] })); });
    root.appendChild(el('div', { 'class': 'row' }, [el('label', {}, [document.createTextNode('secret '), secret]), el('label', {}, [document.createTextNode('algorithm '), algo])]));

    var body = el('textarea', { 'aria-label': 'Raw body', style: 'min-height:9rem' }); body.value = opts.body || DEFAULT_BODY;
    root.appendChild(el('label', { style: 'display:block' }, [document.createTextNode('raw request body (exact bytes)'), body]));

    var row = el('div', { 'class': 'row' });
    var tamper = el('button', { type: 'button', 'class': 'secondary', text: 'Tamper one character' });
    var pretty = el('button', { type: 'button', 'class': 'secondary', text: 'Pretty-print the JSON' });
    var reset = el('button', { type: 'button', 'class': 'quiet', text: 'Reset body' });
    row.appendChild(tamper); row.appendChild(pretty); row.appendChild(reset); root.appendChild(row);

    var sigOut = el('div', { 'class': 'result' });
    root.appendChild(sigOut);

    root.appendChild(el('h4', { text: 'Verify like your endpoint does' }));
    var received = el('input', { type: 'text', placeholder: 'paste a signature as if it arrived in X-Tawk-Signature', 'aria-label': 'Received signature', style: 'flex:1;min-width:22rem' });
    var verify = el('button', { type: 'button', text: 'Verify' });
    var useGood = el('button', { type: 'button', 'class': 'quiet', text: 'Use the genuine one' });
    root.appendChild(el('div', { 'class': 'row' }, [received, verify, useGood]));
    var verdict = el('div', { 'class': 'result' }); verdict.hidden = true; root.appendChild(verdict);

    root.appendChild(el('h4', { text: 'Retries and X-Hook-Event-Id' }));
    root.appendChild(el('p', { 'class': 'hint', html: 'tawk.to retries anything that is not a 2XX (or takes over 30 s) for up to 12 hours, with the <em>same</em> event id. Your store must treat a repeated id as already handled.' }));
    var evtId = el('input', { type: 'text', value: 'evt-7f3a', 'aria-label': 'Event id', style: 'min-width:10rem' });
    var deliver = el('button', { type: 'button', 'class': 'secondary', text: 'Deliver' });
    var redeliver = el('button', { type: 'button', 'class': 'quiet', text: 'Retry (same id)' });
    var newId = el('button', { type: 'button', 'class': 'quiet', text: 'New id' });
    root.appendChild(el('div', { 'class': 'row' }, [el('label', {}, [document.createTextNode('X-Hook-Event-Id '), evtId]), deliver, redeliver, newId]));
    var log = el('div', { 'class': 'log', 'aria-label': 'Delivery log' }); root.appendChild(log);
    var seen = {}; var stored = 0;

    var genuine = '';
    async function recompute() {
      try {
        genuine = await hmacHex(algo.value, secret.value, body.value);
        sigOut.className = 'result';
        sigOut.innerHTML = '<div><b>X-Tawk-Signature:</b> <span class="mono">' + esc(genuine) + '</span></div><div class="muted small">' + body.value.length + ' bytes in body · ' + (algo.value === 'SHA-1' ? '40' : '64') + ' hex chars</div>';
      } catch (e) { sigOut.className = 'result bad'; sigOut.textContent = 'WebCrypto error: ' + e.message; }
    }
    secret.addEventListener('input', recompute); algo.addEventListener('change', recompute); body.addEventListener('input', recompute);
    tamper.addEventListener('click', function () { var v = body.value; var i = Math.max(v.indexOf('Sample'), 0); body.value = v.slice(0, i) + (v[i] === 'S' ? 's' : 'S') + v.slice(i + 1); recompute(); });
    pretty.addEventListener('click', function () { try { body.value = JSON.stringify(JSON.parse(body.value), null, 2); recompute(); } catch (e) { sigOut.className = 'result bad'; sigOut.textContent = 'Body is not valid JSON, so it cannot be pretty-printed. (Verification would still work on the bytes.)'; } });
    reset.addEventListener('click', function () { body.value = opts.body || DEFAULT_BODY; recompute(); });
    useGood.addEventListener('click', function () { received.value = genuine; });
    verify.addEventListener('click', async function () {
      var given = received.value.trim().toLowerCase();
      var expected = await hmacHex(algo.value, secret.value, body.value);
      var ok = given.length === expected.length && given === expected;
      verdict.hidden = false; verdict.className = 'result ' + (ok ? 'ok' : 'bad');
      verdict.innerHTML = ok ? '<b>200 OK</b> — signature matches the raw body. Now parse the JSON.' : '<b>401 Unauthorized</b> — ' + (given.length !== expected.length ? 'length differs (' + given.length + ' vs ' + expected.length + ' hex chars)' : 'digest differs') + '. Never parse or store this body. <span class="muted">In Node use <code>crypto.timingSafeEqual</code> on equal-length buffers.</span>';
    });
    function logLine(cls, t) { var d = document.createElement('div'); d.className = cls; d.textContent = t; log.appendChild(d); log.scrollTop = log.scrollHeight; }
    deliver.addEventListener('click', function () { var id = evtId.value.trim(); if (seen[id]) { logLine('dim', id + ' → 200 duplicate ignored (already stored)'); } else { seen[id] = true; stored++; logLine('ok', id + ' → verified, stored (' + stored + ' total), 200 OK'); } });
    redeliver.addEventListener('click', function () { var id = evtId.value.trim(); logLine('evt', 'tawk.to retries ' + id + ' (same X-Hook-Event-Id)'); if (seen[id]) logLine('dim', id + ' → 200 duplicate ignored'); else { seen[id] = true; stored++; logLine('ok', id + ' → stored, 200 OK'); } });
    newId.addEventListener('click', function () { evtId.value = 'evt-' + Math.random().toString(16).slice(2, 6); });
    recompute();
    return { recompute: recompute, hmacHex: hmacHex };
  }

  window.HmacLab = { mount: mount, hmacHex: hmacHex };
})();
