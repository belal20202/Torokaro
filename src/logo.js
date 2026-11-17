export function star(cx, cy, R, r, n = 8) {
  const p = [];
  for (let i = 0; i < n * 2; i++) {
    const a = -Math.PI / 2 + i * Math.PI / n, d = i % 2 ? r : R;
    p.push((cx + d * Math.cos(a)).toFixed(1) + ',' + (cy + d * Math.sin(a)).toFixed(1));
  }
  return p.join(' ');
}

/* شخصية تورو: ولد مثقف بنظارة وقبعة تخرج وكتاب (إحداثيات 0..100) */
export const boy = `<defs><clipPath id="avc"><circle cx="50" cy="50" r="50"/></clipPath></defs>
<g clip-path="url(#avc)">
<circle cx="50" cy="50" r="50" fill="#11695f"/>
<polygon class="bgst" points="${star(50, 46, 47, 20)}" fill="#ffffff" fill-opacity=".09"/>
<g class="bd"><path d="M16 100Q18 74 50 72Q82 74 84 100Z" fill="#e8b53a"/><path d="M42 72L50 82L58 72Z" fill="#fff"/><rect x="44" y="62" width="12" height="12" rx="4" fill="#e9b98d"/></g>
<g class="hd"><circle cx="27" cy="50" r="4.5" fill="#f2c9a0"/><circle cx="73" cy="50" r="4.5" fill="#f2c9a0"/><circle cx="50" cy="48" r="22" fill="#f2c9a0"/><path d="M28 44Q27 26 50 26Q73 26 72 44Q66 34 50 34Q34 34 28 44Z" fill="#2b1d14"/><circle cx="41" cy="50" r="7.5" fill="#fff" fill-opacity=".45" stroke="#2b1d14" stroke-width="2.2"/><circle cx="59" cy="50" r="7.5" fill="#fff" fill-opacity=".45" stroke="#2b1d14" stroke-width="2.2"/><path d="M48.5 49.5Q50 48 51.5 49.5" stroke="#2b1d14" stroke-width="2" fill="none"/><circle cx="41" cy="50" r="2.2" fill="#2b1d14"/><circle cx="59" cy="50" r="2.2" fill="#2b1d14"/><path d="M44 59Q50 64.5 56 59" stroke="#8a4b2d" stroke-width="2.2" fill="none" stroke-linecap="round"/></g>
<g class="cap"><path d="M50 12L82 24L50 36L18 24Z" fill="#16302d"/><path d="M35 30V38Q50 45 65 38V30Q50 37 35 30Z" fill="#16302d"/><path d="M78 25V38" stroke="#e8b53a" stroke-width="2.4"/><circle cx="78" cy="40" r="2.6" fill="#e8b53a"/></g>
<g class="bk"><rect x="33" y="82" width="34" height="15" rx="2.5" fill="#d7263d"/><path d="M50 82V97" stroke="#fff" stroke-opacity=".7" stroke-width="1.5"/></g>
</g>
<circle class="ring" cx="50" cy="50" r="48.5" fill="none" stroke="#e8b53a" stroke-width="3"/>`;

/* الأيقونة: الشخصية داخل حلقة ذهبية (إحداثيات 0..1024) */
export const symbol = `<g transform="translate(112 112) scale(8)">${boy}</g>`;
