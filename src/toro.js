import { kvGet, kvSet } from './db.js';
import { boy } from './logo.js';

let C;
const T = { msgs: [], busy: false, att: null, pend: null, dbl: localStorage.getItem('toroDbl') === '1' };

/* ---- شخصية تورو: ولد مثقف ---- */
export const AV = (s = 28) => `<svg class="av" width="${s}" height="${s}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${boy}</svg>`;

export async function initToro(ctx) { C = ctx; T.msgs = await kvGet('toro', []); }
const save = () => kvSet('toro', T.msgs.filter(m => !m.tmp).slice(-60).map(({ r, t, f }) => ({ r, t, f })));

const SYS = `أنت «تورو»: شخصية ولد مثقف نبيه ومحب للقراءة، ودود ومهذب ومتواضع، يشرح كصديق أذكى قليلاً. أنت مساعد دراسي ذكي (ذكاء اصطناعي) داخل تطبيق «توروكارو» للطلاب الجامعيين في العراق، وتعترف بذلك بصراحة إن سُئلت.
- أجب بالعربية المبسطة وبأسلوب ودود (ويمكنك لهجة عراقية خفيفة إن خاطبك بها)، وبالإنجليزية إن طُلب.
- اشرح خطوة بخطوة وبأمثلة بسيطة.
- في المسائل (رياضيات، فيزياء، كيمياء، إحصاء، برمجة…): اكتب المعطيات ثم القانون ثم الحل ثم راجع النتيجة وتحقق منها قبل الجواب النهائي.
- في الإنجليزية: أعطِ المعنى بالعربية ومثالاً، وصحّح الأخطاء بلطف.
- لا تخترع مصادر أو أرقاماً أو معلومات. إذا لم تكن متأكداً فقل ذلك صراحةً.
- لا تستخدم LaTeX؛ اكتب المعادلات بنص عادي مثل x^2 و sqrt(x) و a/b.
- كن مختصراً ومنظماً ما لم يُطلب التفصيل.`;

/* ---- أماكن الخدمة (غيّرها هنا إن تغيّرت الخدمة) ---- */
const EP = [
  { url: 'https://text.pollinations.ai/openai', extra: {} },
  { url: 'https://text.pollinations.ai/openai', extra: { model: 'mistral' } },
  { url: 'https://gen.pollinations.ai/v1/chat/completions', extra: { model: 'openai-fast' } },
  { url: 'https://gen.pollinations.ai/v1/chat/completions', extra: { model: 'mistral' } }
];
const wait = ms => new Promise(r => setTimeout(r, ms));

async function once(p, messages) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 60000);
  try {
    const r = await fetch(p.url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, temperature: .2, ...p.extra }), signal: ctl.signal
    });
    const raw = await r.text();
    let j; try { j = JSON.parse(raw); } catch { }
    const out = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
    return r.ok && out && out.trim() ? out.trim() : '';
  } catch { return ''; } finally { clearTimeout(t); }
}
async function call(messages) {
  for (let round = 0; round < 2; round++) {
    for (const p of EP) { const o = await once(p, messages); if (o) return o; }
    await wait(1500);
  }
  throw new Error('fail');
}

