import './style.css';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import { PDFDocument, rgb } from 'pdf-lib';
import policy from '../PRIVACY.md?raw';
import { symbol } from './logo.js';
import { pdfPut, pdfGet, pdfDel, pdfAll, kvGet, kvSet } from './db.js';
import { shareFile } from './files.js';
import { schedule, cancel } from './notify.js';
import { Mixer, setVol, sndAct } from './sounds.js';
import { Toro, initToro, toroAct, onToroFile, setAtt, shrink, AV } from './toro.js';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

const VER = '2.6.0';
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const today = () => new Date().toLocaleDateString('en-CA');
const dleft = d => Math.round((new Date(d + 'T00:00') - new Date(today() + 'T00:00')) / 864e5);
const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const WARN = 'كل ملازمك وملاحظاتك وتظليلاتك محفوظة على جهازك فقط. إذا حذفت التطبيق أو مسحت بياناته من إعدادات الهاتف فستُحذف كل المحفوظات نهائياً. احتفظ بنسخة احتياطية من «حول ← نسخ احتياطي».';

const S = {
  tab: 'home', sub: null, noteId: null, deckId: null, rev: null, ttDay: new Date().getDay(), q: '',
  name: localStorage.getItem('uname') || '', theme: localStorage.getItem('theme') || 'auto',
  pdfs: [], pg: {}, bm: {}, notes: [], tasks: [], courses: [], decks: [], tt: [], exams: [], stats: {},
  fin: { cw: '', fm: 60, t: 50 }, last: null
};

function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2000); }
function modal(h) { $('#modal').innerHTML = `<div class="box">${h}</div>`; $('#modal').classList.add('open'); }
function closeModal() { $('#modal').classList.remove('open'); }
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
const closeBtn = '<button class="btn" style="width:100%;margin-top:10px" data-act="mclose">إغلاق</button>';

function applyTheme() {
  const dark = S.theme === 'dark' || (S.theme === 'auto' && matchMedia('(prefers-color-scheme:dark)').matches);
  document.body.classList.toggle('dark', dark);
}

/* ---------- saving ---------- */
const T = {};
const sv = k => { clearTimeout(T[k]); T[k] = setTimeout(() => kvSet(k, S[k]), 300); };
function flush() { Object.keys(T).forEach(k => { clearTimeout(T[k]); kvSet(k, S[k]); }); saveAnn(true); }
document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
addEventListener('pagehide', flush);

/* ---------- stats ---------- */
function addMin(m) { const k = today(); S.stats[k] = (S.stats[k] || 0) + m; sv('stats'); }
function streak() {
  let n = 0; const d = new Date();
  if (!(S.stats[today()] > 0)) d.setDate(d.getDate() - 1);
  for (; ;) { const k = d.toLocaleDateString('en-CA'); if (S.stats[k] > 0) { n++; d.setDate(d.getDate() - 1); } else break; }
  return n;
}
setInterval(() => { if ($('#viewer').classList.contains('open') && !document.hidden) addMin(.5); }, 30000);

/* ---------- splash ---------- */
function splash() {
  $('#splash').innerHTML = `<svg viewBox="0 0 1024 1024">${symbol}</svg><h1>توروكارو</h1><p>رفيقك الدراسي</p>
  <div class="bar"><i></i></div><div class="flag"><i></i><i></i><i></i></div>
  <div class="made">صُنع في العراق</div><div class="dev">تطوير: بلال النعيمي</div>`;
}

/* ---------- screens ---------- */
const Top = t => `<div class="top"><h2>${t}</h2><button class="x" data-act="back">رجوع ›</button></div>`;

function Home() {
  const last = S.pdfs.find(p => p.id === S.last);
  const mins = Math.round(S.stats[today()] || 0), st = streak();
  const nx = S.exams.map(e => ({ ...e, d: dleft(e.date) })).filter(e => e.d >= 0).sort((a, b) => a.d - b.d)[0];
  const tl = S.tt.filter(x => x.day === new Date().getDay()).sort((a, b) => a.time.localeCompare(b.time));
  const wk = [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - 6 + i); return [DAYS[d.getDay()].slice(0, 3), Math.round(S.stats[d.toLocaleDateString('en-CA')] || 0)]; });
  const mx = Math.max(30, ...wk.map(x => x[1]));
  return `<section class="pad">
  <div class="hero"><small>أهلاً بك</small><h1>${esc(S.name || 'يا طالب العلم')} 👋</h1><p>رفيقك الدراسي… بالكامل من العراق</p></div>
  <div class="card" data-act="tab" data-t="toro">${AV(40)}<div><b>اسأل تورو</b><small>مساعدك الذكي للدراسة</small></div></div>
  <div class="stat"><div><b>🔥 ${st}</b><small>يوم متتالٍ</small></div><div><b>⏱ ${mins}</b><small>دقيقة اليوم</small></div></div>
  ${last ? `<div class="card" data-act="openpdf" data-id="${last.id}"><span style="font-size:28px">📖</span><div><b>أكمل القراءة</b><small>${esc(last.name)} • صفحة ${S.pg[last.id] || 1}</small></div></div>` : ''}
  ${nx ? `<div class="card" data-act="go" data-s="exams"><span style="font-size:28px">🎯</span><div><b>${esc(nx.n)}</b><small>${nx.d === 0 ? 'اليوم! بالتوفيق' : 'بعد ' + nx.d + ' يوم'}</small></div></div>` : ''}
  ${tl.length ? `<div class="card col" data-act="go" data-s="tt"><b>🗓 محاضرات اليوم</b>${tl.map(x => `<small>${x.time} — ${esc(x.n)} ${esc(x.room || '')}</small>`).join('')}</div>` : ''}
  <div class="card col"><b>📊 دراستك آخر 7 أيام</b><div class="wk">${wk.map(([n, m]) => `<div><i style="height:${Math.max(4, m / mx * 100)}%"></i><small>${n}</small></div>`).join('')}</div></div>
  <div class="warn">⚠️ ${WARN}</div></section>`;
}

const LibList = () => S.pdfs.filter(p => p.name.toLowerCase().includes(S.q.toLowerCase())).map(p => `<div class="card"><div style="flex:1" data-act="openpdf" data-id="${p.id}"><b>📄 ${esc(p.name)}</b><small>${(p.size / 1048576).toFixed(1)} MB • صفحة ${S.pg[p.id] || 1}</small></div><button class="x" data-act="delpdf" data-id="${p.id}">🗑</button></div>`).join('') || '<div class="warn center">لا توجد ملازم.<br>اضغط «إضافة PDF» أو حوّل صورك إلى PDF من «أدوات PDF».</div>';
function Lib() {
  return `<section class="pad"><div class="top"><h2>📚 ملازمي</h2><label class="btn gold sm">＋ إضافة PDF<input type="file" accept="application/pdf" multiple hidden data-in="addpdf"></label></div>
  <input type="text" data-in="q" placeholder="🔍 ابحث في ملازمك" style="margin-bottom:10px"><div id="lst">${LibList()}</div></section>`;
}

