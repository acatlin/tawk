/* ------------------------------------------------------------------
   faq-lab.js — an in-browser FAQ matcher you can tune.

   Mirrors examples/src/faq-match.ts (same normalisation, same scoring)
   so what you learn here transfers to the TypeScript you deploy.

   Scoring strategies (all return 0..1 so one threshold works):
     exact   — normalised string equality against any question variant
     jaccard — token-set overlap |Q ∩ D| / |Q ∪ D| against the best variant
     tfidf   — cosine similarity of tf-idf vectors (variants + answer)

   Usage:
     FaqLab.mount(document.querySelector('#faq-lab'), { faq: [...], tests: [...] });
   ------------------------------------------------------------------ */
(function () {
  'use strict';

  var STOP = ['a', 'an', 'the', 'is', 'are', 'am', 'i', 'to', 'of', 'in', 'on', 'for', 'do', 'does', 'can', 'how', 'what', 'my', 'me', 'it', 'you', 'your', 'we', 'our', 'and', 'or', 'with', 'be', 'this', 'that', 'there', 'please', 'hi', 'hello'];
  function qsOf(f) { return f.questions || f.q || []; }
  function aOf(f) { return f.answer || f.a || ''; }
  function normalize(s) {
    return String(s || '').toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function stem(w) {
    if (w.length > 5 && /ing$/.test(w)) return w.slice(0, -3).replace(/([b-df-hj-np-tv-z])$/, '$1');
    if (w.length > 5 && /ed$/.test(w)) return w.slice(0, -2);
    if (w.length > 4 && /(ches|shes|sses|xes|zes)$/.test(w)) return w.slice(0, -2);
    if (w.length > 3 && /s$/.test(w) && !/ss$/.test(w)) return w.slice(0, -1);
    return w;
  }
  function tokens(s) { return normalize(s).split(' ').filter(function (w) { return w && STOP.indexOf(w) < 0; }).map(stem); }

  function jaccard(a, b) {
    var A = {}, B = {}, inter = 0, uni = 0;
    a.forEach(function (t) { A[t] = 1; }); b.forEach(function (t) { B[t] = 1; });
    Object.keys(A).forEach(function (t) { uni++; if (B[t]) inter++; });
    Object.keys(B).forEach(function (t) { if (!A[t]) uni++; });
    return uni ? inter / uni : 0;
  }

  function buildTfidf(docs) {
    var df = {}, N = docs.length;
    var vecs = docs.map(function (d) {
      var tf = {}; d.tokens.forEach(function (t) { tf[t] = (tf[t] || 0) + 1; });
      Object.keys(tf).forEach(function (t) { df[t] = (df[t] || 0) + 1; });
      return tf;
    });
    function idf(t) { return Math.log(1 + N / (1 + (df[t] || 0))); }
    function vec(tf) { var v = {}, norm = 0; Object.keys(tf).forEach(function (t) { var w = (1 + Math.log(tf[t])) * idf(t); v[t] = w; norm += w * w; }); norm = Math.sqrt(norm) || 1; Object.keys(v).forEach(function (t) { v[t] /= norm; }); return v; }
    var dv = vecs.map(vec);
    return { score: function (qTokens, i) { var tf = {}; qTokens.forEach(function (t) { tf[t] = (tf[t] || 0) + 1; }); var qv = vec(tf), s = 0; Object.keys(qv).forEach(function (t) { if (dv[i][t]) s += qv[t] * dv[i][t]; }); return s; } };
  }

  function rank(faq, question, strategy) {
    var qn = normalize(question), qt = tokens(question);
    var docs = faq.map(function (f) { return { id: f.id, tokens: tokens(qsOf(f).concat([aOf(f)]).join(' ')) }; });
    var tfidf = strategy === 'tfidf' ? buildTfidf(docs) : null;
    return faq.map(function (f, i) {
      var s = 0, why = '';
      if (strategy === 'exact') { s = qsOf(f).some(function (v) { return normalize(v) === qn; }) ? 1 : 0; why = s ? 'normalised text equal' : 'no exact variant'; }
      else if (strategy === 'jaccard') { var best = 0, bv = ''; qsOf(f).forEach(function (v) { var sc = jaccard(qt, tokens(v)); if (sc > best) { best = sc; bv = v; } }); s = best; why = bv ? 'best variant: "' + bv + '"' : ''; }
      else { s = tfidf.score(qt, i); why = 'cosine vs variants+answer'; }
      return { id: f.id, score: s, why: why, entry: f };
    }).sort(function (a, b) { return b.score - a.score; });
  }

  function decide(ranked, threshold, margin) {
    var top = ranked[0], second = ranked[1];
    if (!top || top.score < threshold) return { hit: false, reason: 'top score ' + (top ? top.score.toFixed(2) : '0') + ' < threshold ' + threshold.toFixed(2) };
    if (second && margin > 0 && (top.score - second.score) < margin) return { hit: false, reason: 'ambiguous: top two within ' + margin.toFixed(2) + ' (' + top.score.toFixed(2) + ' vs ' + second.score.toFixed(2) + ')' };
    return { hit: true, id: top.id, reason: 'top score ' + top.score.toFixed(2) + ' ≥ ' + threshold.toFixed(2) };
  }

  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { if (k === 'text') n.textContent = attrs[k]; else if (k === 'html') n.innerHTML = attrs[k]; else n.setAttribute(k, attrs[k]); });
    (children || []).forEach(function (c) { if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function mount(root, opts) {
    var faq = opts.faq, tests = opts.tests || [];
    root.classList.add('lab');
    root.innerHTML = '';
    root.appendChild(el('h3', { text: opts.title || 'FAQ matcher lab' }));
    root.appendChild(el('p', { 'class': 'hint', html: 'Type a visitor question, pick a strategy, and move the threshold. Then run the test set: the goal is <strong>zero wrong FAQ answers</strong> first, and only then as many correct hits as possible. A wrong confident answer costs more trust than a fall-through.' }));

    var row1 = el('div', { 'class': 'row' });
    var q = el('input', { type: 'text', placeholder: 'e.g. how do i reset my password?', style: 'flex:1;min-width:16rem', 'aria-label': 'Visitor question' });
    var strat = el('select', { 'aria-label': 'Strategy' });
    [['tfidf', 'tf-idf cosine'], ['jaccard', 'token overlap (Jaccard)'], ['exact', 'exact (normalised)']].forEach(function (p) { strat.appendChild(el('option', { value: p[0], text: p[1] })); });
    var go = el('button', { type: 'button', text: 'Match' });
    row1.appendChild(q); row1.appendChild(strat); row1.appendChild(go);
    root.appendChild(row1);

    var row2 = el('div', { 'class': 'row' });
    var thr = el('input', { type: 'range', min: '0', max: '1', step: '0.02', value: String(opts.threshold != null ? opts.threshold : 0.5), 'aria-label': 'Threshold' });
    var thrV = el('code', { text: thr.value });
    var mar = el('input', { type: 'range', min: '0', max: '0.5', step: '0.02', value: String(opts.margin != null ? opts.margin : 0.1), 'aria-label': 'Ambiguity margin' });
    var marV = el('code', { text: mar.value });
    row2.appendChild(el('label', {}, [document.createTextNode('threshold '), thr])); row2.appendChild(thrV);
    row2.appendChild(el('label', {}, [document.createTextNode('ambiguity margin '), mar])); row2.appendChild(marV);
    root.appendChild(row2);

    var out = el('div', { 'class': 'result' }); out.hidden = true; root.appendChild(out);

    var row3 = el('div', { 'class': 'row' });
    var runTests = el('button', { type: 'button', 'class': 'secondary', text: 'Run test set (' + tests.length + ' questions)' });
    row3.appendChild(runTests); root.appendChild(row3);
    var testOut = el('div', { 'class': 'result' }); testOut.hidden = true; root.appendChild(testOut);

    function thresholds() { return { t: parseFloat(thr.value), m: parseFloat(mar.value) }; }
    thr.addEventListener('input', function () { thrV.textContent = thr.value; });
    mar.addEventListener('input', function () { marV.textContent = mar.value; });

    function matchOnce() {
      var text = q.value.trim(); if (!text) return;
      var th = thresholds(); var ranked = rank(faq, text, strat.value); var d = decide(ranked, th.t, th.m);
      out.hidden = false; out.className = 'result ' + (d.hit ? 'ok' : 'warn');
      var html = '<strong>' + (d.hit ? 'FAQ HIT → answer "' + esc(d.id) + '"' : 'FALL THROUGH → next tier') + '</strong> <span class="muted">(' + esc(d.reason) + ')</span>';
      html += '<table><thead><tr><th>#</th><th>FAQ id</th><th>score</th><th>why</th></tr></thead><tbody>';
      ranked.slice(0, 3).forEach(function (r, i) { html += '<tr><td>' + (i + 1) + '</td><td><code>' + esc(r.id) + '</code></td><td>' + r.score.toFixed(2) + '</td><td class="muted">' + esc(r.why) + '</td></tr>'; });
      html += '</tbody></table>';
      if (d.hit) html += '<div><b>Canonical answer:</b> ' + esc(aOf(ranked[0].entry)) + (ranked[0].entry.source ? ' <span class="muted">(source: ' + esc(ranked[0].entry.source) + ')</span>' : '') + '</div>';
      out.innerHTML = html;
    }
    go.addEventListener('click', matchOnce);
    q.addEventListener('keydown', function (e) { if (e.key === 'Enter') matchOnce(); });

    runTests.addEventListener('click', function () {
      var th = thresholds(); var rows = [], correct = 0, wrong = 0, missed = 0, fallOk = 0;
      tests.forEach(function (t) {
        var d = decide(rank(faq, t.q, strat.value), th.t, th.m);
        var verdict;
        if (t.expect === null) { if (d.hit) { verdict = 'WRONG (answered from FAQ; should fall through)'; wrong++; } else { verdict = 'ok (fell through)'; fallOk++; } }
        else if (d.hit && d.id === t.expect) { verdict = 'ok (correct FAQ)'; correct++; }
        else if (d.hit) { verdict = 'WRONG (answered "' + d.id + '", expected "' + t.expect + '")'; wrong++; }
        else { verdict = 'missed (fell through; expected "' + t.expect + '")'; missed++; }
        rows.push({ q: t.q, verdict: verdict, bad: /WRONG/.test(verdict), miss: /missed/.test(verdict) });
      });
      testOut.hidden = false; testOut.className = 'result ' + (wrong ? 'bad' : (missed ? 'warn' : 'ok'));
      var html = '<strong>' + (wrong ? wrong + ' wrong confident answer' + (wrong > 1 ? 's' : '') + '. Raise the threshold or margin.' : (missed ? 'No wrong answers. ' + missed + ' missed: lower the threshold a little, or add question variants.' : 'Clean sweep: no wrong answers and nothing missed.')) + '</strong>';
      html += '<div class="muted">correct FAQ hits ' + correct + ' · correct fall-throughs ' + fallOk + ' · missed ' + missed + ' · wrong ' + wrong + ' · strategy ' + esc(strat.value) + ' · threshold ' + th.t.toFixed(2) + ' · margin ' + th.m.toFixed(2) + '</div>';
      html += '<table><thead><tr><th>question</th><th>result</th></tr></thead><tbody>';
      rows.forEach(function (r) { html += '<tr><td>' + esc(r.q) + '</td><td style="color:' + (r.bad ? 'var(--bad)' : (r.miss ? 'var(--warn)' : 'var(--ok)')) + '">' + esc(r.verdict) + '</td></tr>'; });
      html += '</tbody></table>';
      testOut.innerHTML = html;
      try { localStorage.setItem('course:faqlab', JSON.stringify({ strategy: strat.value, threshold: th.t, margin: th.m, wrong: wrong, missed: missed, at: Date.now() })); } catch (e) { }
    });

    return { rank: rank, decide: decide, normalize: normalize, tokens: tokens };
  }

  window.FaqLab = { mount: mount, rank: rank, decide: decide, normalize: normalize, tokens: tokens };
})();