const fmt = s => String(s).split('```').map((p, i) => i % 2
  ? `<pre>${C.esc(p.replace(/^\w*\n/, ''))}</pre>`
  : C.esc(p).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code dir="ltr">$1</code>')
    .replace(/^#{1,4} (.+)$/gm, '<b>$1</b>').replace(/^[-*] (.+)$/gm, '• $1').replace(/\n/g, '<br>')).join('');

const INTRO = () => `<div class="mg a"><div class="bb" style="display:flex;gap:10px;align-items:flex-start">${AV(46)}<div>أهلاً! أنا <b>تورو</b>، مساعدك الذكي في الدراسة.<br>اسألني عن أي مادة، أو أرسل لي كلمات إنجليزية، مسألة، صورة، أو صفحات من ملزمتك (📎) وأشرحها لك خطوة بخطوة.<br><small>⚠️ أنا ذكاء اصطناعي وقد أخطئ أحياناً، فراجع المعلومات المهمة. فعّل «التدقيق المزدوج» للمسائل.</small></div></div></div>`;

function msgsHtml() {
  if (!T.msgs.length) return INTRO();
  const last = T.msgs.length - 1;
  return T.msgs.map((m, i) => `<div class="mg ${m.r}"><div class="bb">${m.f ? `<small>📎 ${C.esc(m.f)}</small><br>` : ''}${m.r === 'a' ? fmt(m.t) : C.esc(m.t).replace(/\n/g, '<br>')}</div>
  ${m.r === 'a' && !m.tmp ? `<div class="ac"><button class="x" data-act="tcopy" data-i="${i}">نسخ</button><button class="x" data-act="tnote" data-i="${i}">📝 لملاحظة</button>${i === last ? '<button class="x" data-act="tver">✅ تحقّق</button>' : ''}</div>` : ''}</div>`).join('');
}
const attHtml = () => T.att ? `<div class="attc"><span>📎 ${C.esc(T.att.label)}</span><button class="x" data-act="tatt">✕</button></div>` : '';
const dblLabel = () => T.dbl ? '🛡 تدقيق مزدوج: مفعّل' : '🛡 تدقيق مزدوج: معطّل';

const Q = [['💡 اشرح', 'اشرح لي ببساطة: '], ['📌 لخّص', 'لخّص ما يلي في نقاط واضحة: '], ['🔤 ترجم', 'ترجم إلى العربية مع شرح المصطلحات المهمة: '],
['🧮 حل مسألة', 'حل المسألة التالية خطوة بخطوة ثم تحقق من الحل: '], ['❓ اختبرني', 'اختبرني بخمسة أسئلة (والإجابات في النهاية) عن: ']];

export function Toro() {
  return `<section class="chat"><div class="top" style="padding:10px 16px 0"><h2 style="display:flex;align-items:center;gap:8px">${AV(34)} تورو</h2><button class="x" data-act="tclear">🗑 مسح</button></div>
  <div class="chips" style="padding:0 10px"><button class="chip ${T.dbl ? 'on' : ''}" data-act="tdbl" id="tdbl">${dblLabel()}</button></div>
  <div class="msgs" id="msgs">${msgsHtml()}</div>
  <div class="chips" style="padding:0 10px">${Q.map(([l, p]) => `<button class="chip" data-act="tq" data-p="${C.esc(p)}">${l}</button>`).join('')}</div>
  <div id="att">${attHtml()}</div>
  <div class="inp"><label class="x">📎<input type="file" accept="application/pdf,text/plain,image/*" hidden data-in="tfile"></label>
  <textarea id="tin" rows="1" placeholder="اسأل تورو…"></textarea><button class="btn" data-act="tsend" id="tsend">إرسال</button></div></section>`;
}
function paint() {
  const m = document.getElementById('msgs');
  if (m) { m.innerHTML = msgsHtml(); m.scrollTop = m.scrollHeight; }
  const b = document.getElementById('tsend'); if (b) b.disabled = T.busy;
}
function paintAtt() { const a = document.getElementById('att'); if (a) a.innerHTML = attHtml(); }
export function setAtt(a) { T.att = a; }

export async function shrink(src) {
  let w, h, draw;
  if (src instanceof HTMLCanvasElement) { w = src.width; h = src.height; draw = (x, W, H) => x.drawImage(src, 0, 0, W, H); }
  else { const bm = await createImageBitmap(src); w = bm.width; h = bm.height; draw = (x, W, H) => x.drawImage(bm, 0, 0, W, H); }
  const k = Math.min(1, 1024 / Math.max(w, h)), c = document.createElement('canvas');
  c.width = Math.round(w * k); c.height = Math.round(h * k);
  draw(c.getContext('2d'), c.width, c.height);
  return c.toDataURL('image/jpeg', .8);
}

export async function onToroFile(f) {
  try {
    if (f.type.startsWith('image/')) T.att = { label: f.name || 'صورة', img: await shrink(f) };
    else if (f.type === 'application/pdf') {
      const doc = await C.pdfjs.getDocument({ data: await f.arrayBuffer() }).promise;
      const r = (prompt('أي صفحات ترسل لتورو؟ (حتى 5 صفحات) مثال: 1-3', '1-3') || '').trim(); if (!r) return;
      const idx = C.rng(r, doc.numPages).slice(0, 5); if (!idx.length) return C.toast('نطاق غير صالح');
      let txt = '';
      for (const i of idx) { const c = await (await doc.getPage(i + 1)).getTextContent(); txt += `\n[صفحة ${i + 1}]\n` + c.items.map(t => t.str).join(' '); }
      if (txt.replace(/\s|\[صفحة \d+\]/g, '').length < 30) return C.toast('لا نص في هذه الصفحات (ملزمة ممسوحة). أرسل صورة الصفحة بدلاً منها');
      T.att = { label: f.name.replace(/\.pdf$/i, '') + ' (ص ' + r + ')', ctx: txt.slice(0, 9000) };
    } else T.att = { label: f.name, ctx: (await f.text()).slice(0, 9000) };
    paintAtt(); C.toast('تم إرفاق الملف ✅');
  } catch { C.toast('تعذّرت قراءة الملف'); }
}

function consent() {
  C.modal(`<h3 style="display:flex;align-items:center;gap:8px">${AV(34)} قبل أن تبدأ مع تورو</h3>
  <p style="line-height:1.9;font-size:14px">تورو يعمل عبر الإنترنت بخدمة ذكاء اصطناعي مجانية من طرف ثالث. عند استخدامه تُرسل <b>رسالتك وما ترفقه من نص أو صور</b> إلى تلك الخدمة لتوليد الجواب. لا يُرسل التطبيق اسمك ولا أي حساب.</p>
  <ul style="line-height:1.9;font-size:14px"><li>لا ترسل معلومات شخصية أو حساسة (أرقام هوية، كلمات سر…).</li><li>تورو ذكاء اصطناعي وقد يخطئ، فراجع المعلومات المهمة.</li><li>بقية التطبيق يعمل دون إنترنت ولا يتأثر.</li></ul>
  <button class="btn" style="width:100%" data-act="toroyes">أوافق وأبدأ</button><button class="x" style="width:100%;margin-top:8px" data-act="mclose">ليس الآن</button>`);
}

const CHECK = 'راجع الجواب السابق بدقة شديدة: أعد الحل أو التحقق من الصفر بشكل مستقل، وقارن النتيجتين. إذا وجدت أي خطأ أو معلومة غير مؤكدة فأعد كتابة الجواب الصحيح كاملاً. وإذا كان كله صحيحاً فأعد كتابته كما هو بنفس صياغته. لا تذكر أنك راجعت.';

export async function ask(text) {
  if (T.busy) return;
  if (!localStorage.getItem('toroOk')) { T.pend = text; consent(); return; }
  const att = T.att; T.att = null; paintAtt();
  const um = { r: 'u', t: text, f: att && att.label, ctx: att && att.ctx };
  const lastCtx = [...T.msgs].reverse().find(m => m.ctx);
  T.msgs.push(um, { r: 'a', t: T.dbl ? '⏳ تورو يفكّر ويدقّق…' : '⏳ تورو يفكّر…', tmp: true }); T.busy = true; paint();
  const hist = T.msgs.filter(m => !m.tmp && m !== um).slice(-10)
    .map(m => ({ role: m.r === 'u' ? 'user' : 'assistant', content: m.t.slice(0, 3000) + (m === lastCtx ? `\n\n--- المحتوى المرفق ---\n${m.ctx}` : '') }));
  const body = att && att.ctx ? `${text}\n\n--- المحتوى المرفق (${att.label}) ---\n${att.ctx}` : text;
  const cur = att && att.img
    ? { role: 'user', content: [{ type: 'text', text: body }, { type: 'image_url', image_url: { url: att.img } }] }
    : { role: 'user', content: body };
  const base = [{ role: 'system', content: SYS }, ...hist, cur];
  try {
    let out = await call(base);
    if (T.dbl && !(att && att.img)) {
      try { out = (await call([...base, { role: 'assistant', content: out }, { role: 'user', content: CHECK }])) || out; } catch { }
    }
    T.msgs.pop(); T.msgs.push({ r: 'a', t: out });
  } catch {
    T.msgs.pop(); T.msgs.push({ r: 'a', t: '⚠️ تعذّر الوصول إلى تورو الآن. تأكد من الإنترنت وحاول بعد قليل، فالخدمة المجانية قد تنشغل أحياناً.', tmp: true });
  }
  T.busy = false; save(); paint();
}

export function toroAct(a, d) {
  const inp = document.getElementById('tin');
  switch (a) {
    case 'tq': inp.value = d.p; inp.focus(); return true;
    case 'tsend': { const v = inp.value.trim(); if (!v && !T.att) return true; inp.value = ''; ask(v || 'اشرح هذا المحتوى ولخّصه لي'); return true; }
    case 'tclear': if (confirm('مسح كل المحادثة مع تورو؟')) { T.msgs = []; save(); paint(); } return true;
    case 'tdbl': { T.dbl = !T.dbl; localStorage.setItem('toroDbl', T.dbl ? '1' : '0'); const b = document.getElementById('tdbl'); if (b) { b.textContent = dblLabel(); b.classList.toggle('on', T.dbl); } C.toast(T.dbl ? 'تم تفعيل التدقيق المزدوج 🛡' : 'تم إيقاف التدقيق المزدوج'); return true; }
    case 'tcopy': try { navigator.clipboard.writeText(T.msgs[+d.i].t); C.toast('تم النسخ'); } catch { C.toast('تعذّر النسخ'); } return true;
    case 'tnote': C.S.notes.push({ id: C.uid(), t: 'من تورو', b: T.msgs[+d.i].t, u: Date.now(), p: false }); C.sv('notes'); C.toast('حُفظت في ملاحظاتك 📝'); return true;
    case 'tver': ask(CHECK.replace(' لا تذكر أنك راجعت.', ' وأخبرني باختصار هل وجدت خطأ أم لا.')); return true;
    case 'tatt': T.att = null; paintAtt(); return true;
    case 'toroyes': localStorage.setItem('toroOk', '1'); C.closeModal(); if (T.pend) { const p = T.pend; T.pend = null; ask(p); } return true;
  }
  return false;
}