const NotesList = () => [...S.notes].filter(n => (n.t + ' ' + n.b).toLowerCase().includes(S.q.toLowerCase())).sort((a, b) => (b.p ? 1 : 0) - (a.p ? 1 : 0) || b.u - a.u).map(x => `<div class="card" data-act="opennote" data-id="${x.id}"><div><b>${x.p ? '📌 ' : ''}${esc(x.t || 'بدون عنوان')}</b><small>${esc((x.b || '').slice(0, 60))}</small></div></div>`).join('') || '<div class="warn center">لا توجد ملاحظات.</div>';
function Notes() {
  const n = S.notes.find(x => x.id === S.noteId);
  if (n) return `<section class="pad"><div class="top"><button class="x" data-act="back">رجوع ›</button><div><button class="x" data-act="pinnote">${n.p ? '📌 مثبّتة' : '📍 تثبيت'}</button> <button class="btn gold sm" data-act="savenote">💾 حفظ</button></div></div>
  <input type="text" data-in="ntitle" placeholder="العنوان" value="${esc(n.t)}" style="margin-bottom:8px">
  <textarea data-in="nbody" placeholder="اكتب ملاحظاتك هنا…">${esc(n.b)}</textarea>
  <button class="btn red sm" data-act="delnote" style="margin-top:10px">🗑 حذف الملاحظة</button></section>`;
  return `<section class="pad"><div class="top"><h2>📝 ملاحظاتي</h2><button class="btn gold sm" data-act="newnote">＋ جديدة</button></div>
  <input type="text" data-in="q" placeholder="🔍 ابحث في ملاحظاتك" style="margin-bottom:10px"><div id="lst">${NotesList()}</div></section>`;
}

function Tools() {
  const m = { gpa: GPA, fin: Fin, calc: Calc, pomo: Pomo, tasks: Tasks, decks: Decks, tt: TT, exams: Exams, pdft: PdfTools, snd: Snd }[S.sub];
  if (m) return m();
  const t = [['gpa', '🧮', 'حاسبة المعدل', 'من 100 مع التقدير'], ['fin', '🎯', 'درجة الفاينل', 'كم أحتاج للنجاح؟'], ['calc', '🔢', 'آلة حاسبة علمية', ''],
  ['pomo', '⏱️', 'مؤقت التركيز', '25 / 5 دقائق'], ['snd', '🎧', 'أصوات هادئة', 'مطر، أمواج، موقد…'], ['tasks', '✅', 'مهامي', 'مع تذكير'], ['decks', '🗂', 'بطاقات المراجعة', 'تكرار متباعد'],
  ['tt', '🗓', 'جدول المحاضرات', 'أسبوعي'], ['exams', '📅', 'الامتحانات', 'عدّ تنازلي وتنبيه'], ['pdft', '🛠', 'أدوات PDF', 'صور، دمج، استخراج']];
  return `<section class="pad"><h2>🧰 الأدوات</h2><div class="grid">${t.map(([s, i, n, d]) => `<div class="tile" data-act="go" data-s="${s}"><i>${i}</i><b>${n}</b><small>${d}</small></div>`).join('')}</div></section>`;
}

/* GPA */
function gres() {
  let s = 0, u = 0;
  S.courses.forEach(c => { const g = parseFloat(c.g), n = parseFloat(c.u); if (g >= 0 && n > 0) { s += g * n; u += n; } });
  if (!u) return '<small>أدخل الدرجات والوحدات</small>';
  const a = s / u, t = a >= 90 ? 'امتياز' : a >= 80 ? 'جيد جداً' : a >= 70 ? 'جيد' : a >= 60 ? 'متوسط' : a >= 50 ? 'مقبول' : 'راسب';
  return `<b style="font-size:30px">${a.toFixed(2)}</b> <span>(${t})</span>`;
}
function GPA() {
  return `<section class="pad">${Top('🧮 حاسبة المعدل')}
  ${S.courses.map(c => `<div class="row"><input type="text" placeholder="المادة" value="${esc(c.n)}" data-in="cn" data-id="${c.id}" style="flex:2">
  <input type="number" inputmode="decimal" placeholder="الدرجة" value="${esc(c.g)}" data-in="cg" data-id="${c.id}">
  <input type="number" inputmode="decimal" placeholder="وحدات" value="${esc(c.u)}" data-in="cu" data-id="${c.id}">
  <button class="x" data-act="delc" data-id="${c.id}">✕</button></div>`).join('')}
  <button class="btn gold sm" data-act="addc">＋ مادة</button>
  <div class="card" style="margin-top:14px"><div id="gres">${gres()}</div></div></section>`;
}

/* final-exam calculator */
function fres() {
  const f = S.fin, cw = parseFloat(f.cw), t = parseFloat(f.t), fm = parseFloat(f.fm);
  if (!(cw >= 0) || !(t > 0) || !(fm > 0)) return '<small>أدخل درجة السعي</small>';
  const need = t - cw;
  if (need <= 0) return '✅ أنت ناجح حتى لو أخذت صفراً في الفاينل';
  if (need > fm) return `❌ تحتاج ${need.toFixed(1)} من ${fm} (غير ممكن)`;
  return `🎯 تحتاج <b>${need.toFixed(1)}</b> من ${fm} في الفاينل (${(need / fm * 100).toFixed(0)}%)`;
}
function Fin() {
  return `<section class="pad">${Top('🎯 الدرجة المطلوبة في الفاينل')}
  <label>درجة السعي (الشهري/السنوي)</label><input type="number" inputmode="decimal" data-in="f_cw" value="${esc(S.fin.cw)}" style="margin:6px 0 10px">
  <label>الدرجة الكلية للفاينل</label><input type="number" inputmode="decimal" data-in="f_fm" value="${esc(S.fin.fm)}" style="margin:6px 0 10px">
  <label>درجة النجاح الكلية</label><input type="number" inputmode="decimal" data-in="f_t" value="${esc(S.fin.t)}" style="margin:6px 0 10px">
  <div class="card"><div id="fres">${fres()}</div></div></section>`;
}

