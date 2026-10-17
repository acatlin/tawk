/* ------------------------------------------------------------------
   course.js — shared behaviour for every lesson and reference page.
   - injects the course bar (title, position, jump-to menu)
   - renders prev/next navigation, reference links, "ask your teacher"
   - numbers citations (<a class="cite">) and builds the Sources list
   - adds copy buttons to <pre>
   - persists checklists per page (localStorage, best effort)
   Exposes window.Course for quiz.js and the course home page.
   ------------------------------------------------------------------ */
(function () {
  'use strict';

  var COURSE = {
    title: 'tawk.to for your Claude chatbot',
    repo: 'https://github.com/acatlin/tawk',
    lessons: [
      { file: '0001-the-map-what-tawkto-can-and-cannot-do.html', title: 'The map: what tawk.to can and cannot do for your bot', win: 'Choose your integration pattern on evidence, not guesswork' },
      { file: '0002-hand-off-with-context-driving-the-widget.html', title: 'Hand off with context: driving the widget', win: 'An escalateToHuman() that identifies the visitor and opens chat with a summary' },
      { file: '0003-webhooks-into-vercel.html', title: 'Webhooks into Vercel: verify, dedupe, store', win: 'A signed-webhook endpoint on Vercel that rejects forgeries' },
      { file: '0004-faq-first-the-deterministic-tier.html', title: 'FAQ-first: the deterministic answer tier', win: 'A FAQ matcher with a threshold you tuned yourself' },
      { file: '0005-answer-only-from-approved-sources.html', title: 'Answer only from approved sources', win: 'Grounded answers with citations, or an honest "I don\'t know"' },
      { file: '0006-the-answer-pipeline-end-to-end.html', title: 'The answer pipeline end to end', win: 'FAQ, then sources, then fallback, then a human: one function' },
      { file: '0007-graph-rag-when-a-graph-beats-chunks.html', title: 'Graph RAG: when a graph beats chunks', win: 'Decide whether your corpus needs a graph, and prototype one' },
      { file: '0008-android-the-same-bot-on-a-phone.html', title: 'Android: the same bot on a phone', win: 'Your bot and tawk.to chat running inside an Android shell' }
    ],
    references: [
      { file: 'tawk-javascript-api.html', title: 'tawk.to JavaScript API' },
      { file: 'tawk-webhooks.html', title: 'tawk.to webhooks' },
      { file: 'answer-pipeline.html', title: 'Answer pipeline' },
      { file: 'retrieval-and-graph-rag.html', title: 'Retrieval & Graph RAG' },
      { file: 'glossary.html', title: 'Glossary' }
    ]
  };

  /* ---------- location helpers ---------- */
  var path = (location.pathname || '').replace(/\\/g, '/');
  var file = decodeURIComponent(path.split('/').pop() || '');
  var inLessons = /\/lessons\/[^/]*$/.test(path);
  var inRef = /\/reference\/[^/]*$/.test(path);
  var root = (inLessons || inRef) ? '../' : './';
  var lessonIndex = -1;
  for (var i = 0; i < COURSE.lessons.length; i++) if (COURSE.lessons[i].file === file) lessonIndex = i;

  /* ---------- storage (best effort; private windows may throw) ---------- */
  var store = {
    get: function (k) { try { var v = localStorage.getItem('course:' + k); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem('course:' + k, JSON.stringify(v)); } catch (e) { /* ignore */ } },
    del: function (k) { try { localStorage.removeItem('course:' + k); } catch (e) { /* ignore */ } }
  };

  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'text') n.textContent = attrs[k];
      else if (k === 'html') n.innerHTML = attrs[k];
      else n.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---------- course bar ---------- */
  function renderBar() {
    if (document.querySelector('.course-bar')) return;
    var brand = el('a', { 'class': 'brand', href: root + 'index.html', html: 'tawk.to <span class="dot">&times;</span> your Claude chatbot' });
    var nav = el('nav');
    if (lessonIndex >= 0) nav.appendChild(el('span', { 'class': 'pos', text: 'Lesson ' + (lessonIndex + 1) + ' of ' + COURSE.lessons.length }));
    var sel = el('select', { 'aria-label': 'Jump to a lesson or reference' });
    sel.appendChild(el('option', { value: '', text: 'Jump to…' }));
    var g1 = el('optgroup', { label: 'Lessons' });
    COURSE.lessons.forEach(function (l, i) { g1.appendChild(el('option', { value: root + 'lessons/' + l.file, text: (i + 1) + '. ' + l.title })); });
    g1.appendChild(el('option', { value: root + 'lessons/review.html', text: 'Spaced review (all lessons)' }));
    sel.appendChild(g1);
    var g2 = el('optgroup', { label: 'Reference' });
    COURSE.references.forEach(function (r) { g2.appendChild(el('option', { value: root + 'reference/' + r.file, text: r.title })); });
    sel.appendChild(g2);
    sel.addEventListener('change', function () { if (sel.value) location.href = sel.value; });
    nav.appendChild(sel);
    nav.appendChild(el('a', { href: root + 'reference/glossary.html', text: 'Glossary' }));
    nav.appendChild(el('a', { href: COURSE.repo, target: '_blank', rel: 'noopener', text: 'Repo' }));
    var bar = el('header', { 'class': 'course-bar' }, [el('div', { 'class': 'inner' }, [brand, nav])]);
    document.body.insertBefore(bar, document.body.firstChild);
  }

  /* ---------- citations → numbered superscripts + Sources list ---------- */
  function renderSources(main) {
    var cites = Array.prototype.slice.call(document.querySelectorAll('a.cite'));
    if (!cites.length) return;
    var order = [], byHref = {};
    cites.forEach(function (a) {
      var href = a.getAttribute('href');
      if (!byHref[href]) { byHref[href] = { n: order.length + 1, label: a.getAttribute('data-label') || a.textContent.trim() || href, href: href }; order.push(byHref[href]); }
      var n = byHref[href].n;
      a.setAttribute('title', byHref[href].label);
      a.setAttribute('target', '_blank'); a.setAttribute('rel', 'noopener');
      a.textContent = '[' + n + ']';
    });
    var ol = el('ol');
    order.forEach(function (s) {
      var host = ''; try { host = new URL(s.href).host; } catch (e) { host = ''; }
      ol.appendChild(el('li', {}, [el('a', { href: s.href, target: '_blank', rel: 'noopener', text: s.label }), host ? el('span', { 'class': 'muted', text: ' — ' + host }) : null]));
    });
    var sec = el('section', { 'class': 'sources' }, [el('h2', { text: 'Sources cited in this page' }), ol]);
    var verified = main.getAttribute('data-verified');
    if (verified) sec.appendChild(el('span', { 'class': 'verified', text: 'Each source was fetched and checked on ' + verified + '. Documentation moves; if a link is stale, ask your teacher to re-verify it.' }));
    main.appendChild(sec);
  }

  /* ---------- ask your teacher + references + prev/next ---------- */
  function renderFooter(main) {
    var ask = main.getAttribute('data-ask') || 'Can you walk me through the part of this lesson I found hardest?';
    main.appendChild(el('div', { 'class': 'callout ask' }, [
      el('span', { 'class': 'label', text: 'Ask your teacher' }),
      el('p', { html: 'The agent that built this course is your tutor. Open a terminal in the course folder, run <code>claude</code>, and ask anything from this lesson, for example: <em>&ldquo;' + esc(ask) + '&rdquo;</em>. Explaining what confused you is itself retrieval practice, so ask early and often.' })
    ]));

    var refs = el('p', { 'class': 'ref-links' }, [el('strong', { text: 'Reference sheets: ' })]);
    COURSE.references.forEach(function (r) { refs.appendChild(el('a', { href: root + 'reference/' + r.file, text: r.title })); });
    main.appendChild(refs);

    if (lessonIndex >= 0) {
      var nav = el('nav', { 'class': 'lesson-nav', 'aria-label': 'Lesson navigation' });
      var prev = COURSE.lessons[lessonIndex - 1], next = COURSE.lessons[lessonIndex + 1];
      if (prev) nav.appendChild(el('a', { 'class': 'prev', href: root + 'lessons/' + prev.file }, [el('span', { 'class': 'dir', text: '← Previous' }), document.createTextNode(prev.title)]));
      if (next) nav.appendChild(el('a', { 'class': 'next', href: root + 'lessons/' + next.file }, [el('span', { 'class': 'dir', text: 'Next →' }), document.createTextNode(next.title)]));
      else nav.appendChild(el('a', { 'class': 'next', href: root + 'lessons/review.html' }, [el('span', { 'class': 'dir', text: 'Next →' }), document.createTextNode('Spaced review of the whole course')]));
      main.appendChild(nav);
    }
  }

  /* ---------- copy buttons ---------- */
  function renderCopyButtons() {
    Array.prototype.forEach.call(document.querySelectorAll('pre'), function (pre) {
      if (pre.querySelector('.copy-btn')) return;
      var btn = el('button', { 'class': 'copy-btn', type: 'button', text: 'Copy', 'aria-label': 'Copy code' });
      btn.addEventListener('click', function () {
        var code = pre.querySelector('code');
        var text = (code ? code.innerText : pre.innerText).replace(/\n?Copy$/, '');
        var done = function () { btn.textContent = 'Copied'; btn.setAttribute('data-done', '1'); setTimeout(function () { btn.textContent = 'Copy'; btn.removeAttribute('data-done'); }, 1500); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); });
        else { fallbackCopy(text); done(); }
      });
      pre.appendChild(btn);
    });
  }
  function fallbackCopy(text) {
    var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) { /* ignore */ } document.body.removeChild(ta);
  }

  /* ---------- checklists ---------- */
  function renderChecklists() {
    Array.prototype.forEach.call(document.querySelectorAll('ul.checklist'), function (ul, ui) {
      var key = 'check:' + file + ':' + (ul.id || ui);
      var state = store.get(key) || {};
      Array.prototype.forEach.call(ul.querySelectorAll('li'), function (li, li_i) {
        var cb = li.querySelector('input[type="checkbox"]');
        if (!cb) { cb = el('input', { type: 'checkbox' }); var span = el('span', { html: li.innerHTML }); li.innerHTML = ''; li.appendChild(cb); li.appendChild(span); }
        var id = cb.getAttribute('data-key') || String(li_i);
        cb.checked = !!state[id]; li.classList.toggle('done', cb.checked);
        cb.addEventListener('change', function () { state[id] = cb.checked; li.classList.toggle('done', cb.checked); store.set(key, state); });
      });
    });
  }

  /* ---------- external links open in new tab ---------- */
  function markExternal() {
    Array.prototype.forEach.call(document.querySelectorAll('a[href^="http"]'), function (a) {
      if (!a.getAttribute('target')) { a.setAttribute('target', '_blank'); a.setAttribute('rel', 'noopener'); }
    });
  }

  window.Course = { COURSE: COURSE, root: root, file: file, lessonIndex: lessonIndex, store: store, el: el, esc: esc };

  function init() {
    var main = document.querySelector('main');
    renderBar();
    if (main && !main.hasAttribute('data-no-footer')) { renderSources(main); renderFooter(main); }
    renderCopyButtons();
    renderChecklists();
    markExternal();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
