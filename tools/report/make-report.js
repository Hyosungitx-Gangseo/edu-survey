// 관리자 페이지에서 받은 CSV로 보고서 PNG를 만드는 도구 (관리자 페이지에는 포함되지 않음)
//
//   node tools/report/make-report.js \
//     --csv 응답.csv --title "2026.10.27 저점톡 교육 만족도 설문" --start 2026-10-27 --end 2026-10-28 \
//     --summary summary.json --out 출력폴더 \
//     [--prev 지난회차.csv --prev-title "..." --prev-start 2026-09-20] [--today 2026-10-28] \
//     [--html2canvas node_modules/html2canvas/dist/html2canvas.min.js]
//
// summary.json: { opinions, insight, actions } - 한 줄에 한 항목 (README 참고)
// 결과: 센터장보고_1p.png(+주관식 2p~), 교육담당자피드백.png
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '../..');

function args() {
  const a = {}, v = process.argv.slice(2);
  for (let i = 0; i < v.length; i += 2) a[v[i].replace(/^--/, '')] = v[i + 1];
  ['csv', 'title', 'start', 'end', 'summary', 'out'].forEach(function (k) {
    if (!a[k]) { console.error('missing --' + k); process.exit(1); }
  });
  return a;
}

function parseCsv(text) {
  text = text.replace(/^﻿/, '');
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(function (r) { return r.length > 1; });
}

function shuffle(a) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}

// 서버(Code.gs)의 results 응답과 같은 모양으로 집계
function aggregate(file, Q, survey) {
  const rows = parseCsv(fs.readFileSync(file, 'utf8')).slice(1);
  const clean = function (t) { return String(t || '').trim().replace(/^'(?=[=+\-@])/, ''); };
  const N = rows.length;
  const areas = Q.areas.map(function (a, i) {
    const v = rows.map(function (r) { return Number(r[1 + i]); });
    return {
      name: a.name,
      average: N ? Math.round(v.reduce(function (s, x) { return s + x; }, 0) / N * 100) / 100 : null,
      dist: [5, 4, 3, 2, 1].map(function (s) { return v.filter(function (x) { return x === s; }).length; })
    };
  });
  const picked = rows.map(function (r) { return r[7].split(',').map(function (s) { return s.trim(); }).filter(Boolean); });
  const issues = Q.issues.concat([Q.issueNone]).map(function (name) {
    return { name: name, count: picked.filter(function (p) { return p.indexOf(name) >= 0; }).length };
  });
  const col = function (k) { return shuffle(rows.map(function (r) { return clean(r[k]); }).filter(Boolean)); };
  return {
    survey: survey, count: N, areas: areas, issues: issues,
    texts: { useful: col(6), issueDetail: col(8), improve: col(9), wish: col(10) }
  };
}

(async function main() {
  const a = args();
  const questionsSrc = fs.readFileSync(path.join(ROOT, 'questions.js'), 'utf8');
  const Q = new Function('window', questionsSrc + '; return window.SURVEY_QUESTIONS;')({});
  const results = aggregate(a.csv, Q, { id: 'cur', title: a.title, start: a.start, end: a.end });
  const surveys = [];
  if (a.prev) {
    const p = aggregate(a.prev, Q, { id: 'prev', title: a['prev-title'] || '지난 회차', start: a['prev-start'] || '0000-00-00', end: a['prev-start'] || '0000-00-00' });
    surveys.push({ id: 'prev', title: p.survey.title, start: p.survey.start, count: p.count, averages: p.areas.map(function (x) { return x.average; }) });
  }
  surveys.push({ id: 'cur', title: a.title, start: a.start, count: results.count, averages: results.areas.map(function (x) { return x.average; }) });
  const today = a.today || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
  const summary = JSON.parse(fs.readFileSync(a.summary, 'utf8'));
  const org = (fs.readFileSync(path.join(ROOT, 'config.js'), 'utf8').match(/ORG_NAME:\s*'([^']*)'/) || [])[1] || '';

  fs.mkdirSync(a.out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  if (a.html2canvas) {
    await page.route('https://cdnjs.cloudflare.com/**', function (r) { r.fulfill({ path: a.html2canvas, contentType: 'application/javascript' }); });
  }
  await page.setContent('<!doctype html><html lang="ko"><head><meta charset="utf-8"></head><body></body></html>');
  await page.addScriptTag({ content: questionsSrc });
  await page.addScriptTag({ path: path.join(__dirname, 'report.js') });
  const base = a.title.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '_');
  for (const [kind, name] of [['center', '센터장보고'], ['trainer', '교육담당자피드백']]) {
    const imgs = await page.evaluate(function (p) {
      return window.SurveyReport.build(p.kind, p.results, p.surveys, p.today, p.summary, p.org);
    }, { kind: kind, results: results, surveys: surveys, today: today, summary: summary, org: org });
    imgs.forEach(function (d, i) {
      const file = path.join(a.out, base + '_' + name + (imgs.length > 1 ? '_' + (i + 1) + 'p' : '') + '.png');
      fs.writeFileSync(file, Buffer.from(d.split(',')[1], 'base64'));
      console.log(file);
    });
  }
  await browser.close();
})();