/* scientific calculator */
const CALC = { e: '', r: '' };
function calc(x) {
  x = x.replace(/×/g, '*').replace(/÷/g, '/').replace(/π/g, 'PI').replace(/\^/g, '**').replace(/√/g, 'sqrt').replace(/%/g, '/100');
  if (!/^[0-9+\-*/().,a-zA-Z ]*$/.test(x)) throw 0;
  const f = { sin: a => Math.sin(a * Math.PI / 180), cos: a => Math.cos(a * Math.PI / 180), tan: a => Math.tan(a * Math.PI / 180), sqrt: Math.sqrt, log: Math.log10, ln: Math.log, PI: Math.PI };
  if ((x.match(/[a-zA-Z]+/g) || []).some(n => !(n in f))) throw 0;
  const v = Function(...Object.keys(f), '"use strict";return (' + x + ')')(...Object.values(f));
  if (!isFinite(v)) throw 0;
  return v;
}
const cdHtml = () => `<small>${esc(CALC.e)}</small>${esc(CALC.r) || '&nbsp;'}`;
function Calc() {
  const rows = [['sin(', 'cos(', 'tan(', '√(', 'π'], ['log(', 'ln(', '^', '(', ')'], ['7', '8', '9', '÷', '⌫'], ['4', '5', '6', '×', 'C'], ['1', '2', '3', '-', '%'], ['0', '.', '00', '+', '=']];
  return `<section class="pad">${Top('🔢 آلة حاسبة علمية')}<div id="cd">${cdHtml()}</div><div class="kp">${rows.flat().map(k => `<button data-act="k" data-k="${k}" class="${'÷×-+'.includes(k) ? 'op' : k === '=' ? 'eq' : ''}">${k}</button>`).join('')}</div><small>الزوايا بالدرجات</small></section>`;
}

/* sounds */
function Snd() {
  return `<section class="pad">${Top('🎧 أصوات هادئة')}<div class="mx">${Mixer()}</div></section>`;
}

/* pomodoro */
const P = { m: 'f', left: 1500, end: 0, iv: null };
const mm = s => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
const pstop = () => { clearInterval(P.iv); P.iv = null; };
function ptick() {
  P.left = Math.max(0, Math.ceil((P.end - Date.now()) / 1000));
  const t = $('#pt'); if (t) t.textContent = mm(P.left);
  if (!P.left) { pstop(); if (P.m === 'f') addMin(25); navigator.vibrate && navigator.vibrate([300, 150, 300]); toast('انتهى الوقت ⏰'); if (S.sub === 'pomo') render(); }
}
function Pomo() {
  return `<section class="pad">${Top('⏱️ مؤقت التركيز')}
  <div class="row"><button class="btn sm ${P.m === 'f' ? 'gold' : ''}" data-act="pmode" data-m="f">تركيز 25</button><button class="btn sm ${P.m === 'b' ? 'gold' : ''}" data-act="pmode" data-m="b">استراحة 5</button></div>
  <div class="card" style="justify-content:center"><div id="pt" style="font-size:64px;font-weight:800">${mm(P.left)}</div></div>
  <div class="row"><button class="btn" data-act="pgo" style="flex:1">${P.iv ? '⏸ إيقاف' : '▶ ابدأ'}</button><button class="btn red" data-act="preset">إعادة</button></div></section>`;
}

/* tasks */
function Tasks() {
  return `<section class="pad">${Top('✅ مهامي')}
  <div class="row"><input type="text" id="ti" placeholder="مهمة جديدة (واجب، تقرير…)"></div>
  <div class="row"><input type="date" id="td" style="flex:1"><button class="btn" data-act="addtask">＋ إضافة</button></div>
  <small>اختر تاريخاً ليصلك تذكير الساعة 8 صباحاً</small><div style="height:8px"></div>
  ${S.tasks.map(t => `<div class="card"><input type="checkbox" ${t.d ? 'checked' : ''} data-act="tgl" data-id="${t.id}" style="width:22px;height:22px"><div style="flex:1;${t.d ? 'text-decoration:line-through;opacity:.5' : ''}">${esc(t.t)}${t.due ? `<small>📅 ${t.due}</small>` : ''}</div><button class="x" data-act="deltask" data-id="${t.id}">✕</button></div>`).join('') || '<div class="warn center">لا توجد مهام.</div>'}</section>`;
}

/* exams */
function Exams() {
  const l = [...S.exams].sort((a, b) => a.date.localeCompare(b.date));
  return `<section class="pad">${Top('📅 الامتحانات')}
  <div class="row"><input type="text" id="en" placeholder="اسم المادة" style="flex:2"><input type="date" id="ed" style="flex:1"></div>
  <button class="btn gold sm" data-act="addexam">＋ إضافة وتفعيل التذكير</button><div style="height:12px"></div>
  ${l.map(e => { const d = dleft(e.date); return `<div class="card" style="${d < 0 ? 'opacity:.5' : ''}"><div style="flex:1"><b>${esc(e.n)}</b><small>${e.date}</small></div><b>${d < 0 ? 'انتهى' : d === 0 ? 'اليوم' : d + ' يوم'}</b><button class="x" data-act="delexam" data-id="${e.id}">✕</button></div>`; }).join('') || '<div class="warn center">أضف مواعيد امتحاناتك ليصلك تنبيه قبلها بيوم وقبلها بساعة.</div>'}</section>`;
}

/* timetable */
function TT() {
  const list = S.tt.filter(x => x.day === S.ttDay).sort((a, b) => a.time.localeCompare(b.time));
  return `<section class="pad">${Top('🗓 جدول المحاضرات')}
  <div class="chips">${DAYS.map((n, i) => `<button class="chip ${i === S.ttDay ? 'on' : ''}" data-act="ttday" data-d="${i}">${n}</button>`).join('')}</div>
  <div class="row"><input type="text" id="tn" placeholder="المادة" style="flex:2"><input type="time" id="tm" value="08:30"></div>
  <div class="row"><input type="text" id="tr" placeholder="القاعة (اختياري)"><button class="btn" data-act="addtt">＋ إضافة</button></div>
  ${list.map(x => `<div class="card"><b>${x.time}</b><div style="flex:1"><b>${esc(x.n)}</b><small>${esc(x.room || '')}</small></div><button class="x" data-act="deltt" data-id="${x.id}">✕</button></div>`).join('') || '<div class="warn center">لا محاضرات في هذا اليوم.</div>'}</section>`;
}

/* flashcards */
function Decks() {
  if (S.rev) return Review();
  const d = S.decks.find(x => x.id === S.deckId);
  if (d) {
    const due = d.cards.filter(c => c.due <= Date.now()).length;
    return `<section class="pad">${Top('🗂 ' + esc(d.name))}
    <div class="row"><button class="btn gold" style="flex:1" data-act="review">▶ مراجعة (${due} مستحقة)</button><button class="btn red sm" data-act="deldeck">حذف</button></div>
    <input type="text" id="cq" placeholder="السؤال / المصطلح" style="margin-bottom:6px"><input type="text" id="ca" placeholder="الجواب / التعريف" style="margin-bottom:6px">
    <button class="btn sm" data-act="addcard">＋ إضافة بطاقة</button>
    <div style="margin-top:12px">${d.cards.map(c => `<div class="card"><div style="flex:1"><b>${esc(c.q)}</b><small>${esc(c.a)}</small></div><button class="x" data-act="delcard" data-id="${c.id}">✕</button></div>`).join('')}</div></section>`;
  }
  return `<section class="pad">${Top('🗂 بطاقات المراجعة')}
  <div class="row"><input type="text" id="dn" placeholder="اسم المجموعة (مثلاً: تشريح)"><button class="btn" data-act="adddeck">＋</button></div>
  ${S.decks.map(x => `<div class="card" data-act="opendeck" data-id="${x.id}"><div><b>${esc(x.name)}</b><small>${x.cards.length} بطاقة</small></div></div>`).join('') || '<div class="warn center">أنشئ مجموعة وأضف بطاقات؛ يعرضها التطبيق بنظام التكرار المتباعد ليثبت الحفظ.</div>'}</section>`;
}
function Review() {
  const d = S.decks.find(x => x.id === S.deckId), c = d && d.cards.find(x => x.id === S.rev.q[0]);
  if (!c) return `<section class="pad">${Top('🎉 انتهت المراجعة')}<div class="warn center">أحسنت! لا توجد بطاقات مستحقة الآن.</div></section>`;
  return `<section class="pad">${Top('مراجعة • متبقي ' + S.rev.q.length)}
  <div class="card" data-act="flip" style="min-height:190px;justify-content:center;text-align:center;font-size:20px"><div><b>${esc(c.q)}</b>${S.rev.show ? `<hr><div>${esc(c.a)}</div>` : '<small>اضغط لإظهار الجواب</small>'}</div></div>
  ${S.rev.show ? `<div class="row"><button class="btn red" style="flex:1" data-act="grade" data-g="0">نسيت</button><button class="btn gold" style="flex:1" data-act="grade" data-g="1">صعب</button><button class="btn" style="flex:1" data-act="grade" data-g="2">عرفت</button></div>` : ''}</section>`;
}
const INT = [0, 1, 3, 7, 14, 30];

