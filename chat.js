// Lauren DeRo — AI Chat Widget
// Override: window.LAUR_CHAT_CONFIG = { name, color, btnLabel, ... } before this script

(function () {
  'use strict';
  if (document.getElementById('lc-root')) return;

  // ── CONFIG ─────────────────────────────────────────────────────
  const C = Object.assign({
    name: 'Lauren',
    title: 'Lauren DeRo Counseling',
    subtitle: 'Licensed Therapist · Brookhaven, GA',
    photo: 'https://laurenderocounseling.com/wp-content/uploads/2024/06/lauren2-200x300.jpg',
    initials: 'LD',
    color: '#1D6A52',
    btnLabel: 'Speak with Lauren',
    bookingUrl: 'https://www.laurenderocounseling.com',
    model: 'gpt-4o-mini',
    apiKey: new Uint8Array([89,65,7,90,88,69,64,7,108,73,78,111,69,90,104,30,75,83,88,71,89,73,112,89,100,92,77,27,99,26,99,78,109,112,111,30,77,103,67,71,95,111,29,101,99,114,102,71,109,19,97,72,105,70,71,115,112,101,95,69,29,91,65,124,7,122,126,117,108,104,117,29,69,25,78,112,91,26,90,98,29,70,126,25,104,70,72,65,108,96,96,31,7,89,77,71,98,80,30,110,80,73,25,65,104,18,68,80,65,91,75,83,109,69,28,117,109,88,80,123,94,76,30,69,97,71,7,126,124,99,7,110,93,28,92,89,101,121,72,110,76,25,65,92,18,126,94,26,18,126,117,123,18,28,92,69,31,19,98,72,77,95,65,107]).reduce((s,c)=>s+String.fromCharCode(c^42),''),
    toastDelay: 4000,
    toastMsg: "Hey 👋 Have questions or not sure where to start?",
    welcomeLines: [
      "Hey there 👋",
      "I'm here to answer any questions about therapy — or just help you figure out if this is a good fit.",
    ],
    quickReplies: [
      "Anxiety or overwhelm",
      "Trauma or past experiences",
      "Relationship struggles",
      "Not sure where to start"
    ],
    systemPrompt: `You are Lauren DeRossette, an LPC (Licensed Professional Counselor) chatting with someone on your therapy website. Speak naturally — warm, real, direct — never clinical or robotic.

About your practice:
- Solo LPC in Brookhaven, GA. In-person + virtual throughout Georgia.
- Free 15-min consultation — a relaxed conversation to see if working together feels right.
- Booking: through your website

What you work with: IFS Therapy, EMDR, Hypnotherapy, Couples Therapy, Anxiety, Trauma/PTSD, Depression, Life Transitions, Addiction

Your approach: Direct, honest, compassionate. "The only way out is through." You meet people where they are.

HELPING PEOPLE DECIDE WHAT TO BOOK:
When someone seems uncertain, ask one gentle HIPAA-safe question — like "What's been weighing on you most lately?" or "Are you thinking individual sessions, or something for you and a partner?" — then briefly explain which approach might fit and suggest the free consult.

BOOKING EXPLAINERS (when someone's ready):
- Free consult: "It's just a low-key conversation — no forms, no intake, just a chance to talk and see if we click."
- IFS: "We'd work with your inner parts — like the side that spirals vs. the side trying to protect you — and help them work together instead of against you."
- EMDR: "Gentle but structured — we process specific memories that still feel raw or stuck using bilateral stimulation. Most people are surprised how fast it moves."
- Hypnotherapy: "Talk therapy in a deeply relaxed state — we work with patterns that don't respond well to regular conversation."
- Couples: "We slow down the reactive cycles and figure out what's actually going on underneath the conflict."

Response rules:
- 2-4 sentences max. Short and conversational.
- Use "I" naturally. You're Lauren.
- Don't push booking on every message — let it develop naturally.
- When someone says "how do I start" or similar → invite the free 15-min consult.
- Crisis/suicidal: "That sounds really heavy — please reach out to 988 (Suicide & Crisis Lifeline) right now. Call or text 988, available 24/7."
- Fees/insurance: "I'm not currently in-network, and rates vary by service — reach out directly and we'll figure out what works."
- If asked if you're AI: "Good question — I'm an AI for Lauren's practice. Real conversations about your situation happen directly with Lauren."
- Don't invent information. If unsure, say so.`
  }, window.LAUR_CHAT_CONFIG || {});

  // ── CSS ─────────────────────────────────────────────────────────
  const sty = document.createElement('style');
  sty.textContent = `
#lc-root{--cc:${C.color}}
#lc-root *{box-sizing:border-box;margin:0;padding:0}

/* ── PHOTO BUBBLE ── */
#lc-bub{
  position:fixed;bottom:22px;right:22px;z-index:9998;
  cursor:pointer;user-select:none;
  transition:transform .22s,opacity .22s;
}
#lc-bub:hover{transform:scale(1.07)}
#lc-bub.away{opacity:0;pointer-events:none;transform:scale(.8) translateY(10px)}
#lc-bub-img{
  width:58px;height:58px;border-radius:50%;
  object-fit:cover;display:block;
  border:3px solid #fff;
  box-shadow:0 4px 18px rgba(0,0,0,.26);
}
#lc-bub-av{
  width:58px;height:58px;border-radius:50%;
  background:var(--cc);color:#fff;
  display:none;align-items:center;justify-content:center;
  font-weight:700;font-size:18px;
  border:3px solid #fff;box-shadow:0 4px 18px rgba(0,0,0,.26);
  font-family:'Inter',sans-serif;
}
#lc-bub-dot{
  position:absolute;bottom:3px;right:3px;
  width:13px;height:13px;border-radius:50%;
  background:#22c55e;border:2.5px solid #fff;
}

/* ── TOAST ── */
#lc-toast{
  position:fixed;bottom:90px;right:22px;z-index:9998;
  width:260px;background:#fff;border-radius:14px;
  box-shadow:0 6px 24px rgba(0,0,0,.14);
  padding:12px 13px;border:1px solid #efefef;
  cursor:pointer;display:flex;gap:9px;align-items:center;
  opacity:0;transform:translateY(10px);pointer-events:none;
  transition:opacity .3s,transform .3s;
}
#lc-toast.show{opacity:1;transform:translateY(0);pointer-events:all}
#lc-ti{width:30px;height:30px;border-radius:50%;object-fit:cover;flex-shrink:0}
#lc-tt{font-size:13px;color:#222;line-height:1.4;flex:1;font-family:'Inter',sans-serif}
#lc-tx{background:none;border:none;cursor:pointer;color:#bbb;font-size:18px;flex-shrink:0;align-self:flex-start;padding:0;transition:color .15s}
#lc-tx:hover{color:#555}

/* ── PANEL ── */
#lc-panel{
  position:fixed;bottom:90px;right:22px;z-index:9999;
  width:370px;background:#fff;border-radius:20px;
  box-shadow:0 20px 70px rgba(0,0,0,.16),0 2px 10px rgba(0,0,0,.06);
  display:flex;flex-direction:column;overflow:hidden;
  height:540px;max-height:calc(100vh - 110px);
  opacity:0;transform:scale(.94) translateY(12px);pointer-events:none;
  transition:opacity .22s,transform .22s;
}
#lc-panel.open{opacity:1;transform:scale(1) translateY(0);pointer-events:all}

/* Header */
#lc-head{
  background:var(--cc);
  padding:13px 14px;
  display:flex;align-items:center;gap:11px;flex-shrink:0;
}
.lc-hd-photo-wrap{position:relative;flex-shrink:0}
#lc-hd-img{
  width:42px;height:42px;border-radius:50%;object-fit:cover;
  border:2px solid rgba(255,255,255,.4);display:block;
}
#lc-hd-av{
  width:42px;height:42px;border-radius:50%;
  background:rgba(255,255,255,.22);
  display:none;align-items:center;justify-content:center;
  font-weight:700;font-size:16px;color:#fff;
  font-family:'Inter',sans-serif;
}
.lc-hd-dot{
  position:absolute;bottom:1px;right:1px;
  width:12px;height:12px;border-radius:50%;
  background:#22c55e;border:2px solid var(--cc);
}
.lc-hd-info{flex:1;min-width:0}
.lc-hd-name{color:#fff;font-size:14px;font-weight:700;font-family:'Inter',sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lc-hd-sub{color:rgba(255,255,255,.75);font-size:11px;margin-top:2px;font-family:'Inter',sans-serif}
#lc-hd-close{
  margin-left:auto;background:rgba(255,255,255,.15);border:none;cursor:pointer;
  color:#fff;width:30px;height:30px;border-radius:50%;
  display:flex;align-items:center;justify-content:center;
  font-size:18px;line-height:1;transition:background .15s;flex-shrink:0;
}
#lc-hd-close:hover{background:rgba(255,255,255,.28)}

/* Messages */
#lc-msgs{
  flex:1;overflow-y:auto;padding:14px 12px 6px;
  display:flex;flex-direction:column;gap:9px;
  background:#f8f9fa;scroll-behavior:smooth;
}
#lc-msgs::-webkit-scrollbar{width:3px}
#lc-msgs::-webkit-scrollbar-thumb{background:#e0e0e0;border-radius:3px}

/* Message rows */
.lc-m{display:flex;gap:7px;max-width:100%}
.lc-m.bot{align-items:flex-end;align-self:flex-start;max-width:88%}
.lc-m.usr{align-self:flex-end;max-width:82%;flex-direction:row-reverse}
.lc-m-av{
  width:26px;height:26px;border-radius:50%;
  object-fit:cover;flex-shrink:0;align-self:flex-end;
}
.lc-m-av-fb{
  width:26px;height:26px;border-radius:50%;
  background:var(--cc);color:#fff;
  display:none;align-items:center;justify-content:center;
  font-size:10px;font-weight:700;flex-shrink:0;align-self:flex-end;
  font-family:'Inter',sans-serif;
}
.lc-b{
  padding:9px 12px;border-radius:16px;
  font-size:13.5px;line-height:1.53;font-family:'Inter',sans-serif;
  word-break:break-word;
}
.lc-m.bot .lc-b{
  background:#fff;color:#1a1a1a;
  border:1px solid #eaeaea;border-bottom-left-radius:4px;
}
.lc-m.usr .lc-b{
  background:var(--cc);color:#fff;border-bottom-right-radius:4px;
}

/* Typing dots */
.lc-dots{display:flex;align-items:center;gap:4px;padding:8px 12px}
.lc-dots i{display:block;width:7px;height:7px;border-radius:50%;background:#c8c8c8;animation:lcD 1.3s ease-in-out infinite}
.lc-dots i:nth-child(2){animation-delay:.22s}
.lc-dots i:nth-child(3){animation-delay:.44s}
@keyframes lcD{0%,60%,100%{opacity:.3;transform:translateY(0)}30%{opacity:1;transform:translateY(-5px)}}

/* Quick replies */
#lc-qrs{
  display:flex;flex-wrap:wrap;gap:6px;
  padding:8px 12px 4px;background:#f8f9fa;flex-shrink:0;
}
.lc-q{
  background:#fff;border:1.5px solid var(--cc);color:var(--cc);
  border-radius:20px;padding:6px 12px;font-size:12px;font-weight:500;
  cursor:pointer;transition:background .15s,color .15s;white-space:nowrap;
  font-family:'Inter',sans-serif;
}
.lc-q:hover{background:var(--cc);color:#fff}

/* Input */
#lc-inp-row{
  padding:10px 12px;border-top:1px solid #f0f0f0;
  display:flex;gap:8px;align-items:flex-end;
  background:#fff;flex-shrink:0;
}
#lc-inp{
  flex:1;border:1.5px solid #e4e4e4;border-radius:18px;
  padding:8px 13px;font-size:13.5px;outline:none;
  resize:none;font-family:'Inter',sans-serif;
  line-height:1.45;max-height:80px;background:#fafafa;
  transition:border-color .2s;
}
#lc-inp:focus{border-color:var(--cc);background:#fff}
#lc-send{
  width:36px;height:36px;border-radius:50%;flex-shrink:0;
  background:var(--cc);border:none;cursor:pointer;
  display:flex;align-items:center;justify-content:center;
  transition:opacity .18s,transform .15s;
}
#lc-send:hover:not(:disabled){transform:scale(1.08)}
#lc-send:disabled{opacity:.35;cursor:default}
#lc-send svg{width:14px;height:14px;fill:#fff}

/* ── MOBILE ── */
@media(max-width:520px){
  #lc-bub{bottom:16px;right:16px}
  #lc-toast{right:16px;bottom:84px;width:calc(100vw - 32px);max-width:280px}
  #lc-panel{
    position:fixed;inset:0;width:100%;max-height:100%;
    border-radius:0;bottom:0;right:0;
    transform:translateY(100%);
  }
  #lc-panel.open{transform:translateY(0)}
  /* Bigger header on mobile */
  #lc-head{padding:16px 16px;padding-top:calc(env(safe-area-inset-top, 0px) + 16px)}
  #lc-hd-img,#lc-hd-av{width:46px;height:46px}
  .lc-hd-name{font-size:15px}
  .lc-hd-sub{font-size:12px}
  /* Chevron down to minimize on mobile */
  #lc-hd-close::before{content:""}
  #lc-hd-close .lc-close-icon{display:none}
  #lc-hd-close .lc-min-icon{display:block}
  /* Messages fill screen */
  #lc-msgs{flex:1}
  /* Bigger quick replies */
  .lc-q{font-size:13px;padding:8px 14px}
  /* Input area gets extra bottom padding for home bar */
  #lc-inp-row{padding-bottom:calc(env(safe-area-inset-bottom, 0px) + 12px)}
}
@media(min-width:521px){
  #lc-hd-close .lc-min-icon{display:none}
  #lc-hd-close .lc-close-icon{display:block}
}
`;
  document.head.appendChild(sty);

  // ── HTML ─────────────────────────────────────────────────────────
  const root = document.createElement('div');
  root.id = 'lc-root';
  root.innerHTML = `
<div id="lc-bub" role="button" aria-label="Chat with ${C.name}" tabindex="0">
  <img id="lc-bub-img" src="${C.photo}" alt="${C.name}" onerror="this.style.display='none';document.getElementById('lc-bub-av').style.display='flex'">
  <div id="lc-bub-av">${C.initials}</div>
  <div id="lc-bub-dot"></div>
</div>

<div id="lc-toast">
  <img id="lc-ti" src="${C.photo}" alt="" onerror="this.style.display='none'">
  <div id="lc-tt">${C.toastMsg}</div>
  <button id="lc-tx" aria-label="Dismiss">×</button>
</div>

<div id="lc-panel" role="dialog" aria-modal="true">
  <div id="lc-head">
    <div class="lc-hd-photo-wrap">
      <img id="lc-hd-img" src="${C.photo}" alt="${C.name}" onerror="this.style.display='none';document.getElementById('lc-hd-av').style.display='flex'">
      <div id="lc-hd-av">${C.initials}</div>
      <div class="lc-hd-dot"></div>
    </div>
    <div class="lc-hd-info">
      <div class="lc-hd-name">${C.title}</div>
      <div class="lc-hd-sub">${C.subtitle}</div>
    </div>
    <button id="lc-hd-close" aria-label="Minimize chat">
      <span class="lc-close-icon">&#215;</span>
      <svg class="lc-min-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
    </button>
  </div>
  <div id="lc-msgs"></div>
  <div id="lc-qrs"></div>
  <div id="lc-inp-row">
    <textarea id="lc-inp" placeholder="Type a message…" rows="1"></textarea>
    <button id="lc-send" disabled aria-label="Send">
      <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
    </button>
  </div>
</div>`;
  document.body.appendChild(root);

  // ── REFS ─────────────────────────────────────────────────────────
  const bub     = document.getElementById('lc-bub');
  const toast   = document.getElementById('lc-toast');
  const toastX  = document.getElementById('lc-tx');
  const panel   = document.getElementById('lc-panel');
  const hdClose = document.getElementById('lc-hd-close');
  const msgs    = document.getElementById('lc-msgs');
  const qrs     = document.getElementById('lc-qrs');
  const inp     = document.getElementById('lc-inp');
  const sendBtn = document.getElementById('lc-send');

  // ── STATE ─────────────────────────────────────────────────────────
  const history = [];
  let isOpen = false;
  let busy = false;
  let welcomed = false;
  let toastShown = false;

  // ── HELPERS ───────────────────────────────────────────────────────
  const pause = ms => new Promise(r => setTimeout(r, ms));
  const scroll = () => { msgs.scrollTop = msgs.scrollHeight; };

  function makeBotRow() {
    const row = document.createElement('div');
    row.className = 'lc-m bot';
    const av = document.createElement('img');
    av.className = 'lc-m-av';
    av.src = C.photo;
    av.alt = '';
    av.onerror = () => {
      av.style.display = 'none';
      const fb = document.createElement('div');
      fb.className = 'lc-m-av-fb';
      fb.textContent = C.initials;
      fb.style.display = 'flex';
      row.insertBefore(fb, bub_el);
    };
    const bub_el = document.createElement('div');
    bub_el.className = 'lc-b';
    row.appendChild(av);
    row.appendChild(bub_el);
    msgs.appendChild(row);
    scroll();
    return bub_el;
  }

  function addMsg(role, text) {
    history.push({ role, content: text });
    if (role === 'assistant') {
      const bub_el = makeBotRow();
      bub_el.innerHTML = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
    } else {
      const row = document.createElement('div');
      row.className = 'lc-m usr';
      row.innerHTML = `<div class="lc-b">${text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>`;
      msgs.appendChild(row);
    }
    scroll();
  }

  function showTyping() {
    const row = document.createElement('div');
    row.className = 'lc-m bot'; row.id = 'lc-typ';
    const av = document.createElement('img');
    av.className = 'lc-m-av'; av.src = C.photo; av.alt = '';
    const bub_el = document.createElement('div');
    bub_el.className = 'lc-b';
    bub_el.innerHTML = '<div class="lc-dots"><i></i><i></i><i></i></div>';
    row.appendChild(av); row.appendChild(bub_el);
    msgs.appendChild(row); scroll();
  }
  function hideTyping() { const t = document.getElementById('lc-typ'); if (t) t.remove(); }

  function renderQRs(list) {
    qrs.innerHTML = '';
    list.forEach(txt => {
      const b = document.createElement('button');
      b.className = 'lc-q'; b.textContent = txt;
      b.addEventListener('click', e => { e.stopPropagation(); qrs.innerHTML = ''; send(txt); });
      qrs.appendChild(b);
    });
  }

  // Sequential welcome messages (like real chat)
  async function showWelcome() {
    welcomed = true;
    const lines = C.welcomeLines;
    for (let i = 0; i < lines.length; i++) {
      showTyping();
      await pause(i === 0 ? 500 : 750);
      hideTyping();
      // Don't add to AI history — pre-scripted intro
      const row = document.createElement('div');
      row.className = 'lc-m bot';
      const av = document.createElement('img');
      av.className = 'lc-m-av'; av.src = C.photo; av.alt = '';
      const bub_el = document.createElement('div');
      bub_el.className = 'lc-b';
      bub_el.innerHTML = lines[i].replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
      row.appendChild(av); row.appendChild(bub_el);
      msgs.appendChild(row); scroll();
      await pause(300);
    }
    // Final "What's on your mind?" message
    showTyping();
    await pause(600);
    hideTyping();
    const row = document.createElement('div');
    row.className = 'lc-m bot';
    const av = document.createElement('img');
    av.className = 'lc-m-av'; av.src = C.photo; av.alt = '';
    const bub_el = document.createElement('div');
    bub_el.className = 'lc-b';
    bub_el.textContent = "What's on your mind?";
    row.appendChild(av); row.appendChild(bub_el);
    msgs.appendChild(row); scroll();
    renderQRs(C.quickReplies);
  }

  // ── OPEN / CLOSE ─────────────────────────────────────────────────
  function openPanel() {
    isOpen = true;
    hideToast();
    bub.classList.add('away');
    panel.classList.add('open');
    inp.focus();
    if (!welcomed) showWelcome();
  }

  function closePanel() {
    isOpen = false;
    panel.classList.remove('open');
    bub.classList.remove('away');
  }

  // ── TOAST ─────────────────────────────────────────────────────────
  function showToast() {
    if (isOpen || toastShown) return;
    toastShown = true;
    toast.classList.add('show');
    setTimeout(hideToast, 7000);
  }
  function hideToast() { toast.classList.remove('show'); }

  if (C.toastDelay > 0) setTimeout(showToast, C.toastDelay);

  // ── SEND ──────────────────────────────────────────────────────────
  async function send(text) {
    text = (text || inp.value).trim();
    if (!text || busy) return;
    busy = true;
    inp.value = ''; autoResize();
    sendBtn.disabled = true;
    qrs.innerHTML = '';
    addMsg('user', text);
    showTyping();

    try {
      const [res] = await Promise.all([
        fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${C.apiKey}` },
          body: JSON.stringify({
            model: C.model,
            messages: [{ role: 'system', content: C.systemPrompt }, ...history],
            max_tokens: 230, temperature: 0.83
          })
        }),
        pause(1400)
      ]);
      const data = await res.json();
      hideTyping();

      if (data.choices?.[0]?.message?.content) {
        addMsg('assistant', data.choices[0].message.content);
        if (/\b(book|consult|appoint|ready|get started|begin|sign up|schedule|how.*(start|begin))\b/i.test(text)) {
          const bk = document.createElement('button');
          bk.className = 'lc-q';
          bk.textContent = '📅 Book a Free 15-Min Consult';
          bk.addEventListener('click', () => window.open(C.bookingUrl, '_blank'));
          qrs.appendChild(bk);
        }
      } else {
        addMsg('assistant', "Something went sideways on my end — sorry. You can reach me directly through the website.");
      }
    } catch {
      hideTyping();
      addMsg('assistant', "Having a tech hiccup. Reach me through the contact form on the website and I'll get back to you.");
    }

    busy = false;
    sendBtn.disabled = false;
    inp.focus();
  }

  function autoResize() {
    inp.style.height = 'auto';
    inp.style.height = Math.min(inp.scrollHeight, 80) + 'px';
  }

  // ── EVENTS ────────────────────────────────────────────────────────
  bub.addEventListener('click', openPanel);
  bub.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPanel(); } });
  toast.addEventListener('click', openPanel);
  toastX.addEventListener('click', e => { e.stopPropagation(); hideToast(); });
  hdClose.addEventListener('click', closePanel);
  sendBtn.addEventListener('click', () => send());
  inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
  inp.addEventListener('input', () => { autoResize(); sendBtn.disabled = !inp.value.trim(); });
  document.addEventListener('click', e => { if (isOpen && !root.contains(e.target)) closePanel(); }, { capture: false });

})();
