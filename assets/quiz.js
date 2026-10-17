/* ------------------------------------------------------------------
   quiz.js — retrieval-practice components shared by every lesson.

   1) Multiple-choice quiz with immediate feedback.
      <div class="quiz" data-title="Check yourself">
        <script type="application/json">{"questions":[
          {"q":"…","options":["…","…","…"],"answer":0,"explain":"…","cite":"https://…"}
        ]}</script>
      </div>
      Author options with the same number of words so formatting gives
      nothing away. Options are shuffled on every render.

   2) Recall cards (free recall, then self-grade; spaced by a Leitner box).
      <div class="recall" data-id="l3-raw-body"></div>
      Content comes from window.RECALL_BANK (assets/recall-bank.js) by id,
      or inline: <p class="prompt">…</p><div class="answer">…</div>.

   Depends on window.Course (course.js) for storage; degrades gracefully.
   ------------------------------------------------------------------ */
(function () {
  'use strict';
  var C = window.Course || {};
  var store = C.store || {
    get: function (k) { try { var v = localStorage.getItem('course:' + k); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem('course:' + k, JSON.stringify(v)); } catch (e) { } }
  };
  var pageKey = C.file || (location.pathname.split('/').pop() || 'page');

  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'text') n.textContent = attrs[k]; else if (k === 'html') n.innerHTML = attrs[k]; else n.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  /* ================= quiz ================= */
  function initQuiz(box) {
    var dataEl = box.querySelector('script[type="application/json"]');
    if (!dataEl) return;
    var data;
    try { data = JSON.parse(dataEl.textContent); } catch (e) { box.appendChild(el('p', { 'class': 'muted', text: 'Quiz data could not be parsed.' })); return; }
    var qs = data.questions || [];
    var title = box.getAttribute('data-title') || 'Check yourself';
    var id = box.id || ('quiz-' + Array.prototype.indexOf.call(document.querySelectorAll('.quiz'), box));

    function render() {
      Array.prototype.forEach.call(box.querySelectorAll('.qblock, .score, h3, .quiz-intro'), function (n) { n.remove(); });
      var answered = 0, correct = 0;
      box.appendChild(el('h3', { text: title }));
      var prior = store.get('quiz:' + pageKey + ':' + id);
      box.appendChild(el('p', { 'class': 'muted small quiz-intro', text: 'Answer from memory before looking back. Feedback is immediate; each explanation is the lesson in miniature.' + (prior ? ' Last time: ' + prior.score + '/' + prior.total + '.' : '') }));
      var score = el('div', { 'class': 'score', 'aria-live': 'polite' }); score.hidden = true;

      qs.forEach(function (q, qi) {
        var wrap = el('div', { 'class': 'qblock' });
        wrap.appendChild(el('p', { 'class': 'q', html: '<span class="qn">Q' + (qi + 1) + '</span>' + q.q }));
        var opts = el('div', { 'class': 'opts', role: 'group', 'aria-label': 'Answer options for question ' + (qi + 1) });
        var order = shuffle(q.options.map(function (_, k) { return k; }));
        order.forEach(function (k) {
          var b = el('button', { type: 'button', 'class': 'opt', text: q.options[k] });
          b.addEventListener('click', function () {
            if (wrap.getAttribute('data-done')) return;
            wrap.setAttribute('data-done', '1'); answered++;
            var right = (k === q.answer); if (right) correct++;
            Array.prototype.forEach.call(opts.querySelectorAll('button'), function (x) { x.disabled = true; });
            b.setAttribute('data-state', right ? 'correct' : 'wrong');
            if (!right) Array.prototype.forEach.call(opts.querySelectorAll('button'), function (x) { if (x.textContent === q.options[q.answer]) x.setAttribute('data-state', 'reveal'); });
            var ex = el('div', { 'class': 'explain', 'aria-live': 'polite' });
            ex.innerHTML = (right ? '<strong>Correct.</strong> ' : '<strong>Not quite.</strong> ') + (q.explain || '') + (q.cite ? ' <a href="' + q.cite + '" target="_blank" rel="noopener">source</a>' : '');
            wrap.appendChild(ex);
            if (answered === qs.length) finish();
          });
          opts.appendChild(b);
        });
        wrap.appendChild(opts);
        box.appendChild(wrap);
      });
      box.appendChild(score);

      function finish() {
        score.hidden = false;
        var msg = correct === qs.length
          ? 'All correct. Fluency is not storage: come back in three days and do the recall cards without re-reading.'
          : 'Re-read only the explanations you missed, then retry tomorrow from memory.';
        score.innerHTML = 'Score: ' + correct + '/' + qs.length + '. ' + msg + ' ';
        var again = el('button', { type: 'button', 'class': 'btn quiet again', text: 'Retry' });
        again.addEventListener('click', render);
        score.appendChild(again);
        store.set('quiz:' + pageKey + ':' + id, { score: correct, total: qs.length, at: Date.now() });
        store.set('quiz:' + pageKey, { score: correct, total: qs.length, at: Date.now() });
      }
    }
    render();
  }

  /* ================= recall cards (Leitner boxes) ================= */
  var INTERVALS_DAYS = [1, 3, 7, 14, 30];
  function fmtDue(ts) {
    var d = Math.round((ts - Date.now()) / 86400000);
    if (d <= 0) return 'due now';
    return 'due in ' + d + (d === 1 ? ' day' : ' days');
  }
  function initRecall(card) {
    var id = card.getAttribute('data-id');
    var bank = window.RECALL_BANK || [];
    var item = null;
    for (var i = 0; i < bank.length; i++) if (bank[i].id === id) item = bank[i];
    var promptEl = card.querySelector('.prompt'), answerEl = card.querySelector('.answer');
    if (!promptEl && item) { promptEl = el('p', { 'class': 'prompt', html: item.prompt }); card.appendChild(promptEl); }
    if (!answerEl && item) { answerEl = el('div', { 'class': 'answer', html: item.answer }); card.appendChild(answerEl); }
    if (!promptEl || !answerEl) return;
    if (!card.querySelector('h3')) card.insertBefore(el('h3', { text: card.getAttribute('data-title') || 'Recall' + (item && item.lesson ? ' · lesson ' + item.lesson : '') }), card.firstChild);

    var state = store.get('recall:' + id) || { box: 0, due: 0, seen: 0 };
    var controls = el('div', { 'class': 'controls' });
    var reveal = el('button', { type: 'button', 'class': 'btn', text: 'Reveal answer' });
    var got = el('button', { type: 'button', 'class': 'btn secondary', text: 'Got it' }); got.hidden = true;
    var missed = el('button', { type: 'button', 'class': 'btn quiet', text: 'Missed it' }); missed.hidden = true;
    var due = el('span', { 'class': 'due', text: state.seen ? ('box ' + (state.box + 1) + ' · ' + fmtDue(state.due)) : 'new card' });
    reveal.addEventListener('click', function () { card.setAttribute('data-open', '1'); reveal.hidden = true; got.hidden = false; missed.hidden = false; });
    function grade(ok) {
      state.seen++;
      state.box = ok ? Math.min(state.box + 1, INTERVALS_DAYS.length - 1) : 0;
      state.due = Date.now() + INTERVALS_DAYS[state.box] * 86400000;
      state.last = Date.now();
      store.set('recall:' + id, state);
      got.hidden = true; missed.hidden = true;
      due.textContent = (ok ? 'Good. ' : 'No problem; it comes back tomorrow. ') + 'Box ' + (state.box + 1) + ' · ' + fmtDue(state.due);
    }
    got.addEventListener('click', function () { grade(true); });
    missed.addEventListener('click', function () { grade(false); });
    controls.appendChild(reveal); controls.appendChild(got); controls.appendChild(missed); controls.appendChild(due);
    card.appendChild(controls);
  }

  function init() {
    Array.prototype.forEach.call(document.querySelectorAll('.quiz'), initQuiz);
    Array.prototype.forEach.call(document.querySelectorAll('.recall'), initRecall);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  window.CourseQuiz = { initQuiz: initQuiz, initRecall: initRecall, intervals: INTERVALS_DAYS };
})();