/* pdf tools */
function PdfTools() {
  return `<section class="pad">${Top('🛠 أدوات PDF')}
  <label class="card"><span style="font-size:28px">🖼</span><div><b>صور إلى PDF</b><small>اختر صور الملزمة بالترتيب وتُحفظ في مكتبتك</small></div><input type="file" accept="image/*" multiple hidden data-in="imgs"></label>
  <div class="card" data-act="mergeui"><span style="font-size:28px">🧷</span><div><b>دمج ملفات PDF</b><small>ادمج عدة ملازم في ملف واحد</small></div></div>
  <div class="card" data-act="splitui"><span style="font-size:28px">✂️</span><div><b>استخراج صفحات</b><small>مثلاً 1-5, 9, 12-14</small></div></div></section>`;
}
async function addPdfBytes(name, bytes) {
  const m = { id: uid(), name, size: bytes.length, added: Date.now() };
  await pdfPut({ ...m, blob: new Blob([bytes], { type: 'application/pdf' }) });
  S.pdfs.unshift(m); render(); toast('تمت الإضافة إلى الملازم ✅');
}
const rng = (s, n) => { const o = []; s.split(/[,،]/).forEach(p => { const m = p.trim().match(/^(\d+)(?:-(\d+))?$/); if (!m) return; let a = +m[1], b = +(m[2] || m[1]); if (a > b) [a, b] = [b, a]; for (let i = Math.max(1, a); i <= Math.min(n, b); i++) o.push(i - 1); }); return o; };
async function imgs2pdf(files) {
  const doc = await PDFDocument.create();
  for (const f of files) {
    const bm = await createImageBitmap(f), k = Math.min(1, 2000 / Math.max(bm.width, bm.height));
    const c = document.createElement('canvas'); c.width = Math.round(bm.width * k); c.height = Math.round(bm.height * k);
    c.getContext('2d').drawImage(bm, 0, 0, c.width, c.height);
    const b = await new Promise(r => c.toBlob(r, 'image/jpeg', .9));
    const im = await doc.embedJpg(await b.arrayBuffer());
    doc.addPage([c.width, c.height]).drawImage(im, { x: 0, y: 0, width: c.width, height: c.height });
  }
  return doc.save();
}

/* about / settings */
const md = t => t.split('\n').map(l => l.startsWith('# ') ? `<h2>${esc(l.slice(2))}</h2>` : l.startsWith('## ') ? `<h3>${esc(l.slice(3))}</h3>` : l.startsWith('- ') ? `<li>${esc(l.slice(2))}</li>` : l.trim() ? `<p>${esc(l)}</p>` : '').join('');
function About() {
  return `<section class="pad center"><svg viewBox="0 0 1024 1024" style="width:120px;height:120px;background:linear-gradient(135deg,#17857a,#052a27);border-radius:28px">${symbol}</svg>
  <h2 style="margin-top:12px">توروكارو</h2><p>Torokaro • الإصدار ${VER}<br>تطبيق مجاني لطلاب الجامعات<br>تطوير: <b>بلال النعيمي</b></p>
  <div class="flag"><i></i><i></i><i></i></div><p><b>صُنع في العراق</b></p>
  <div style="text-align:start"><label>اسمك (يُحفظ على جهازك فقط)</label><input type="text" data-in="uname" value="${esc(S.name)}" style="margin:6px 0 12px">
  <label>المظهر</label><div class="chips" style="margin-top:6px">${[['auto', 'تلقائي'], ['light', '☀️ فاتح'], ['dark', '🌙 داكن']].map(([v, n]) => `<button class="chip ${S.theme === v ? 'on' : ''}" data-act="theme" data-v="${v}">${n}</button>`).join('')}</div></div>
  <div class="row" style="margin-top:8px"><button class="btn gold" style="flex:1" data-act="backup">📤 نسخ احتياطي</button>
  <label class="btn" style="flex:1">📥 استعادة<input type="file" accept="application/json,.json" hidden data-in="restore"></label></div>
  <div class="warn" style="text-align:start;margin:12px 0">⚠️ ${WARN}</div>
  <button class="btn" data-act="policy" style="width:100%">🔒 سياسة الخصوصية</button></section>`;
}

function render() {
  const f = { home: Home, lib: Lib, notes: Notes, tools: Tools, about: About, toro: Toro }[S.tab];
  $('#view').classList.toggle('chatv', S.tab === 'toro');
  $('#view').innerHTML = f();
  document.querySelectorAll('.nav button').forEach(b => b.classList.toggle('on', b.dataset.t === S.tab));
  if (S.tab === 'toro') { const m = $('#msgs'); if (m) m.scrollTop = m.scrollHeight; }
}
const enter = () => history.pushState({ n: 1 }, '');

/* ---------- PDF viewer ---------- */
const V = { doc: null, id: null, page: 1, zoom: 1, tool: 'view', color: '#ffd400', ann: {}, strokes: [], cur: null, task: null, tok: 0, erasing: false, night: false, txt: [] };

