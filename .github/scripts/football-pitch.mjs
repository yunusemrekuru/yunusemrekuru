// Generates assets/football-pitch.svg — the contribution calendar rendered as a night-match
// football pitch: the ball is dribbled past "bug" defenders across the year, then shot into the net.
// Usage: GITHUB_TOKEN=... GITHUB_USER=yunusemrekuru node .github/scripts/football-pitch.mjs [out.svg]
import { writeFileSync } from 'node:fs';

const USER = process.env.GITHUB_USER || 'yunusemrekuru';
const TOKEN = process.env.GITHUB_TOKEN;
const OUT = process.argv[2] || 'assets/football-pitch.svg';
if (!TOKEN) throw new Error('GITHUB_TOKEN is required');

const query = `query($login:String!){ user(login:$login){ contributionsCollection{ contributionCalendar{
  totalContributions weeks{ contributionDays{ date contributionCount contributionLevel weekday } } } } } }`;
const res = await fetch('https://api.github.com/graphql', {
  method: 'POST',
  headers: { Authorization: `bearer ${TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query, variables: { login: USER } }),
});
const json = await res.json();
if (!json.data?.user) throw new Error(`GitHub API error: ${JSON.stringify(json.errors || json)}`);
const cal = json.data.user.contributionsCollection.contributionCalendar;

/* ───────────── data ───────────── */
const LEVEL = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 };
const days = cal.weeks.flatMap((w, wi) => w.contributionDays.map(d => ({ ...d, wi, level: LEVEL[d.contributionLevel] ?? 0 })));
const active = days.filter(d => d.contributionCount > 0);
let streak = 0, run = 0;
for (const d of days) { run = d.contributionCount > 0 ? run + 1 : 0; streak = Math.max(streak, run); }
const topDay = Math.max(0, ...days.map(d => d.contributionCount));
const y0 = days[0].date.slice(0, 4), y1 = days.at(-1).date.slice(2, 4);
const season = `${y0}/${y1}`;

/* ───────────── geometry ───────────── */
const W = 1000, H = 296;
const CELL = 12, STEP = 15, WEEKS = cal.weeks.length;
const GW = WEEKS * STEP - 3, GH = 7 * STEP - 3;
const GX = Math.round(W / 2 - GW / 2), CY = 164, GY = CY - Math.round(GH / 2);
const PX0 = GX - 22, PX1 = GX + GW + 22, PY0 = GY - 22, PY1 = GY + GH + 22; // touchlines
const GOAL = { x: PX1 + 4, y: CY + 7 };
const T = 24; // loop seconds
const tKick = 0.03, tDrib = 0.68, tShot = 0.74, tReset = 0.97;

const SANS = "font-family=\"-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, sans-serif\"";
const MONO = "font-family=\"'SF Mono', 'JetBrains Mono', 'Fira Code', Consolas, monospace\"";
const f = n => +n.toFixed(4);
const cellX = wi => GX + wi * STEP + CELL / 2;
const cellY = wd => GY + wd * STEP + CELL / 2;

/* ───────────── dribble route ─────────────
   A slalom across the pitch; weeks with contributions pull the ball onto their busiest day. */
const way = [{ x: PX0 + 6, y: CY }];
const busiest = new Map();
for (const d of active) if (!busiest.has(d.wi) || d.contributionCount > busiest.get(d.wi).contributionCount) busiest.set(d.wi, d);
for (let wi = 3; wi < WEEKS - 1; wi += 4) {
  const near = [...busiest.keys()].some(k => Math.abs(k - wi) <= 2);
  if (!near) way.push({ x: cellX(wi), y: CY + 36 * Math.sin(wi * 0.55) });
}
for (const d of busiest.values()) way.push({ x: cellX(d.wi), y: cellY(d.weekday) });
way.sort((a, b) => a.x - b.x);
way.push({ x: PX1 - 58, y: CY - 18 }); // shooting position at the edge of the box

const seg = way.slice(1).map((p, i) => Math.hypot(p.x - way[i].x, p.y - way[i].y));
const totalLen = seg.reduce((a, b) => a + b, 0) || 1;
let acc = 0;
const wayT = way.map((p, i) => { if (i) acc += seg[i - 1]; return tKick + (tDrib - tKick) * (acc / totalLen); });
// time at which the ball passes a given x (route is monotonic in x)
const timeAtX = x => {
  if (x <= way[0].x) return wayT[0];
  for (let i = 1; i < way.length; i++) if (x <= way[i].x) return wayT[i - 1] + (wayT[i] - wayT[i - 1]) * ((x - way[i - 1].x) / (way[i].x - way[i - 1].x || 1));
  return tDrib;
};
const yAtX = x => {
  for (let i = 1; i < way.length; i++) if (x <= way[i].x) return way[i - 1].y + (way[i].y - way[i - 1].y) * ((x - way[i - 1].x) / (way[i].x - way[i - 1].x || 1));
  return way.at(-1).y;
};

function track(points, times) {
  return `values="${points.map(p => `${f(p.x)} ${f(p.y)}`).join(';')}" keyTimes="${times.map(f).join(';')}"`;
}

/* ball: kickoff → dribble → shot → rests in the net → hidden reset */
const ballPts = [way[0], ...way, GOAL, GOAL, way[0]];
const ballT = [0, ...wayT, tShot, tReset + 0.015, 1];
/* player (#10) trails the ball by a beat, stops at the shot, celebrates, then resets */
const lag = 0.012;
const playerPts = [way[0], ...way.map(p => ({ x: p.x - 12, y: p.y + 4 })), { x: way.at(-1).x + 10, y: way.at(-1).y + 4 }, { x: way.at(-1).x + 10, y: way.at(-1).y + 4 }, way[0]];
const playerT = [0, ...wayT.map(t => Math.min(t + lag, tDrib + lag)), tShot, tReset + 0.015, 1];

/* ───────────── layers ───────────── */
const PAL = ['#ffffff', '#0b6b57', '#11a386', '#1ad6b0', '#00f5d4'];
let cells = '';
for (const d of days) {
  const x = GX + d.wi * STEP, y = GY + d.weekday * STEP;
  if (!d.level) { cells += `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="3" fill="#ffffff" fill-opacity="0.04"/>`; continue; }
  const tc = timeAtX(x + CELL / 2);
  cells += `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="3" fill="${PAL[d.level]}"${d.level >= 3 ? ' filter="url(#glow)"' : ''}/>`;
  cells += `<rect x="${x - 2}" y="${y - 2}" width="${CELL + 4}" height="${CELL + 4}" rx="4" fill="#d9fff8" opacity="0"><animate attributeName="opacity" values="0;0;0.55;0;0" keyTimes="0;${f(tc)};${f(tc + 0.004)};${f(tc + 0.04)};1" dur="${T}s" repeatCount="indefinite"/></rect>`;
}

let stripes = '';
for (let i = 0, x = PX0; x < PX1; i++, x += 66) if (i % 2) stripes += `<rect x="${x}" y="${PY0}" width="${Math.min(66, PX1 - x)}" height="${PY1 - PY0}" fill="#ffffff" fill-opacity="0.022"/>`;

const L = 'stroke="#7fe9da" stroke-opacity="0.32" stroke-width="1.2" fill="none"';
const boxW = 74, boxH = 104, sixW = 26, sixH = 56;
const lines = `
  <rect x="${PX0}" y="${PY0}" width="${PX1 - PX0}" height="${PY1 - PY0}" rx="6" ${L}/>
  <line x1="${W / 2}" y1="${PY0}" x2="${W / 2}" y2="${PY1}" ${L}/>
  <circle cx="${W / 2}" cy="${CY}" r="36" ${L}/><circle cx="${W / 2}" cy="${CY}" r="2.2" fill="#7fe9da" fill-opacity="0.5"/>
  <rect x="${PX0}" y="${CY - boxH / 2}" width="${boxW}" height="${boxH}" ${L}/><rect x="${PX0}" y="${CY - sixH / 2}" width="${sixW}" height="${sixH}" ${L}/>
  <rect x="${PX1 - boxW}" y="${CY - boxH / 2}" width="${boxW}" height="${boxH}" ${L}/><rect x="${PX1 - sixW}" y="${CY - sixH / 2}" width="${sixW}" height="${sixH}" ${L}/>
  <path d="M${PX0 + boxW} ${CY - 22} A 26 26 0 0 1 ${PX0 + boxW} ${CY + 22}" ${L}/>
  <path d="M${PX1 - boxW} ${CY - 22} A 26 26 0 0 0 ${PX1 - boxW} ${CY + 22}" ${L}/>
  ${[[PX0, PY0, 0], [PX1, PY0, 90], [PX1, PY1, 180], [PX0, PY1, 270]].map(([x, y, r]) => `<path d="M${x} ${y + 7} A 7 7 0 0 0 ${x + 7} ${y}" ${L} transform="rotate(${r} ${x} ${y})"/>`).join('')}`;

function goal(x, dir, animated) {
  const gw = 20, gh = 60, gx = dir > 0 ? x : x - gw, gy = CY - gh / 2;
  let net = '';
  for (let i = 1; i < 5; i++) net += `<line x1="${gx + (gw * i) / 5}" y1="${gy}" x2="${gx + (gw * i) / 5}" y2="${gy + gh}"/>`;
  for (let i = 1; i < 10; i++) net += `<line x1="${gx}" y1="${gy + (gh * i) / 10}" x2="${gx + gw}" y2="${gy + (gh * i) / 10}"/>`;
  const ripple = animated ? `<animateTransform attributeName="transform" type="translate" values="0 0;0 0;7 0;-2 0;2 0;0 0;0 0" keyTimes="0;${f(tShot)};${f(tShot + 0.01)};${f(tShot + 0.025)};${f(tShot + 0.04)};${f(tShot + 0.06)};1" dur="${T}s" repeatCount="indefinite"/>` : '';
  return `<g><rect x="${gx}" y="${gy}" width="${gw}" height="${gh}" fill="#ffffff" fill-opacity="0.03"/>
    <g stroke="#e2e8f0" stroke-opacity="0.22" stroke-width="0.8">${ripple}${net}</g>
    <path d="M${dir > 0 ? x : x} ${gy} H${dir > 0 ? gx + gw : gx} V${gy + gh} H${x}" fill="none" stroke="#f8fafc" stroke-opacity="0.85" stroke-width="2.2" stroke-linejoin="round"/></g>`;
}

/* bug defenders the ball dribbles past */
let bugs = '';
[0.16, 0.34, 0.52, 0.7, 0.86].forEach((p, k) => {
  const x = GX + GW * p, side = k % 2 ? -1 : 1;
  const y = Math.max(GY + 4, Math.min(GY + GH - 4, yAtX(x) + 17 * side));
  const tb = timeAtX(x);
  bugs += `<g transform="translate(${f(x)} ${f(y)})"><g>
    <animateTransform attributeName="transform" type="translate" values="0 0;0 0;0 ${6 * side};0 ${6 * side};0 0" keyTimes="0;${f(tb)};${f(tb + 0.01)};${f(tReset)};1" dur="${T}s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values="1;1;0.35;0.35;1" keyTimes="0;${f(tb)};${f(tb + 0.01)};${f(tReset)};1" dur="${T}s" repeatCount="indefinite"/>
    <circle r="11" fill="#ff4d6d" fill-opacity="0.12"/>
    <path d="M-3 -5 L-5.5 -9 M3 -5 L5.5 -9" stroke="#ff8fa3" stroke-width="1.3" stroke-linecap="round"/>
    <ellipse rx="5.6" ry="6.4" fill="#ff4d6d" stroke="#ffd1da" stroke-opacity="0.6" stroke-width="0.8"/>
    <line x1="0" y1="-6" x2="0" y2="6" stroke="#7a1030" stroke-width="0.9"/>
  </g></g>`;
});

/* goalkeeper: bobs on the line, dives the wrong way at the shot */
const keeper = `<g transform="translate(${PX1 - 9} ${CY})"><g>
    <animateTransform attributeName="transform" type="translate" values="0 0;0 0;-4 -30;-4 -30;0 0" keyTimes="0;${f(tDrib)};${f(tShot)};${f(tReset)};1" dur="${T}s" repeatCount="indefinite"/>
    <g><animateTransform attributeName="transform" type="translate" values="0 -12;0 12;0 -12" dur="3.2s" repeatCount="indefinite"/>
      <circle r="12" fill="#fbbf24" fill-opacity="0.12"/><rect x="-5" y="-8" width="10" height="16" rx="5" fill="#fbbf24" stroke="#fff7d6" stroke-opacity="0.7" stroke-width="0.8"/>
    </g></g></g>`;

/* confetti burst from the net */
let confetti = '';
const colors = ['#00f5d4', '#4facfe', '#ffd23f', '#f472b6', '#fbbf24', '#ffffff'];
for (let i = 0; i < 22; i++) {
  const a = Math.PI * (0.55 + (i / 21) * 0.9) + (((i * 37) % 7) - 3) * 0.04;
  const r = 50 + ((i * 53) % 60);
  const dx = Math.cos(a) * r, dy = Math.sin(a) * r - 10;
  confetti += `<rect x="-2.5" y="-1.2" width="5" height="2.4" rx="1" fill="${colors[i % colors.length]}" opacity="0" transform="translate(${GOAL.x} ${GOAL.y})">
    <animateTransform attributeName="transform" type="translate" values="${GOAL.x} ${GOAL.y};${GOAL.x} ${GOAL.y};${f(GOAL.x + dx)} ${f(GOAL.y + dy)};${f(GOAL.x + dx)} ${f(GOAL.y + dy + 20)}" keyTimes="0;${f(tShot)};${f(tShot + 0.06)};1" dur="${T}s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values="0;0;1;0;0" keyTimes="0;${f(tShot)};${f(tShot + 0.005)};${f(tShot + 0.14)};1" dur="${T}s" repeatCount="indefinite"/>
  </rect>`;
}

const anim = (attr, values, times, extra = '') => `<animate attributeName="${attr}" values="${values}" keyTimes="${times}" dur="${T}s" repeatCount="indefinite"${extra}/>`;
const showGoal = `0;0;1;1;0;0`, showGoalT = `0;${f(tShot)};${f(tShot + 0.012)};${f(tReset - 0.03)};${f(tReset)};1`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b1122"/><stop offset="1" stop-color="#050810"/></linearGradient>
    <linearGradient id="bd" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#00f5d4" stop-opacity="0.8"/><stop offset="0.5" stop-color="#34d399" stop-opacity="0.1"/><stop offset="1" stop-color="#ffd23f" stop-opacity="0.55"/></linearGradient>
    <linearGradient id="grass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#06291f"/><stop offset="1" stop-color="#03150f"/></linearGradient>
    <linearGradient id="goalTxt" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffffff"/><stop offset="0.5" stop-color="#7fe9da"/><stop offset="1" stop-color="#00f5d4"/></linearGradient>
    <radialGradient id="spot" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#b8fff2" stop-opacity="0.22"/><stop offset="1" stop-color="#00f5d4" stop-opacity="0"/></radialGradient>
    <radialGradient id="flood" cx="0.5" cy="0" r="0.8"><stop offset="0" stop-color="#e0fffa" stop-opacity="0.10"/><stop offset="1" stop-color="#e0fffa" stop-opacity="0"/></radialGradient>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="bigGlow" x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur stdDeviation="7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <clipPath id="card"><rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="22"/></clipPath>
    <clipPath id="pitch"><rect x="${PX0 - 40}" y="${PY0}" width="${PX1 - PX0 + 80}" height="${PY1 - PY0}"/></clipPath>
  </defs>

  <rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="22" fill="url(#bg)"/>
  <g clip-path="url(#card)">
    <ellipse cx="160" cy="0" rx="260" ry="90" fill="url(#flood)"/>
    <ellipse cx="${W - 160}" cy="0" rx="260" ry="90" fill="url(#flood)"/>
  </g>
  <rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="22" fill="none" stroke="url(#bd)" stroke-width="1.3"/>

  <!-- header -->
  <text x="32" y="38" ${SANS} font-size="15" font-weight="800" fill="#f8fafc">⚽ Matchday</text>
  <text x="140" y="38" ${MONO} font-size="11" fill="#475569">/ season ${season}</text>
  <g transform="translate(${W / 2 - 160} 16)">
    <rect width="320" height="38" rx="12" fill="#050a14" stroke="#ffffff" stroke-opacity="0.1"/>
    <text x="72" y="24" text-anchor="middle" ${MONO} font-size="11.5" font-weight="700" letter-spacing="1.2" fill="#00f5d4">KURU DEVWORKS</text>
    <rect x="130" y="7" width="60" height="24" rx="6" fill="#0f172a"/>
    <text x="160" y="25" text-anchor="middle" ${SANS} font-size="17" font-weight="800" fill="#ffffff">0 – 0${anim('opacity', '1;0;1', `0;${f(tShot)};${f(tReset + 0.015)}`, ' calcMode="discrete"')}</text>
    <text x="160" y="25" text-anchor="middle" ${SANS} font-size="17" font-weight="800" fill="#00f5d4" opacity="0">1 – 0${anim('opacity', '0;1;0', `0;${f(tShot)};${f(tReset + 0.015)}`, ' calcMode="discrete"')}</text>
    <text x="248" y="24" text-anchor="middle" ${MONO} font-size="11.5" font-weight="700" letter-spacing="1.2" fill="#ff6b86">BUGS</text>
  </g>
  <circle cx="${W - 78}" cy="34" r="4" fill="#ff4d6d">${anim('opacity', '1;0.25;1', '0;0.5;1', '')}</circle>
  <text x="${W - 32}" y="38" text-anchor="end" ${MONO} font-size="11" font-weight="700" letter-spacing="1.5" fill="#ff8fa3">LIVE</text>

  <!-- pitch -->
  <rect x="${PX0 - 40}" y="${PY0 - 12}" width="${PX1 - PX0 + 80}" height="${PY1 - PY0 + 24}" rx="14" fill="url(#grass)"/>
  <g clip-path="url(#pitch)">${stripes}</g>
  ${lines}
  ${goal(PX0, -1, false)}
  ${goal(PX1, 1, true)}
  <g>${cells}</g>

  <!-- spotlight following the ball -->
  <circle r="70" fill="url(#spot)"><animateTransform attributeName="transform" type="translate" ${track(ballPts, ballT)} dur="${T}s" repeatCount="indefinite"/></circle>

  ${bugs}
  ${keeper}

  <!-- #10 -->
  <g transform="translate(${way[0].x} ${way[0].y})">
    <animateTransform attributeName="transform" type="translate" ${track(playerPts, playerT)} dur="${T}s" repeatCount="indefinite"/>
    <g><animateTransform attributeName="transform" type="translate" values="0 0;0 0;0 -9;0 0;0 -9;0 0;0 0" keyTimes="0;${f(tShot + 0.01)};${f(tShot + 0.03)};${f(tShot + 0.05)};${f(tShot + 0.07)};${f(tShot + 0.09)};1" dur="${T}s" repeatCount="indefinite"/>
      <circle r="11" fill="#00f5d4" fill-opacity="0.15"/>
      <circle r="6.5" fill="#00f5d4" stroke="#ecfffb" stroke-width="1.2" filter="url(#glow)"/>
      <text y="2.6" text-anchor="middle" ${SANS} font-size="7" font-weight="900" fill="#03201a">10</text>
    </g>
  </g>

  <!-- ball -->
  <g transform="translate(${way[0].x} ${way[0].y})">
    <animateTransform attributeName="transform" type="translate" ${track(ballPts, ballT)} dur="${T}s" repeatCount="indefinite"/>
    ${anim('opacity', '1;1;0;0;1', `0;${f(tReset)};${f(tReset + 0.01)};${f(tReset + 0.02)};1`)}
    <circle r="4.8" fill="#ffffff" filter="url(#glow)"/>
    <g><animateTransform attributeName="transform" type="rotate" values="0;360" dur="0.7s" repeatCount="indefinite"/>
      <path d="M0 -1.8 L1.7 -0.6 L1.05 1.45 L-1.05 1.45 L-1.7 -0.6 Z" fill="#0b1122"/>
      <path d="M0 -4.8 L0 -1.8 M4.5 -1.5 L1.7 -0.6 M2.8 3.9 L1.05 1.45 M-2.8 3.9 L-1.05 1.45 M-4.5 -1.5 L-1.7 -0.6" stroke="#0b1122" stroke-width="0.7"/>
    </g>
  </g>

  ${confetti}

  <!-- GOAL! -->
  <rect x="${PX0 - 40}" y="${PY0 - 12}" width="${PX1 - PX0 + 80}" height="${PY1 - PY0 + 24}" rx="14" fill="#00f5d4" opacity="0">${anim('opacity', '0;0;0.16;0;0', `0;${f(tShot)};${f(tShot + 0.006)};${f(tShot + 0.05)};1`)}</rect>
  <g transform="translate(${W / 2} ${CY})" opacity="0">
    ${anim('opacity', showGoal, showGoalT)}
    <g><animateTransform attributeName="transform" type="scale" values="0.4;0.4;1.15;1;1;1" keyTimes="0;${f(tShot)};${f(tShot + 0.02)};${f(tShot + 0.035)};${f(tReset)};1" dur="${T}s" repeatCount="indefinite"/>
      <rect x="-150" y="-44" width="300" height="80" rx="18" fill="#050a14" fill-opacity="0.72" stroke="#00f5d4" stroke-opacity="0.35"/>
      <text y="12" text-anchor="middle" ${SANS} font-size="54" font-weight="900" font-style="italic" letter-spacing="2" fill="url(#goalTxt)" filter="url(#bigGlow)">GOAL!</text>
      <text y="29" text-anchor="middle" ${MONO} font-size="9.5" font-weight="700" letter-spacing="2.5" fill="#7fe9da">#10 KURU · SHIPPED TO PROD</text>
    </g>
  </g>

  <!-- footer stats -->
  <text x="${W / 2}" y="${H - 20}" text-anchor="middle" ${MONO} font-size="11" fill="#64748b" letter-spacing="0.4"><tspan fill="#00f5d4" font-weight="700">${cal.totalContributions.toLocaleString('en-US')}</tspan> contributions   ·   <tspan fill="#00f5d4" font-weight="700">${active.length}</tspan> active days   ·   best streak <tspan fill="#00f5d4" font-weight="700">${streak}d</tspan>   ·   top day <tspan fill="#00f5d4" font-weight="700">${topDay}</tspan></text>
</svg>
`;

writeFileSync(OUT, svg);
console.log(`wrote ${OUT} (${(svg.length / 1024).toFixed(1)} KB) — ${cal.totalContributions} contributions, ${active.length} active days`);
