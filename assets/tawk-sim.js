/* ------------------------------------------------------------------
   tawk-sim.js — an in-browser stand-in for the tawk.to widget and its
   JavaScript API, so you can practise driving Tawk_API without a live
   property. It mirrors the names, argument shapes, limits and error
   codes documented at https://developer.tawk.to/jsapi/ (checked
   2026-10-17). It is a teaching simulator, not the real widget: the
   real one talks to tawk.to's servers and your dashboard.

   Usage:
     const sim = TawkSim.create(document.querySelector('#sim'), {
       apiKey: 'sim-api-key',          // "site API key" for secure mode
       status: 'online',               // online | away | offline
     });
     // Your lesson code then uses window.Tawk_API exactly as on a site.
     sim.simulate.agentJoin('Dana');   // drive the other side
     sim.simulate.agentMessage('Hi!');
     sim.state                          // inspect attributes, tags, events…
   ------------------------------------------------------------------ */
(function () {
  'use strict';

  var CSS = '' +
    '.tawk-sim{font-family:var(--font-sans,system-ui);font-size:.86rem}' +
    '.tawk-sim .sim-stage{position:relative;min-height:27rem;border:1px dashed var(--rule,#ccc);border-radius:12px;background:repeating-linear-gradient(45deg,transparent 0 12px,rgba(127,127,127,.05) 12px 24px);padding:1rem;overflow:hidden}' +
    '.tawk-sim .sim-page{color:var(--fg-muted,#666);font-size:.8rem}' +
    '.tawk-sim .sim-widget{position:absolute;right:1rem;bottom:1rem;width:17rem;display:flex;flex-direction:column;align-items:flex-end;gap:.5rem}' +
    '.tawk-sim .sim-widget[data-hidden="1"]{display:none}' +
    '.tawk-sim .sim-panel{width:100%;background:var(--bg-raised,#fff);border:1px solid var(--rule,#ddd);border-radius:14px;box-shadow:0 10px 30px -14px rgba(0,0,0,.45);overflow:hidden;display:none}' +
    '.tawk-sim .sim-widget[data-max="1"] .sim-panel{display:block}' +
    '.tawk-sim .sim-head{display:flex;align-items:center;gap:.5rem;padding:.55rem .75rem;background:var(--accent,#0f7b5f);color:#fff;font-weight:600}' +
    '.tawk-sim .sim-dot{width:.55rem;height:.55rem;border-radius:50%;background:#7CFC9A;box-shadow:0 0 0 2px rgba(255,255,255,.4)}' +
    '.tawk-sim .sim-dot[data-s="away"]{background:#ffd166}.tawk-sim .sim-dot[data-s="offline"]{background:#bbb}' +
    '.tawk-sim .sim-head button{margin-left:auto;background:transparent;border:0;color:#fff;font-size:1rem;cursor:pointer;padding:0 .2rem}' +
    '.tawk-sim .sim-msgs{height:10rem;overflow:auto;padding:.6rem;display:flex;flex-direction:column;gap:.35rem;background:var(--bg,#fafafa)}' +
    '.tawk-sim .b{max-width:85%;padding:.4rem .6rem;border-radius:11px;line-height:1.3;font-size:.8rem}' +
    '.tawk-sim .b.v{align-self:flex-end;background:var(--accent,#0f7b5f);color:#fff;border-bottom-right-radius:3px}' +
    '.tawk-sim .b.a{align-self:flex-start;background:var(--code-bg,#eee);border-bottom-left-radius:3px}' +
    '.tawk-sim .b.s{align-self:center;color:var(--fg-muted,#777);font-style:italic;font-size:.72rem;background:transparent}' +
    '.tawk-sim .sim-input{display:flex;gap:.3rem;padding:.45rem;border-top:1px solid var(--rule,#eee);background:var(--bg-raised,#fff)}' +
    '.tawk-sim .sim-input input{flex:1;min-width:0;font:inherit;font-size:.8rem;padding:.35rem .5rem;border:1px solid var(--rule,#ddd);border-radius:8px;background:var(--bg,#fff);color:var(--fg,#111)}' +
    '.tawk-sim .sim-input button{font:inherit;font-size:.75rem;border:0;border-radius:8px;background:var(--accent,#0f7b5f);color:#fff;padding:.35rem .6rem;cursor:pointer}' +
    '.tawk-sim .sim-bubble{width:3.2rem;height:3.2rem;border-radius:50%;border:0;background:var(--accent,#0f7b5f);color:#fff;font-size:1.3rem;cursor:pointer;box-shadow:0 8px 20px -8px rgba(0,0,0,.5);position:relative}' +
    '.tawk-sim .sim-bubble .unread{position:absolute;top:-.25rem;right:-.25rem;background:#d33;color:#fff;font-size:.65rem;border-radius:999px;min-width:1.1rem;height:1.1rem;display:none;align-items:center;justify-content:center;padding:0 .25rem}' +
    '.tawk-sim .sim-bubble .unread[data-n]:not([data-n="0"]){display:inline-flex}' +
    '.tawk-sim .sim-inspect{display:grid;grid-template-columns:repeat(auto-fit,minmax(11rem,1fr));gap:.5rem .9rem;margin-top:.7rem;font-size:.78rem}' +
    '.tawk-sim .sim-inspect b{display:block;font-size:.66rem;text-transform:uppercase;letter-spacing:.08em;color:var(--fg-muted,#777)}' +
    '.tawk-sim .sim-inspect code{font-size:.74rem;word-break:break-all}' +
    '.tawk-sim .sim-controls{display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.6rem}' +
    '.tawk-sim .sim-controls button{font:inherit;font-size:.74rem;padding:.3rem .55rem;border-radius:6px;border:1px solid var(--rule,#ccc);background:var(--bg-raised,#fff);color:var(--fg,#111);cursor:pointer}' +
    '.tawk-sim .sim-controls button:hover{border-color:var(--accent,#0f7b5f);color:var(--accent,#0f7b5f)}';

  function injectCss() {
    if (document.getElementById('tawk-sim-css')) return;
    var s = document.createElement('style'); s.id = 'tawk-sim-css'; s.textContent = CSS; document.head.appendChild(s);
  }

  function j(v) { try { var s = JSON.stringify(v); return s && s.length > 90 ? s.slice(0, 87) + '…' : s; } catch (e) { return String(v); } }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  async function hmacSha256Hex(key, message) {
    var enc = new TextEncoder();
    var k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    var sig = await crypto.subtle.sign('HMAC', k, enc.encode(message));
    return Array.prototype.map.call(new Uint8Array(sig), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
  }

  function create(root, opts) {
    opts = opts || {};
    injectCss();
    var apiKey = opts.apiKey || 'sim-site-api-key';
    var state = {
      loaded: false, started: false, status: opts.status || 'online',
      maximized: false, hidden: false, ongoing: false, engaged: false,
      attributes: {}, tags: [], events: [], visitor: null, secure: false, user: null,
      draft: '', messages: [], unread: 0, windowType: 'embed', agents: []
    };

    /* ----- UI ----- */
    root.classList.add('tawk-sim');
    root.innerHTML =
      '<div class="sim-stage"><div class="sim-page">Your web page (simulated). The widget below behaves like tawk.to\'s, driven by <code>window.Tawk_API</code>.</div>' +
      '<div class="sim-widget" data-max="0" data-hidden="0">' +
      '<div class="sim-panel"><div class="sim-head"><span class="sim-dot" data-s="' + esc(state.status) + '"></span><span>Chat with us</span><button type="button" class="sim-min" aria-label="Minimize">&#x2013;</button></div>' +
      '<div class="sim-msgs" aria-live="polite"></div>' +
      '<div class="sim-input"><input type="text" placeholder="Type a message…" aria-label="Visitor message"><button type="button" class="sim-send">Send</button></div></div>' +
      '<button type="button" class="sim-bubble" aria-label="Open chat">&#x1F4AC;<span class="unread" data-n="0">0</span></button>' +
      '</div></div>' +
      '<div class="sim-inspect">' +
      '<div><b>Status</b><code class="i-status"></code></div><div><b>Identity</b><code class="i-visitor"></code></div>' +
      '<div><b>Attributes</b><code class="i-attrs"></code></div><div><b>Tags</b><code class="i-tags"></code></div>' +
      '<div><b>Events</b><code class="i-events"></code></div><div><b>Chat</b><code class="i-chat"></code></div></div>' +
      '<div class="sim-controls"><span class="muted" style="align-self:center">Simulate the other side:</span>' +
      '<button type="button" data-act="join">Agent joins</button><button type="button" data-act="reply">Agent replies</button>' +
      '<button type="button" data-act="away">Status: away</button><button type="button" data-act="offline">Status: offline</button><button type="button" data-act="online">Status: online</button>' +
      '<button type="button" data-act="end">End chat</button><button type="button" data-act="reset">Reset</button></div>' +
      '<div class="log" aria-label="Simulator log"></div>';

    var $ = function (sel) { return root.querySelector(sel); };
    var widget = $('.sim-widget'), msgs = $('.sim-msgs'), logEl = $('.log'), input = $('.sim-input input'), dot = $('.sim-dot'), unread = $('.unread');

    function log(cls, text) {
      var line = document.createElement('div'); line.className = cls; line.textContent = text; logEl.appendChild(line); logEl.scrollTop = logEl.scrollHeight;
    }
    function bubble(kind, text) {
      var b = document.createElement('div'); b.className = 'b ' + kind; b.textContent = text; msgs.appendChild(b); msgs.scrollTop = msgs.scrollHeight;
    }
    function paint() {
      widget.setAttribute('data-max', state.maximized ? '1' : '0');
      widget.setAttribute('data-hidden', state.hidden ? '1' : '0');
      dot.setAttribute('data-s', state.status);
      unread.setAttribute('data-n', String(state.unread)); unread.textContent = String(state.unread);
      $('.i-status').textContent = state.status + (state.started ? '' : ' (not started)');
      $('.i-visitor').textContent = state.user ? ('login userId=' + state.user.userId + (state.user.name ? ' name=' + state.user.name : '')) : (state.visitor ? (state.visitor.name || '?') + ' <' + (state.visitor.email || '?') + '>' + (state.secure ? ' (secure)' : ' (not secure)') : 'anonymous');
      $('.i-attrs').textContent = Object.keys(state.attributes).length ? JSON.stringify(state.attributes) : '{}';
      $('.i-tags').textContent = state.tags.length ? JSON.stringify(state.tags) : '[]';
      $('.i-events').textContent = state.events.length ? state.events.map(function (e) { return e.name; }).join(', ') : 'none';
      $('.i-chat').textContent = (state.ongoing ? 'ongoing' : 'idle') + (state.agents.length ? ' · agent: ' + state.agents.join(', ') : '') + (state.draft ? ' · draft set' : '');
    }

    /* ----- the API object ----- */
    var api = {};
    // Keep callbacks the page assigned before the "embed" loaded, like the real snippet does.
    if (window.Tawk_API && typeof window.Tawk_API === 'object') Object.keys(window.Tawk_API).forEach(function (k) { api[k] = window.Tawk_API[k]; });

    function fire(name) {
      var args = Array.prototype.slice.call(arguments, 1);
      if (typeof api[name] === 'function') {
        try { api[name].apply(api, args); log('evt', '→ ' + name + '(' + args.map(j).join(', ') + ')'); }
        catch (e) { log('err', name + ' threw: ' + e.message); }
      } else {
        log('dim', '(no handler) ' + name + '(' + args.map(j).join(', ') + ')');
      }
    }
    function cb(fn, err) { if (typeof fn === 'function') { try { fn(err); } catch (e) { log('err', 'callback threw: ' + e.message); } } }
    function sys(text) { bubble('s', text); fire('onChatMessageSystem', text); }
    var KEY_RE = /^[A-Za-z0-9-]+$/;

    function doStart() {
      if (state.started) return;
      state.started = true;
      if (api.visitor && typeof api.visitor === 'object') {
        state.visitor = { name: api.visitor.name, email: api.visitor.email, phone: api.visitor.phone };
        if (api.visitor.hash && api.visitor.email) {
          hmacSha256Hex(apiKey, api.visitor.email).then(function (h) {
            state.secure = (h === api.visitor.hash);
            log(state.secure ? 'ok' : 'err', state.secure ? 'secure mode: hash verified for ' + api.visitor.email : 'secure mode: hash did NOT match for ' + api.visitor.email + ' (visitor treated as unverified)');
            paint();
          });
        }
      }
      setTimeout(function () {
        fire('onBeforeLoad');
        state.loaded = true;
        fire('onLoad');
        fire('onStatusChange', state.status);
        paint();
      }, 60);
    }

    api.start = function (options) { log('dim', 'Tawk_API.start(' + j(options) + ')'); doStart(); if (options && options.showWidget) { state.hidden = false; paint(); } };
    api.shutdown = function () { log('dim', 'Tawk_API.shutdown()'); state.started = false; state.loaded = false; paint(); };
    api.switchWidget = function (data, callback) { log('dim', 'Tawk_API.switchWidget(' + j(data) + ')'); state.user = null; sys('Switched to widget ' + (data && data.widgetId)); cb(callback, undefined); };
    api.login = function (data, callback) {
      log('dim', 'Tawk_API.login(' + j(data) + ')');
      if (!data || !data.userId || !data.hash) { cb(callback, 'INVALID_LOGIN_DATA'); return; }
      hmacSha256Hex(apiKey, data.userId).then(function (h) {
        if (h !== data.hash) { log('err', 'login: hash mismatch for userId ' + data.userId); cb(callback, 'LOGIN_ERROR'); return; }
        state.user = { userId: data.userId, name: typeof data.name === 'object' ? (data.name.first + ' ' + data.name.last) : data.name, email: data.email };
        state.secure = true;
        Object.keys(data).forEach(function (k) { if (['userId', 'hash', 'name', 'email', 'phone'].indexOf(k) < 0) state.attributes[k] = data[k]; });
        log('ok', 'login: verified; previous conversation restored for ' + data.userId);
        sys('Welcome back' + (state.user.name ? ', ' + state.user.name : '') + '.');
        paint(); cb(callback, undefined);
      });
    };
    api.logout = function (callback) { log('dim', 'Tawk_API.logout()'); state.user = null; state.secure = false; paint(); cb(callback, undefined); };

    api.maximize = function () { state.maximized = true; state.hidden = false; state.unread = 0; paint(); fire('onChatMaximized'); };
    api.minimize = function () { state.maximized = false; paint(); fire('onChatMinimized'); };
    api.toggle = function () { if (state.maximized) api.minimize(); else api.maximize(); };
    api.popup = function () { log('dim', 'Tawk_API.popup(): a real widget opens a pop-out window here'); };
    api.getWindowType = function () { return state.windowType; };
    api.showWidget = function () { state.hidden = false; paint(); };
    api.hideWidget = function () { state.hidden = true; paint(); fire('onChatHidden'); };
    api.toggleVisibility = function () { if (state.hidden) api.showWidget(); else api.hideWidget(); };
    api.getStatus = function () { return state.status; };
    api.isChatMaximized = function () { return state.maximized; };
    api.isChatMinimized = function () { return !state.maximized; };
    api.isChatHidden = function () { return state.hidden; };
    api.isChatOngoing = function () { return state.ongoing; };
    api.isVisitorEngaged = function () { return state.engaged; };
    api.endChat = function () { if (state.ongoing) { state.ongoing = false; state.agents = []; sys('Chat ended.'); paint(); fire('onChatEnded'); } };

    api.setAttributes = function (attributes, callback) {
      log('dim', 'Tawk_API.setAttributes(' + j(attributes) + ')');
      if (!attributes || typeof attributes !== 'object') { cb(callback, 'INVALID_ATTRIBUTES'); return; }
      var keys = Object.keys(attributes);
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i], v = attributes[k];
        if (!KEY_RE.test(k)) { cb(callback, 'CONTAINS_INVALID_KEY'); return; }
        if (v === undefined || v === null || String(v).length === 0 || String(v).length > 255) { cb(callback, 'CONTAINS_INVALID_VALUE'); return; }
        if ((k === 'name' || k === 'email') && !state.secure) { log('err', 'setAttributes: name/email need secure mode (hash)'); cb(callback, 'ACCESS_ERROR'); return; }
      }
      var next = Object.assign({}, state.attributes);
      keys.forEach(function (k) { if (k !== 'name' && k !== 'email' && k !== 'hash') next[k.toLowerCase()] = String(attributes[k]); });
      if (Object.keys(next).length > 50) { cb(callback, 'ATTRIBUTE_LIMIT_EXCEEDED'); return; }
      state.attributes = next;
      if (attributes.name) { state.visitor = state.visitor || {}; state.visitor.name = attributes.name; }
      if (attributes.email) { state.visitor = state.visitor || {}; state.visitor.email = attributes.email; }
      paint(); cb(callback, undefined);
    };
    api.setChatInputMessage = function (message, callback) {
      log('dim', 'Tawk_API.setChatInputMessage(' + j(message) + ')');
      state.draft = String(message || ''); input.value = state.draft; paint(); cb(callback, undefined);
    };
    api.addEvent = function (eventName, metadata, callback) {
      if (typeof metadata === 'function') { callback = metadata; metadata = undefined; }
      log('dim', 'Tawk_API.addEvent(' + j(eventName) + (metadata ? ', ' + j(metadata) : '') + ')');
      if (!eventName || !KEY_RE.test(eventName)) { cb(callback, 'INVALID_EVENT_NAME'); return; }
      if (metadata && typeof metadata === 'object') {
        var ks = Object.keys(metadata);
        for (var i = 0; i < ks.length; i++) { if (!KEY_RE.test(ks[i])) { cb(callback, 'CONTAINS_INVALID_KEY'); return; } if (String(metadata[ks[i]]).length > 255) { cb(callback, 'CONTAINS_INVALID_VALUE'); return; } }
      }
      state.events.push({ name: eventName, metadata: metadata || {}, at: Date.now() });
      paint(); cb(callback, undefined);
    };
    api.addTags = function (tags, callback) {
      log('dim', 'Tawk_API.addTags(' + j(tags) + ')');
      if (!Array.isArray(tags) || tags.some(function (t) { return typeof t !== 'string' || !t; })) { cb(callback, 'INVALID_TAGS'); return; }
      var next = state.tags.slice(); tags.forEach(function (t) { if (next.indexOf(t) < 0) next.push(t); });
      if (next.length > 10) { cb(callback, 'TAG_LIMIT_EXCEEDED'); return; }
      state.tags = next; paint(); fire('onTagsUpdated', { tags: state.tags.slice() }); cb(callback, undefined);
    };
    api.removeTags = function (tags, callback) {
      log('dim', 'Tawk_API.removeTags(' + j(tags) + ')');
      if (!Array.isArray(tags)) { cb(callback, 'INVALID_TAGS'); return; }
      state.tags = state.tags.filter(function (t) { return tags.indexOf(t) < 0; }); paint(); fire('onTagsUpdated', { tags: state.tags.slice() }); cb(callback, undefined);
    };

    /* ----- visitor side of the simulated widget ----- */
    function visitorSend(text) {
      if (!text) return;
      if (!state.ongoing) { state.ongoing = true; state.engaged = true; fire('onChatStarted'); }
      bubble('v', text); state.draft = ''; input.value = ''; state.messages.push({ from: 'visitor', text: text });
      paint(); fire('onChatMessageVisitor', text);
    }
    $('.sim-send').addEventListener('click', function () { visitorSend(input.value.trim()); });
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') visitorSend(input.value.trim()); });
    $('.sim-bubble').addEventListener('click', function () { api.maximize(); });
    $('.sim-min').addEventListener('click', function () { api.minimize(); });

    /* ----- the other side ----- */
    var simulate = {
      agentJoin: function (name) {
        name = name || 'Dana'; if (state.agents.indexOf(name) < 0) state.agents.push(name);
        if (!state.ongoing) { state.ongoing = true; }
        sys(name + ' joined the chat.'); paint();
        fire('onAgentJoinChat', { name: name, position: 'Support', image: '', id: 'agent-' + name.toLowerCase() });
      },
      agentMessage: function (text) {
        text = text || 'Hi! I can see your details. How can I help?';
        if (!state.agents.length) simulate.agentJoin('Dana');
        bubble('a', text); state.messages.push({ from: 'agent', text: text });
        if (!state.maximized) { state.unread++; fire('onUnreadCountChanged', state.unread); }
        paint(); fire('onChatMessageAgent', text);
      },
      setStatus: function (s) { state.status = s; paint(); fire('onStatusChange', s); },
      visitorMessage: visitorSend,
      satisfaction: function (n) { fire('onChatSatisfaction', n); },
      end: function () { api.endChat(); },
      reset: function () { create(root, opts); }
    };
    root.querySelector('.sim-controls').addEventListener('click', function (e) {
      var act = e.target && e.target.getAttribute('data-act'); if (!act) return;
      if (act === 'join') simulate.agentJoin('Dana');
      else if (act === 'reply') simulate.agentMessage();
      else if (act === 'away' || act === 'offline' || act === 'online') simulate.setStatus(act);
      else if (act === 'end') simulate.end();
      else if (act === 'reset') simulate.reset();
    });

    window.Tawk_API = api;
    paint();
    log('dim', 'simulator ready · site API key for secure mode: "' + apiKey + '"');
    if (api.autoStart !== false) doStart(); else log('dim', 'autoStart=false: call Tawk_API.start() yourself');

    return { api: api, state: state, simulate: simulate, hmacSha256Hex: hmacSha256Hex, apiKey: apiKey, log: log };
  }

  window.TawkSim = { create: create, hmacSha256Hex: hmacSha256Hex };
})();