function bar() {
  const bm = (S.bm[V.id] || []).includes(V.page);
  $('#vbar').innerHTML =
    [['view', '✋ تحريك'], ['h', '🖍 تظليل'], ['u', '‗ خط تحت'], ['p', '✏️ قلم'], ['t', '📝 نص'], ['e', '🧽 ممحاة']]
      .map(([t, l]) => `<button data-act="tool" data-t="${t}" class="${V.tool === t ? 'on' : ''}">${l}</button>`).join('') +
    ['#ffd400', '#ff7ab6', '#4fd1ff', '#d7263d', '#2f6bff']
      .map(c => `<button class="dot ${V.color === c ? 'on' : ''}" data-act="color" data-c="${c}" style="background:${c}"></button>`).join('') +
    `<button data-act="undo">↩️</button><button data-act="zout">－</button><button data-act="zin">＋</button>
     <button data-act="prev">›</button><button data-act="goto">${V.page}/${V.doc.numPages}</button><button data-act="next">‹</button>
     <button data-act="vsearch">🔍</button><button data-act="bm">${bm ? '⭐' : '☆'}</button><button data-act="bml">📑</button>
     <button data-act="night" class="${V.night ? 'on' : ''}">🌙</button><button data-act="vtoro">${AV(16)} تورو</button><button data-act="vsnd">🎧</button><button data-act="vexp">📤 PDF</button>`;
  const o = $('#ovc'); o.style.pointerEvents = V.tool === 'view' ? 'none' : 'auto'; o.style.touchAction = 'none';
  $('#pdfc').style.filter = V.night ? 'invert(1) hue-rotate(180deg)' : '';
}

async function openPdf(id) {
  const rec = await pdfGet(id);
  if (!rec) return toast('الملف غير موجود');
  toast('جارٍ الفتح…');
  try { V.doc = await pdfjs.getDocument({ data: await rec.blob.arrayBuffer() }).promise; }
  catch { return toast('تعذّر فتح الملف'); }
  V.id = id; V.ann = await kvGet('ann:' + id, {}); V.page = Math.min(S.pg[id] || 1, V.doc.numPages); V.zoom = 1; V.tool = 'view'; V.txt = [];
  S.last = id; kvSet('last', id); addMin(.5);
  $('#vtitle').textContent = rec.name; $('#viewer').classList.add('open'); enter(); bar(); await drawPage();
}

async function drawPage() {
  const tok = ++V.tok;
  if (V.task) { try { V.task.cancel(); } catch { } try { await V.task.promise; } catch { } }
  const pg = await V.doc.getPage(V.page);
  if (tok !== V.tok) return;
  const box = $('#vscroll'), base = pg.getViewport({ scale: 1 });
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  const vp = pg.getViewport({ scale: ((box.clientWidth - 16) / base.width) * V.zoom * dpr });
  const c = $('#pdfc'), o = $('#ovc');
  c.width = o.width = vp.width; c.height = o.height = vp.height;
  c.style.width = o.style.width = vp.width / dpr + 'px';
  c.style.height = o.style.height = vp.height / dpr + 'px';
  V.strokes = V.ann[V.page] || (V.ann[V.page] = []);
  redraw();
  V.task = pg.render({ canvasContext: c.getContext('2d'), viewport: vp });
  try { await V.task.promise; } catch { return; }
  S.pg[V.id] = V.page; sv('pg'); bar();
}

function paint(x, s, W, H) {
  const p = s.pts; if (!p.length) return;
  x.save(); x.lineCap = 'round'; x.lineJoin = 'round'; x.strokeStyle = s.c; x.lineWidth = s.w * W;
  if (s.t === 't') {
    const fs = Math.max(12, .035 * W); x.font = `${fs}px sans-serif`; x.textBaseline = 'top';
    const w = x.measureText(s.txt).width + fs * .8;
    x.fillStyle = '#fff3a0'; x.strokeStyle = '#c9a400'; x.lineWidth = 1.5;
    x.beginPath(); x.roundRect(p[0][0] * W, p[0][1] * H, w, fs * 1.6, 6); x.fill(); x.stroke();
    x.fillStyle = '#222'; x.fillText(s.txt, p[0][0] * W + fs * .4, p[0][1] * H + fs * .3); x.restore(); return;
  }
  if (s.t === 'h') x.globalAlpha = .4;
  x.beginPath();
  if (s.t === 'p') { x.moveTo(p[0][0] * W, p[0][1] * H); p.forEach(a => x.lineTo(a[0] * W, a[1] * H)); if (p.length === 1) x.lineTo(p[0][0] * W + .1, p[0][1] * H); }
  else { const a = p[0], b = p[p.length - 1]; x.moveTo(a[0] * W, b[1] * H); x.lineTo(b[0] * W, b[1] * H); }
  x.stroke(); x.restore();
}
function redraw() {
  const o = $('#ovc'), x = o.getContext('2d');
  x.clearRect(0, 0, o.width, o.height);
  V.strokes.forEach(s => paint(x, s, o.width, o.height));
  if (V.cur) paint(x, V.cur, o.width, o.height);
}
let annT;
function saveAnn(now) {
  if (!V.id) return;
  clearTimeout(annT);
  if (now) kvSet('ann:' + V.id, V.ann); else annT = setTimeout(() => kvSet('ann:' + V.id, V.ann), 500);
}
function hit(s, p, W, H) {
  const q = s.pts.map(a => [a[0] * W, a[1] * H]), x = p[0] * W, y = p[1] * H, r = Math.max(14, .03 * W);
  if (s.t === 't') return Math.abs(x - q[0][0] - .1 * W) < .12 * W && Math.abs(y - q[0][1]) < .05 * W;
  let L = q;
  if (s.t !== 'p') { const a = q[0], b = q[q.length - 1]; L = [[a[0], b[1]], [b[0], b[1]]]; }
  if (L.length === 1) return Math.hypot(x - L[0][0], y - L[0][1]) < r;
  for (let i = 0; i < L.length - 1; i++) {
    const [ax, ay] = L[i], [bx, by] = L[i + 1], dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l));
    if (Math.hypot(x - (ax + t * dx), y - (ay + t * dy)) < r) return true;
  }
  return false;
}
function erase(p) {
  const o = $('#ovc'), n = V.strokes.length;
  const keep = V.strokes.filter(s => !hit(s, p, o.width, o.height));
  if (keep.length !== n) { V.ann[V.page] = V.strokes = keep; redraw(); saveAnn(); }
}
{
  const o = $('#ovc');
  const pt = e => { const r = o.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; };
  o.addEventListener('pointerdown', e => {
    if (V.tool === 'view') return;
    e.preventDefault();
    const p = pt(e);
    if (V.tool === 't') {
      const txt = (prompt('اكتب الملاحظة') || '').trim();
      if (txt) { V.strokes.push({ t: 't', c: V.color, w: .004, pts: [p], txt }); redraw(); saveAnn(); }
      return;
    }
    o.setPointerCapture(e.pointerId);
    if (V.tool === 'e') { V.erasing = true; erase(p); return; }
    V.cur = { t: V.tool, c: V.color, w: V.tool === 'h' ? .034 : .004, pts: [p] };
  });
  o.addEventListener('pointermove', e => {
    if (V.erasing) return erase(pt(e));
    if (!V.cur) return;
    V.cur.pts.push(pt(e)); redraw();
  });
  const up = () => {
    V.erasing = false;
    if (V.cur) {
      if (V.cur.t === 'p' || V.cur.pts.length > 1) { V.strokes.push(V.cur); saveAnn(); }
      V.cur = null; redraw();
    }
  };
  o.addEventListener('pointerup', up); o.addEventListener('pointercancel', up);
}
function closeViewer() {
  saveAnn(true); flush();
  $('#viewer').classList.remove('open'); V.id = null; V.doc = null; render();
}

