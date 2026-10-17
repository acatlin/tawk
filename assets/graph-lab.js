/* ------------------------------------------------------------------
   graph-lab.js — a toy Graph RAG explorer.

   You give it triples (subject | predicate | object | source) and a few
   text chunks. It draws the graph, lets you pick a question, and shows
   two retrievals side by side:
     • graph: k-hop neighbourhood of the question's entities
     • chunks: top-k text chunks by keyword overlap (stand-in for vector search)
   and whether each retrieval actually contains the answer. The point is
   intuition, not benchmarks: multi-hop questions are where a graph earns
   its keep, single-fact questions usually do not need one.

   Usage: GraphLab.mount(root, { triples: '...', chunks: [...], questions: [...] })
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
  function svgEl(tag, attrs) { var n = document.createElementNS('http://www.w3.org/2000/svg', tag); if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); }); return n; }

  var STOP = ['a', 'an', 'the', 'is', 'are', 'i', 'to', 'of', 'in', 'on', 'for', 'do', 'does', 'can', 'how', 'what', 'which', 'my', 'me', 'it', 'you', 'your', 'we', 'our', 'and', 'or', 'with', 'be', 'this', 'that', 'get', 'have', 'has', 'who', 'if', 'am', 'as', 'at', 'by', 'from'];
  function tokens(s) { return String(s).toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter(function (w) { return w && STOP.indexOf(w) < 0; }).map(function (w) { return w.replace(/(ing|ed|es|s)$/, ''); }); }

  function parseTriples(text) {
    return text.split('\n').map(function (l) { return l.trim(); }).filter(function (l) { return l && l[0] !== '#'; }).map(function (l) {
      var p = l.split('|').map(function (x) { return x.trim(); });
      return { s: p[0], p: p[1] || 'related to', o: p[2] || '', src: p[3] || '' };
    }).filter(function (t) { return t.s && t.o; });
  }
  function buildGraph(triples) {
    var nodes = {}, edges = [], adj = {};
    function add(n) { if (!nodes[n]) { nodes[n] = { id: n, deg: 0 }; adj[n] = []; } }
    triples.forEach(function (t, i) {
      add(t.s); add(t.o);
      edges.push({ id: i, s: t.s, o: t.o, p: t.p, src: t.src });
      adj[t.s].push({ to: t.o, e: i }); adj[t.o].push({ to: t.s, e: i });
      nodes[t.s].deg++; nodes[t.o].deg++;
    });
    return { nodes: Object.keys(nodes).map(function (k) { return nodes[k]; }), edges: edges, adj: adj };
  }
  function neighborhood(g, seeds, k) {
    var seen = {}, frontier = [], edgeSet = {};
    seeds.forEach(function (s) { if (g.adj[s]) { seen[s] = 0; frontier.push(s); } });
    for (var hop = 1; hop <= k; hop++) {
      var next = [];
      frontier.forEach(function (n) {
        (g.adj[n] || []).forEach(function (a) { edgeSet[a.e] = true; if (seen[a.to] === undefined) { seen[a.to] = hop; next.push(a.to); } });
      });
      frontier = next;
    }
    return { nodes: seen, edges: Object.keys(edgeSet).map(Number) };
  }
  function layout(g, w, h) {
    var N = g.nodes.length, idx = {}; g.nodes.forEach(function (n, i) { idx[n.id] = i; n.x = w / 2 + (Math.random() - .5) * w * .6; n.y = h / 2 + (Math.random() - .5) * h * .6; n.vx = 0; n.vy = 0; });
    var k = Math.sqrt((w * h) / Math.max(N, 1)) * .9;
    for (var it = 0; it < 320; it++) {
      var t = 1 - it / 320, step = 6 * t + .4;
      for (var i = 0; i < N; i++) { g.nodes[i].fx = 0; g.nodes[i].fy = 0; }
      for (i = 0; i < N; i++) for (var j = i + 1; j < N; j++) {
        var a = g.nodes[i], b = g.nodes[j], dx = a.x - b.x, dy = a.y - b.y, d = Math.sqrt(dx * dx + dy * dy) || .01, f = (k * k) / d;
        a.fx += dx / d * f; a.fy += dy / d * f; b.fx -= dx / d * f; b.fy -= dy / d * f;
      }
      g.edges.forEach(function (e) {
        var a = g.nodes[idx[e.s]], b = g.nodes[idx[e.o]], dx = a.x - b.x, dy = a.y - b.y, d = Math.sqrt(dx * dx + dy * dy) || .01, f = (d * d) / k;
        a.fx -= dx / d * f; a.fy -= dy / d * f; b.fx += dx / d * f; b.fy += dy / d * f;
      });
      g.nodes.forEach(function (n) {
        var fl = Math.sqrt(n.fx * n.fx + n.fy * n.fy) || .01, m = Math.min(fl, step);
        n.x += n.fx / fl * m; n.y += n.fy / fl * m;
        n.x += (w / 2 - n.x) * .01; n.y += (h / 2 - n.y) * .01;
        n.x = Math.max(60, Math.min(w - 60, n.x)); n.y = Math.max(24, Math.min(h - 24, n.y));
      });
    }
    return idx;
  }
  function draw(svg, g, idx, hl, seeds) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var defs = svgEl('defs'); var m = svgEl('marker', { id: 'gl-arrow', viewBox: '0 0 10 10', refX: '18', refY: '5', markerWidth: '7', markerHeight: '7', orient: 'auto-start-reverse' });
    var path = svgEl('path', { d: 'M 0 0 L 10 5 L 0 10 z' }); path.setAttribute('class', 'arrowhead'); m.appendChild(path); defs.appendChild(m); svg.appendChild(defs);
    g.edges.forEach(function (e) {
      var a = g.nodes[idx[e.s]], b = g.nodes[idx[e.o]], on = hl && hl.edges.indexOf(e.id) >= 0;
      var line = svgEl('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, 'marker-end': 'url(#gl-arrow)' }); line.setAttribute('class', 'edge' + (on ? ' on' : (hl ? ' off' : '')));
      svg.appendChild(line);
      var tx = svgEl('text', { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - 4, 'text-anchor': 'middle' }); tx.setAttribute('class', 'small elabel' + (on ? ' on' : (hl ? ' off' : ''))); tx.textContent = e.p; svg.appendChild(tx);
    });
    g.nodes.forEach(function (n) {
      var hop = hl ? hl.nodes[n.id] : undefined, isSeed = seeds && seeds.indexOf(n.id) >= 0;
      var grp = svgEl('g'); grp.setAttribute('class', 'gnode' + (isSeed ? ' seed' : (hop !== undefined ? ' hop' + hop : (hl ? ' off' : ''))));
      var r = 7 + Math.min(n.deg, 6);
      var c = svgEl('circle', { cx: n.x, cy: n.y, r: r }); c.setAttribute('class', 'node' + (isSeed ? ' warm' : (hop !== undefined ? ' accent' : ''))); grp.appendChild(c);
      var t = svgEl('text', { x: n.x, y: n.y - r - 4, 'text-anchor': 'middle' }); t.textContent = n.id; grp.appendChild(t);
      svg.appendChild(grp);
    });
  }

  function rankChunks(chunks, question, k) {
    var qt = tokens(question);
    return chunks.map(function (c) { var ct = tokens(c.text), hit = 0; qt.forEach(function (t) { if (ct.indexOf(t) >= 0) hit++; }); return { c: c, score: hit / Math.max(qt.length, 1) }; })
      .sort(function (a, b) { return b.score - a.score; }).slice(0, k);
  }

  var CSS = '.graph-lab svg{width:100%;height:auto;border:1px solid var(--rule,#ddd);border-radius:10px;background:var(--bg,#fff)}' +
    '.graph-lab .edge{stroke:var(--fg-muted,#777);stroke-width:1.2;opacity:.9}.graph-lab .edge.on{stroke:var(--accent,#0f7b5f);stroke-width:2.4}.graph-lab .edge.off,.graph-lab .elabel.off{opacity:.18}' +
    '.graph-lab .elabel{font-size:9.5px;fill:var(--fg-muted,#777);font-family:var(--font-sans,system-ui)}.graph-lab .elabel.on{fill:var(--accent,#0f7b5f);font-weight:600}' +
    '.graph-lab .gnode text{font-size:10.5px;font-family:var(--font-sans,system-ui);fill:var(--fg,#111)}.graph-lab .gnode.off{opacity:.25}.graph-lab .gnode.seed text{font-weight:700}' +
    '.graph-lab .arrowhead{fill:var(--fg-muted,#777)}.graph-lab .node{fill:var(--bg-raised,#fff);stroke:var(--fg,#111);stroke-width:1.2}.graph-lab .node.accent{fill:var(--accent-soft,#e4f2ec);stroke:var(--accent,#0f7b5f)}.graph-lab .node.warm{fill:var(--accent-2-soft,#f9e9e0);stroke:var(--accent-2,#b4552d);stroke-width:2}' +
    '.graph-lab .cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(16rem,1fr));gap:.8rem;margin-top:.7rem}.graph-lab .col{border:1px solid var(--rule,#ddd);border-radius:8px;padding:.6rem .8rem;font-size:.82rem}.graph-lab .col h4{margin:.1rem 0 .4rem}' +
    '.graph-lab .verdict{font-weight:700}.graph-lab .verdict.ok{color:var(--ok,#1a7f37)}.graph-lab .verdict.bad{color:var(--bad,#b3261e)}.graph-lab .chunk{border-left:2px solid var(--rule,#ddd);padding-left:.5rem;margin:.35rem 0;color:var(--fg-muted,#555)}.graph-lab .chunk.hit{border-color:var(--ok,#1a7f37);color:var(--fg,#111)}';

  function mount(root, opts) {
    if (!document.getElementById('graph-lab-css')) { var s = document.createElement('style'); s.id = 'graph-lab-css'; s.textContent = CSS; document.head.appendChild(s); }
    root.classList.add('lab'); root.classList.add('graph-lab'); root.innerHTML = '';
    root.appendChild(el('h3', { text: opts.title || 'Graph vs chunks: a toy retrieval race' }));
    root.appendChild(el('p', { 'class': 'hint', html: 'Pick a question. The graph side retrieves the <em>k-hop neighbourhood</em> of the entities named in the question; the chunk side retrieves the top-k text chunks by keyword overlap (a stand-in for embeddings). Each side reports whether the answer is actually inside what it retrieved. Then edit the triples and watch what changes.' }));

    var row = el('div', { 'class': 'row' });
    var qsel = el('select', { 'aria-label': 'Question', style: 'flex:1;min-width:18rem' });
    opts.questions.forEach(function (q, i) { qsel.appendChild(el('option', { value: String(i), text: q.q })); });
    var hops = el('input', { type: 'range', min: '1', max: '3', step: '1', value: '2', 'aria-label': 'Graph hops' }); var hopsV = el('code', { text: '2' });
    var topk = el('select', { 'aria-label': 'Chunks retrieved' }); [2, 3, 4, 6].forEach(function (n) { topk.appendChild(el('option', { value: String(n), text: 'top-' + n + ' chunks' })); });
    row.appendChild(qsel); row.appendChild(el('label', {}, [document.createTextNode('hops '), hops])); row.appendChild(hopsV); row.appendChild(topk);
    root.appendChild(row);

    var svg = svgEl('svg', { viewBox: '0 0 760 420', role: 'img', 'aria-label': 'Knowledge graph' }); root.appendChild(svg);
    var cols = el('div', { 'class': 'cols' }); var colG = el('div', { 'class': 'col' }), colC = el('div', { 'class': 'col' }); cols.appendChild(colG); cols.appendChild(colC); root.appendChild(cols);

    var det = el('details'); det.appendChild(el('summary', { text: 'Edit the triples (subject | predicate | object | source) and rebuild' }));
    var ta = el('textarea', { 'aria-label': 'Triples', style: 'min-height:11rem' }); ta.value = opts.triples; det.appendChild(ta);
    var rebuild = el('button', { type: 'button', 'class': 'secondary', text: 'Rebuild graph', style: 'margin-top:.4rem' }); det.appendChild(rebuild); root.appendChild(det);

    var g, idx;
    function build() { g = buildGraph(parseTriples(ta.value)); idx = layout(g, 760, 420); run(); }
    function run() {
      var q = opts.questions[parseInt(qsel.value, 10)], k = parseInt(hops.value, 10), K = parseInt(topk.value, 10);
      hopsV.textContent = String(k);
      var seeds = q.entities.filter(function (e) { return g.adj[e]; });
      var hl = neighborhood(g, seeds, k);
      draw(svg, g, idx, hl, seeds);
      var trip = g.edges.filter(function (e) { return hl.edges.indexOf(e.id) >= 0; });
      var gHas = Object.prototype.hasOwnProperty.call(hl.nodes, q.answer);
      colG.innerHTML = '<h4>Graph retrieval · ' + seeds.length + ' seed' + (seeds.length === 1 ? '' : 's') + ', ' + k + ' hop' + (k === 1 ? '' : 's') + '</h4>' +
        '<div class="verdict ' + (gHas ? 'ok' : 'bad') + '">' + (gHas ? 'Answer "' + esc(q.answer) + '" is in the retrieved subgraph' : 'Answer "' + esc(q.answer) + '" is NOT in the retrieved subgraph') + '</div>' +
        '<div class="muted">' + trip.length + ' triples → roughly ' + (trip.length * 12) + ' tokens of context</div>' +
        '<ul>' + trip.map(function (e) { return '<li><b>' + esc(e.s) + '</b> ' + esc(e.p) + ' <b>' + esc(e.o) + '</b>' + (e.src ? ' <span class="muted">[' + esc(e.src) + ']</span>' : '') + '</li>'; }).join('') + '</ul>' +
        (seeds.length < q.entities.length ? '<div class="muted">Entities not found in graph: ' + esc(q.entities.filter(function (e) { return !g.adj[e]; }).join(', ')) + '</div>' : '');
      var top = rankChunks(opts.chunks, q.q, K);
      var cHas = top.some(function (r) { return r.c.text.toLowerCase().indexOf(q.answer.toLowerCase()) >= 0 && (!q.answerNeeds || q.answerNeeds.every(function (s) { return top.some(function (r2) { return r2.c.text.toLowerCase().indexOf(s.toLowerCase()) >= 0; }); })); });
      var approxTokens = top.reduce(function (a, r) { return a + Math.round(r.c.text.split(/\s+/).length * 1.3); }, 0);
      colC.innerHTML = '<h4>Chunk retrieval · top-' + K + ' by keyword overlap</h4>' +
        '<div class="verdict ' + (cHas ? 'ok' : 'bad') + '">' + (cHas ? 'The retrieved chunks contain the facts needed' : 'The retrieved chunks do not connect the facts needed') + '</div>' +
        '<div class="muted">' + top.length + ' chunks → roughly ' + approxTokens + ' tokens of context</div>' +
        top.map(function (r) { var hit = r.c.text.toLowerCase().indexOf(q.answer.toLowerCase()) >= 0; return '<div class="chunk' + (hit ? ' hit' : '') + '"><b>' + esc(r.c.id) + '</b> <span class="muted">(overlap ' + r.score.toFixed(2) + ')</span><br>' + esc(r.c.text) + '</div>'; }).join('') +
        (q.note ? '<div class="muted" style="margin-top:.4rem">' + q.note + '</div>' : '');
    }
    qsel.addEventListener('change', run); hops.addEventListener('input', run); topk.addEventListener('change', run); rebuild.addEventListener('click', build);
    build();
    return { rebuild: build, run: run };
  }

  window.GraphLab = { mount: mount, parseTriples: parseTriples, buildGraph: buildGraph, neighborhood: neighborhood, tokens: tokens };
})();