async function vsearch() {
  const q = (prompt('ابحث داخل الملزمة') || '').trim().toLowerCase(); if (!q) return;
  toast('جارٍ البحث…');
  const hits = [];
  for (let i = 1; i <= V.doc.numPages; i++) {
    if (V.txt[i] === undefined) { const c = await (await V.doc.getPage(i)).getTextContent(); V.txt[i] = c.items.map(t => t.str).join(' ').toLowerCase(); }
    const at = V.txt[i].indexOf(q);
    if (at >= 0) hits.push([i, V.txt[i].slice(Math.max(0, at - 25), at + 45)]);
  }
  modal((hits.length ? `<h3>نتائج «${esc(q)}» في ${hits.length} صفحة</h3>` + hits.slice(0, 60).map(([p, s]) => `<div class="card" data-act="gopage" data-p="${p}"><div><b>صفحة ${p}</b><small>${esc(s)}</small></div></div>`).join('') : '<p>لا توجد نتائج. (الملازم الممسوحة كصور لا يمكن البحث فيها)</p>') + closeBtn);
}

const hex = c => rgb(parseInt(c.slice(1, 3), 16) / 255, parseInt(c.slice(3, 5), 16) / 255, parseInt(c.slice(5, 7), 16) / 255);
async function exportPdf() {
  toast('جارٍ تجهيز الملف…');
  try {
    const rec = await pdfGet(V.id);
    const doc = await PDFDocument.load(await rec.blob.arrayBuffer(), { ignoreEncryption: true });
    const pages = doc.getPages();
    for (const [pn, list] of Object.entries(V.ann)) {
      const pg = pages[pn - 1]; if (!pg) continue;
      const { width: W, height: H } = pg.getSize();
      for (const s of list) {
        if (s.t === 't') continue;
        const col = hex(s.c), th = s.w * W, p = s.pts;
        if (s.t === 'p') { for (let i = 0; i < p.length - 1; i++) pg.drawLine({ start: { x: p[i][0] * W, y: H - p[i][1] * H }, end: { x: p[i + 1][0] * W, y: H - p[i + 1][1] * H }, thickness: th, color: col, lineCap: 1 }); }
        else { const a = p[0], b = p[p.length - 1]; pg.drawLine({ start: { x: a[0] * W, y: H - b[1] * H }, end: { x: b[0] * W, y: H - b[1] * H }, thickness: th, color: col, opacity: s.t === 'h' ? .4 : 1 }); }
      }
    }
    await shareFile(await doc.save(), 'torokaro-annotated-' + Date.now() + '.pdf', 'application/pdf');
  } catch (err) { toast('تعذّر التصدير'); }
}

/* ---------- backup ---------- */
async function applyPend() {
  const pend = await kvGet('pend', {}); let ch = false;
  for (const p of S.pdfs) {
    const k = p.name + '|' + p.size, r = pend[k];
    if (r) { await kvSet('ann:' + p.id, r.ann || {}); S.bm[p.id] = r.bm || []; S.pg[p.id] = r.pg || 1; delete pend[k]; ch = true; }
  }
  if (ch) { await kvSet('pend', pend); sv('bm'); sv('pg'); }
}
async function backup() {
  flush();
  const o = { v: 1, app: 'torokaro', name: S.name, pend: {} };
  ['notes', 'tasks', 'courses', 'decks', 'tt', 'exams', 'stats', 'fin'].forEach(k => o[k] = S[k]);
  for (const p of S.pdfs) o.pend[p.name + '|' + p.size] = { ann: await kvGet('ann:' + p.id, {}), bm: S.bm[p.id] || [], pg: S.pg[p.id] || 1 };
  try { await shareFile(JSON.stringify(o), 'torokaro-backup-' + today() + '.json', 'application/json'); } catch { toast('تعذّر إنشاء النسخة'); }
}
async function restore(f) {
  try {
    const o = JSON.parse(await f.text());
    if (!['torokaro', 'torocaro', 'manhal'].includes(o.app)) throw 0;
    if (!confirm('سيتم استبدال بياناتك الحالية بالنسخة الاحتياطية. متابعة؟')) return;
    ['notes', 'tasks', 'courses', 'decks', 'tt', 'exams', 'stats', 'fin'].forEach(k => { if (o[k]) { S[k] = o[k]; kvSet(k, S[k]); } });
    if (o.name) { S.name = o.name; localStorage.setItem('uname', o.name); }
    await kvSet('pend', { ...(await kvGet('pend', {})), ...(o.pend || {}) });
    await applyPend(); render(); toast('تمت الاستعادة ✅ أعد إضافة ملفات PDF لتعود تظليلاتها');
  } catch { toast('ملف غير صالح'); }
}

/* ---------- events ---------- */
document.addEventListener('click', async e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const a = el.dataset.act, d = el.dataset;
  if (toroAct(a, d)) return;
  if (['snd', 'ssl', 'sall'].includes(a)) { sndAct(a, d); return; }
  if (a === 'vsnd') { modal(`<h3>🎧 أصوات الدراسة</h3><div class="mx">${Mixer()}</div>${closeBtn}`); return; }
  switch (a) {
    case 'tab': S.tab = d.t; S.sub = null; S.noteId = null; S.deckId = null; S.rev = null; S.q = ''; render(); break;
    case 'go': S.tab = 'tools'; S.sub = d.s; enter(); render(); break;
    case 'back': history.back(); break;
    case 'theme': S.theme = d.v; localStorage.setItem('theme', d.v); applyTheme(); render(); break;
    case 'openpdf': openPdf(d.id); break;
    case 'delpdf':
      if (confirm('حذف هذه الملزمة وتظليلاتها نهائياً؟')) { await pdfDel(d.id); await kvSet('ann:' + d.id, {}); S.pdfs = S.pdfs.filter(p => p.id !== d.id); render(); toast('تم الحذف'); } break;
    case 'vclose': history.back(); break;
    case 'vtoro': {
      toast('جارٍ تجهيز الصفحة…');
      try {
        const c = await (await V.doc.getPage(V.page)).getTextContent(), txt = c.items.map(t => t.str).join(' ').trim();
        if (txt.length > 30) setAtt({ label: 'صفحة ' + V.page, ctx: txt.slice(0, 9000) });
        else setAtt({ label: 'صفحة ' + V.page + ' (صورة)', img: await shrink($('#pdfc')) });
        S.tab = 'toro'; S.sub = null; history.back();
      } catch { toast('تعذّر تجهيز الصفحة'); }
      break;
    }
    case 'vsave': saveAnn(true); flush(); toast('تم الحفظ ✅'); break;
    case 'tool': V.tool = d.t; bar(); break;
    case 'color': V.color = d.c; if (V.tool === 'view' || V.tool === 'e') V.tool = 'h'; bar(); break;
    case 'undo': V.strokes.pop(); redraw(); saveAnn(); break;
    case 'zin': V.zoom = Math.min(4, V.zoom * 1.25); drawPage(); break;
    case 'zout': V.zoom = Math.max(.6, V.zoom / 1.25); drawPage(); break;
    case 'prev': if (V.page > 1) { V.page--; $('#vscroll').scrollTop = 0; drawPage(); } break;
    case 'next': if (V.page < V.doc.numPages) { V.page++; $('#vscroll').scrollTop = 0; drawPage(); } break;
    case 'goto': { const n = parseInt(prompt('اذهب إلى الصفحة (1-' + V.doc.numPages + ')', V.page)); if (n >= 1 && n <= V.doc.numPages) { V.page = n; $('#vscroll').scrollTop = 0; drawPage(); } break; }
    case 'gopage': closeModal(); V.page = +d.p; $('#vscroll').scrollTop = 0; drawPage(); break;
    case 'vsearch': vsearch(); break;
    case 'night': V.night = !V.night; bar(); break;
    case 'vexp': exportPdf(); break;
    case 'bm': { const l = S.bm[V.id] || (S.bm[V.id] = []), i = l.indexOf(V.page); if (i >= 0) l.splice(i, 1); else l.push(V.page); sv('bm'); toast(i >= 0 ? 'أُزيلت العلامة' : 'تمت إضافة علامة ⭐'); bar(); break; }
    case 'bml': { const l = [...(S.bm[V.id] || [])].sort((x, y) => x - y); modal((l.length ? '<h3>⭐ علاماتي</h3>' + l.map(p => `<div class="card" data-act="gopage" data-p="${p}"><b>صفحة ${p}</b></div>`).join('') : '<p>لا توجد علامات. اضغط ☆ لإضافة علامة للصفحة الحالية.</p>') + closeBtn); break; }

    case 'newnote': { const n = { id: uid(), t: '', b: '', u: Date.now(), p: false }; S.notes.push(n); S.noteId = n.id; sv('notes'); enter(); render(); break; }
    case 'opennote': S.noteId = d.id; enter(); render(); break;
    case 'pinnote': { const n = S.notes.find(x => x.id === S.noteId); n.p = !n.p; sv('notes'); render(); break; }
    case 'savenote': flush(); toast('تم الحفظ ✅'); break;
    case 'delnote': if (confirm('حذف الملاحظة؟')) { S.notes = S.notes.filter(n => n.id !== S.noteId); sv('notes'); flush(); history.back(); } break;

    case 'addc': S.courses.push({ id: uid(), n: '', g: '', u: '' }); sv('courses'); render(); break;
    case 'delc': S.courses = S.courses.filter(c => c.id !== d.id); if (!S.courses.length) S.courses.push({ id: uid(), n: '', g: '', u: '' }); sv('courses'); render(); break;
    case 'k': {
      const k = d.k;
      if (k === 'C') { CALC.e = ''; CALC.r = ''; } else if (k === '⌫') CALC.e = CALC.e.slice(0, -1);
      else if (k === '=') { try { CALC.r = String(+calc(CALC.e).toPrecision(12)); } catch { CALC.r = 'خطأ'; } }
      else CALC.e += k;
      $('#cd').innerHTML = cdHtml(); break;
    }
    case 'pmode': pstop(); P.m = d.m; P.left = d.m === 'f' ? 1500 : 300; render(); break;
    case 'preset': pstop(); P.left = P.m === 'f' ? 1500 : 300; render(); break;
    case 'pgo':
      if (P.iv) pstop(); else { if (!P.left) P.left = P.m === 'f' ? 1500 : 300; P.end = Date.now() + P.left * 1000; P.iv = setInterval(ptick, 500); }
      render(); break;

    case 'addtask': {
      const i = $('#ti'); if (!i.value.trim()) break;
      const t = { id: uid(), t: i.value.trim(), d: false, due: $('#td').value || '' };
      S.tasks.unshift(t); sv('tasks');
      if (t.due) schedule('t' + t.id, '✅ تذكير بمهمة', t.t, new Date(t.due + 'T08:00').getTime());
      render(); break;
    }
    case 'tgl': { const t = S.tasks.find(x => x.id === d.id); t.d = !t.d; if (t.d) cancel('t' + t.id); sv('tasks'); render(); break; }
    case 'deltask': cancel('t' + d.id); S.tasks = S.tasks.filter(t => t.id !== d.id); sv('tasks'); render(); break;

    case 'addexam': {
      const n = $('#en').value.trim(), dt = $('#ed').value; if (!n || !dt) { toast('اكتب المادة والتاريخ'); break; }
      const ex = { id: uid(), n, date: dt }; S.exams.push(ex); sv('exams');
      const t = new Date(dt + 'T08:00').getTime();
      schedule('e' + ex.id + 'a', '📚 امتحانك غداً: ' + n, 'استعد وراجع ملازمك', t - 864e5);
      schedule('e' + ex.id + 'b', '📚 امتحان اليوم: ' + n, 'بالتوفيق! 🌟', t - 3600e3);
      render(); toast('تمت الإضافة ✅'); break;
    }
    case 'delexam': cancel('e' + d.id + 'a'); cancel('e' + d.id + 'b'); S.exams = S.exams.filter(x => x.id !== d.id); sv('exams'); render(); break;

    case 'ttday': S.ttDay = +d.d; render(); break;
    case 'addtt': { const n = $('#tn').value.trim(); if (!n) break; S.tt.push({ id: uid(), day: S.ttDay, n, time: $('#tm').value || '08:00', room: $('#tr').value.trim() }); sv('tt'); render(); break; }
    case 'deltt': S.tt = S.tt.filter(x => x.id !== d.id); sv('tt'); render(); break;

    case 'adddeck': { const n = $('#dn').value.trim(); if (!n) break; S.decks.push({ id: uid(), name: n, cards: [] }); sv('decks'); render(); break; }
    case 'opendeck': S.deckId = d.id; enter(); render(); break;
    case 'deldeck': if (confirm('حذف المجموعة وكل بطاقاتها؟')) { S.decks = S.decks.filter(x => x.id !== S.deckId); sv('decks'); history.back(); } break;
    case 'addcard': {
      const q = $('#cq').value.trim(), an = $('#ca').value.trim(); if (!q || !an) { toast('اكتب السؤال والجواب'); break; }
      S.decks.find(x => x.id === S.deckId).cards.push({ id: uid(), q, a: an, box: 1, due: 0 }); sv('decks'); render(); break;
    }
    case 'delcard': { const dk = S.decks.find(x => x.id === S.deckId); dk.cards = dk.cards.filter(c => c.id !== d.id); sv('decks'); render(); break; }
    case 'review': {
      const dk = S.decks.find(x => x.id === S.deckId), q = dk.cards.filter(c => c.due <= Date.now()).map(c => c.id).sort(() => Math.random() - .5);
      if (!q.length) { toast('لا توجد بطاقات مستحقة الآن 🎉'); break; }
      S.rev = { q, show: false }; enter(); render(); break;
    }
    case 'flip': S.rev.show = true; render(); break;
    case 'grade': {
      const dk = S.decks.find(x => x.id === S.deckId), id = S.rev.q.shift(), c = dk.cards.find(x => x.id === id), g = +d.g;
      c.box = g === 0 ? 1 : g === 2 ? Math.min(5, c.box + 1) : c.box;
      c.due = g === 0 ? 0 : Date.now() + INT[c.box] * 864e5;
      if (g === 0) S.rev.q.push(id);
      S.rev.show = false; addMin(.3); sv('decks'); render(); break;
    }

    case 'mergeui': modal(`<h3>🧷 دمج ملفات PDF</h3><p>علّم الملفات (يُدمجون بترتيب ظهورهم):</p>${S.pdfs.map(p => `<label class="card"><input type="checkbox" data-mg="${p.id}" style="width:20px;height:20px"> ${esc(p.name)}</label>`).join('') || '<p>لا توجد ملفات</p>'}<button class="btn" style="width:100%" data-act="domerge">دمج</button>${closeBtn}`); break;
    case 'domerge': {
      const ids = [...document.querySelectorAll('[data-mg]:checked')].map(x => x.dataset.mg);
      if (ids.length < 2) { toast('اختر ملفين على الأقل'); break; }
      closeModal(); toast('جارٍ الدمج…');
      try {
        const out = await PDFDocument.create();
        for (const id of ids) { const r = await pdfGet(id), src = await PDFDocument.load(await r.blob.arrayBuffer(), { ignoreEncryption: true }); (await out.copyPages(src, src.getPageIndices())).forEach(p => out.addPage(p)); }
        await addPdfBytes('دمج ' + today(), await out.save());
      } catch { toast('تعذّر الدمج'); } break;
    }
    case 'splitui': modal(`<h3>✂️ استخراج صفحات</h3><select id="sp" style="width:100%;padding:10px;border-radius:12px;margin-bottom:8px">${S.pdfs.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select><input type="text" id="sr" placeholder="مثال: 1-5, 9, 12-14" style="margin-bottom:8px"><button class="btn" style="width:100%" data-act="dosplit">استخراج</button>${closeBtn}`); break;
    case 'dosplit': {
      const id = $('#sp') && $('#sp').value, txt = $('#sr').value; if (!id) break;
      closeModal(); toast('جارٍ الاستخراج…');
      try {
        const r = await pdfGet(id), src = await PDFDocument.load(await r.blob.arrayBuffer(), { ignoreEncryption: true }), idx = rng(txt, src.getPageCount());
        if (!idx.length) { toast('نطاق غير صالح'); break; }
        const out = await PDFDocument.create(); (await out.copyPages(src, idx)).forEach(p => out.addPage(p));
        await addPdfBytes(r.name + ' (مستخرج)', await out.save());
      } catch { toast('تعذّر الاستخراج'); } break;
    }

    case 'backup': backup(); break;
    case 'policy': modal(`<div class="pol">${md(policy)}</div>${closeBtn}`); break;
    case 'mclose': closeModal(); break;
    case 'startname': S.name = ($('#nm').value || '').trim(); localStorage.setItem('uname', S.name); closeModal(); render(); break;
  }
});

addEventListener('input', e => {
  const t = e.target, k = t.dataset.in, id = t.dataset.id;
  if (!k || ['addpdf', 'imgs', 'restore', 'tfile'].includes(k)) return;
  if (k === 'sv') { setVol(id, t.value / 100); return; }
  if (k === 'uname') { S.name = t.value.trim(); localStorage.setItem('uname', S.name); return; }
  if (k === 'q') { S.q = t.value; const l = $('#lst'); if (l) l.innerHTML = (S.tab === 'lib' ? LibList : NotesList)(); return; }
  if (k.startsWith('f_')) { S.fin[k.slice(2)] = t.value; sv('fin'); $('#fres').innerHTML = fres(); return; }
  if (k[0] === 'c') { const c = S.courses.find(x => x.id === id); c[k[1]] = t.value; sv('courses'); $('#gres').innerHTML = gres(); return; }
  const n = S.notes.find(x => x.id === S.noteId); if (!n) return;
  n[k === 'ntitle' ? 't' : 'b'] = t.value; n.u = Date.now(); sv('notes');
});

addEventListener('change', async e => {
  const k = e.target.dataset.in, fs = [...(e.target.files || [])];
  if (!fs.length) return;
  if (k === 'addpdf') {
    toast('جارٍ الإضافة…');
    for (const f of fs) { const m = { id: uid(), name: f.name.replace(/\.pdf$/i, ''), size: f.size, added: Date.now() }; await pdfPut({ ...m, blob: f }); S.pdfs.unshift(m); }
    await applyPend(); render(); toast('تمت الإضافة ✅');
  } else if (k === 'imgs') {
    toast('جارٍ التحويل…');
    try { await addPdfBytes('مسح ' + today(), await imgs2pdf(fs)); } catch { toast('تعذّر التحويل'); }
  } else if (k === 'restore') restore(fs[0]);
  else if (k === 'tfile') { await onToroFile(fs[0]); e.target.value = ''; }
});

addEventListener('popstate', () => {
  if ($('#viewer').classList.contains('open')) return closeViewer();
  if (S.rev) S.rev = null;
  else if (S.deckId) S.deckId = null;
  else if (S.sub || S.noteId) { S.sub = null; S.noteId = null; }
  else return;
  render();
});

/* ---------- start ---------- */
async function init() {
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch { }
  S.pdfs = (await pdfAll()).map(({ id, name, size, added }) => ({ id, name, size, added })).sort((a, b) => b.added - a.added);
  for (const k of ['pg', 'bm', 'stats']) S[k] = await kvGet(k, {});
  for (const k of ['notes', 'tasks', 'decks', 'tt', 'exams']) S[k] = await kvGet(k, []);
  S.fin = await kvGet('fin', S.fin);
  S.courses = await kvGet('courses', [{ id: uid(), n: '', g: '', u: '' }]);
  S.last = await kvGet('last', null);
  await initToro({ S, sv, modal, closeModal, toast, esc, uid, pdfjs, rng });
  $('#navtoro').innerHTML = AV(26);
  applyTheme(); render();
}
splash();
Promise.all([init(), new Promise(r => setTimeout(r, 2900))]).then(() => {
  $('#splash').classList.add('out');
  setTimeout(() => { $('#splash').remove(); }, 700);
  if (!S.name) modal(`<h2>👋 أهلاً بك في توروكارو</h2><p>ما اسمك؟ يُحفظ اسمك على جهازك فقط.</p>
    <input type="text" id="nm" placeholder="اسمك"><div class="warn" style="margin:12px 0">⚠️ ${WARN}</div>
    <button class="btn" style="width:100%" data-act="startname">ابدأ</button>`);
});
