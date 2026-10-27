// 교육 만족도 설문 보고서 PNG 양식 (센터장 보고용 / 교육 담당자 피드백용) - make-report.js 에서 사용
// 1920x1080 슬라이드를 화면 밖에 그린 뒤 html2canvas 로 이미지로 바꿉니다.
window.SurveyReport = (function () {
  const Q = window.SURVEY_QUESTIONS;
  const SCALE = ['매우만족', '만족', '보통', '불만족', '매우불만족'];
  const W = 1920, H = 1080;

  const CSS = `
.rpt, .rpt * { box-sizing: border-box; margin: 0; padding: 0; }
.rpt { position: fixed; left: -30000px; top: 0; width: ${W}px; font-family: 'Noto Sans KR', sans-serif; color: #0b0b0b; word-break: keep-all; overflow-wrap: anywhere; line-height: 1.4; }
.rpt .page { width: ${W}px; height: ${H}px; background: #fff; padding: 44px 72px 30px; display: flex; flex-direction: column; overflow: hidden; position: relative; }
.rpt .head { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #0b0b0b; padding-bottom: 18px; }
.rpt .org { font-size: 20px; font-weight: 700; color: #52514e; letter-spacing: 0; }
.rpt h1 { font-size: 44px; font-weight: 900; letter-spacing: -0.02em; margin-top: 6px; }
.rpt .meta { text-align: right; font-size: 17px; color: #52514e; line-height: 1.6; }
.rpt .meta b { color: #0b0b0b; }
.rpt .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; margin-top: 20px; }
.rpt .kpis.k3 { grid-template-columns: repeat(3, 1fr); }
.rpt .kpi { background: #f4f4f2; border-radius: 14px; padding: 14px 24px; }
.rpt .kpi .k { font-size: 17px; color: #52514e; font-weight: 500; }
.rpt .kpi .v { font-size: 42px; font-weight: 900; line-height: 1.15; margin-top: 2px; letter-spacing: -0.02em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rpt .kpi .v small { font-size: 22px; font-weight: 700; color: #52514e; margin-left: 4px; }
.rpt .kpi .v.sm { font-size: 30px; line-height: 1.5; }
.rpt .kpi .s { font-size: 15px; color: #75746f; }
.rpt .kpi.alert { background: #fdeceb; }
.rpt .kpi.alert .v { color: #c0352f; }
.rpt .up { color: #1a7f3c; } .rpt .down { color: #c0352f; }
.rpt .grid2 { display: grid; gap: 28px; margin-top: 20px; }
.rpt .panel h2 { font-size: 22px; font-weight: 800; margin-bottom: 4px; }
.rpt .panel .sub { font-size: 15px; color: #75746f; margin-bottom: 14px; }
.rpt table.areas { width: 100%; border-collapse: collapse; font-size: 18px; }
.rpt table.areas th { font-size: 14px; color: #75746f; font-weight: 500; text-align: left; padding: 0 0 6px; border-bottom: 1px solid #e2e1dc; }
.rpt table.areas td { padding: 7px 0; border-bottom: 1px solid #e2e1dc; vertical-align: middle; }
.rpt table.areas td.n { font-weight: 700; width: 170px; }
.rpt .low { color: #c0352f; }
.rpt table.areas td.num { text-align: right; font-weight: 700; width: 90px; }
.rpt table.areas td.cmp { text-align: right; color: #75746f; width: 130px; font-size: 16px; font-weight: 700; }
.rpt .bar { position: relative; height: 22px; margin-right: 16px; }
.rpt .bar .gl { position: absolute; top: -4px; bottom: -4px; width: 1px; background: #e2e1dc; }
.rpt .bar .gl.mid { background: #b9b8b1; }
.rpt .bar .f { position: absolute; left: 0; top: 2px; height: 18px; background: #2a78d6; border-radius: 0 4px 4px 0; }
.rpt .axis { display: flex; justify-content: space-between; font-size: 13px; color: #75746f; margin: 4px 16px 0 0; }
.rpt .ib { margin-bottom: 11px; }
.rpt .ib .l { display: flex; justify-content: space-between; font-size: 18px; font-weight: 700; margin-bottom: 5px; }
.rpt .ib .t { height: 18px; background: #f4f4f2; border-radius: 4px; overflow: hidden; }
.rpt .ib .t i { display: block; height: 100%; background: #2a78d6; border-radius: 0 4px 4px 0; }
.rpt .ib.zero .l { color: #75746f; font-weight: 500; }
.rpt .rank { display: inline-block; width: 26px; height: 26px; line-height: 26px; text-align: center; border-radius: 50%; background: #0b0b0b; color: #fff; font-size: 14px; margin-right: 8px; }
.rpt .box { border: 1.5px solid #e2e1dc; border-radius: 14px; padding: 16px 24px; }
.rpt .box h2 { font-size: 21px; font-weight: 800; margin-bottom: 12px; }
.rpt .box.dark { background: #16212f; border-color: #16212f; color: #fff; }
.rpt .box.dark h2 { color: #fff; }
.rpt ul.pts { list-style: none; }
.rpt ul.pts li { font-size: 17px; line-height: 1.5; padding-left: 18px; position: relative; margin-bottom: 8px; }
.rpt ul.pts li::before { content: ''; position: absolute; left: 2px; top: 11px; width: 6px; height: 6px; border-radius: 50%; background: currentColor; opacity: .55; }
.rpt ol.acts { list-style: none; }
.rpt ol.acts li { font-size: 17px; line-height: 1.5; padding-left: 34px; position: relative; margin-bottom: 7px; }
.rpt ol.acts li .no { position: absolute; left: 0; top: 2px; width: 24px; height: 24px; line-height: 24px; text-align: center; border-radius: 50%; background: #fff; color: #16212f; font-size: 14px; font-weight: 800; }
.rpt .insight { font-size: 18px; line-height: 1.55; }
.rpt .insight + ol { margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,.2); }
.rpt .foot { margin-top: auto; padding-top: 14px; font-size: 14px; color: #75746f; display: flex; justify-content: space-between; }
.rpt .dist { display: grid; grid-template-columns: 170px 1fr 70px; align-items: center; gap: 14px; margin-bottom: 12px; }
.rpt .dist .n { font-size: 18px; font-weight: 700; }
.rpt .dist .seg { display: flex; height: 34px; }
.rpt .dist .seg i { display: flex; align-items: center; justify-content: center; font-style: normal; font-size: 14px; font-weight: 700; color: #fff; border-right: 2px solid #fff; }
.rpt .dist .seg i:first-child { border-radius: 4px 0 0 4px; }
.rpt .dist .seg i:last-child { border-radius: 0 4px 4px 0; border-right: 0; }
.rpt .dist .seg i.c4, .rpt .dist .seg i.c3, .rpt .dist .seg i.c2 { color: #0b0b0b; }
.rpt .dist .a { text-align: right; font-size: 20px; font-weight: 800; }
.rpt .c5 { background: #2a78d6; } .rpt .c4 { background: #86b6ef; } .rpt .c3 { background: #dddcd6; } .rpt .c2 { background: #ef9a94; } .rpt .c1 { background: #c0352f; }
.rpt .legend { display: flex; gap: 18px; font-size: 14px; color: #52514e; margin: 2px 0 14px; align-items: center; }
.rpt .legend i { width: 14px; height: 14px; border-radius: 3px; display: inline-block; margin-right: 6px; vertical-align: -2px; }
.rpt .kct { display: grid; gap: 18px; margin-top: 16px; }
.rpt .kct h3 { font-size: 21px; font-weight: 800; margin-bottom: 10px; }
.rpt .kct h3 .lab { font-size: 14px; font-weight: 800; letter-spacing: .06em; padding: 2px 9px; border-radius: 5px; color: #fff; margin-right: 10px; vertical-align: 3px; }
.rpt .keep .lab { background: #1a7f3c; } .rpt .change .lab { background: #c0352f; } .rpt .try .lab { background: #2a78d6; }
.rpt .arrow { color: #2a78d6; font-weight: 700; }
.rpt .page.t1 .kpi { padding: 10px 24px; }
.rpt .page.t1 .grid2 { margin-top: 14px; }
.rpt .page.t1 .kct { margin-top: 12px; }
.rpt .page.t1 .dist { margin-bottom: 8px; }
.rpt .page.t1 .ib { margin-bottom: 7px; }
.rpt .page.t1 ul.pts li, .rpt .page.t1 ol.acts li { font-size: 15.5px; margin-bottom: 5px; }
.rpt .page.t1 .box { padding: 12px 20px; }
.rpt .page.t2 .ib .l { font-size: 16px; }
.rpt .page.t2 .dist .seg { height: 28px; }
.rpt .page.t2 .panel .sub { margin-bottom: 8px; }
.rpt .page.t2 ul.pts li, .rpt .page.t2 ol.acts li, .rpt .page.t2 .insight { font-size: 14.5px; line-height: 1.45; }
.rpt .rcols { display: grid; grid-template-columns: 0.62fr 1.5fr 1.35fr 0.85fr; gap: 20px; margin-top: 22px; flex: 1; min-height: 0; align-items: start; }
.rpt .rcol h2 { font-size: 19px; font-weight: 800; padding-bottom: 8px; border-bottom: 2px solid #0b0b0b; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: baseline; }
.rpt .rcol h2 small { font-size: 14px; color: #75746f; font-weight: 500; }
.rpt .rcol .rc { background: #f4f4f2; border-radius: 10px; padding: 11px 14px; line-height: 1.55; white-space: pre-wrap; margin-bottom: 9px; }
.rpt .rcol .empty { font-size: 15px; color: #75746f; }
`;

  // ---------------------------------------------------------------- 공통 유틸
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function f2(v) { return v == null ? '–' : v.toFixed(2); }
  function dot(d) { return d.replace(/-/g, '.'); }
  function md(d) { const p = d.split('-'); return +p[1] + '.' + +p[2]; }
  function dayName(d) { const p = d.split('-'); return '일월화수목금토'.charAt(new Date(+p[0], p[1] - 1, +p[2]).getDay()); }
  function delta(cur, prev) {
    if (cur == null || prev == null) return '';
    const d = Math.round((cur - prev) * 100) / 100;
    if (d === 0) return '<span>― 0.00</span>';
    return d > 0 ? '<span class="up">▲ ' + d.toFixed(2) + '</span>' : '<span class="down">▼ ' + Math.abs(d).toFixed(2) + '</span>';
  }
  // 입력 한 줄 = 항목 하나. "제목 — 내용"이면 제목을 굵게, "A → B"이면 B를 굵게, **굵게** 지원
  function lines(text) {
    return String(text || '').split('\n').map(function (l) { return l.replace(/^\s*(?:[-•·]\s*|\*\s+|\d+[.)]\s+)/, '').trim(); }).filter(Boolean);
  }
  function rich(line) {
    let h = esc(line).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    if (h.indexOf('<b>') < 0) {
      const dash = h.match(/^(.{1,30}?)\s+[—–-]\s+(.+)$/);
      if (dash) h = '<b>' + dash[1] + '</b> — ' + dash[2];
      const arrow = h.match(/^(.+?)\s*(?:→|->)\s*(.+)$/);
      if (arrow) h = arrow[1] + ' <span class="arrow">→</span> <b>' + arrow[2] + '</b>';
    }
    return h;
  }
  function bullets(text) { return '<ul class="pts">' + lines(text).map(function (l) { return '<li>' + rich(l) + '</li>'; }).join('') + '</ul>'; }

  // ---------------------------------------------------------------- 데이터 정리
  function prepare(r, surveys, today, org) {
    const N = r.count;
    const areas = r.areas.map(function (a) {
      return { name: a.name, avg: a.average, dist: a.dist, low: a.dist[3] + a.dist[4], okUp: a.dist[0] + a.dist[1] + a.dist[2] };
    });
    const avgs = areas.map(function (a) { return a.avg; });
    const overall = avgs.reduce(function (a, b) { return a + b; }, 0) / avgs.length;
    let total = 0, sat = 0;
    areas.forEach(function (a) { total += N; sat += a.dist[0] + a.dist[1]; });
    const issues = r.issues.filter(function (i) { return i.name !== Q.issueNone || i.count; })
      .slice().sort(function (a, b) { return b.count - a.count; });
    const realIssues = issues.filter(function (i) { return i.name !== Q.issueNone && i.count; });
    // 직전 회차: 이번 설문보다 먼저 시작했고 응답이 있는 마지막 회차
    const earlier = surveys.filter(function (s) { return s.start < r.survey.start && s.count > 0; });
    const prev = earlier.length ? earlier[earlier.length - 1] : null;
    const prevOverall = prev ? prev.averages.reduce(function (a, b) { return a + (b || 0); }, 0) / prev.averages.length : null;
    const closed = today > r.survey.end;
    return {
      r: r, N: N, areas: areas, overall: overall, satShare: total ? sat / total : 0, satCount: sat, total: total,
      issues: issues, realIssues: realIssues, prev: prev, prevOverall: prevOverall,
      org: org, today: today, closed: closed,
      stamp: closed ? '최종 집계' : md(today) + ' 중간 집계'
    };
  }

  function head(d, title) {
    const s = d.r.survey;
    return '<div class="head"><div><div class="org">' + esc(d.org) + '</div><h1>' + esc(title) + '</h1></div>' +
      '<div class="meta"><b>' + esc(s.title) + '</b><br>응답 기간 ' + dot(s.start) + '(' + dayName(s.start) + ') ~ ' + md(s.end) + '(' + dayName(s.end) + ') · <b>' + d.stamp + '</b><br>응답 ' + d.N + '명 · 익명 설문</div></div>';
  }
  function kpi(k, v, s, alert) {
    const long = v.sm && v.html.replace(/<[^>]+>/g, '').length > 16;
    return '<div class="kpi' + (alert ? ' alert' : '') + '"><div class="k">' + k + '</div><div class="v' + (v.sm ? ' sm' : '') + '"' +
      (long ? ' style="font-size:23px;line-height:1.3;white-space:normal;padding:4px 0"' : '') + '>' + (v.html || v) + '</div><div class="s">' + s + '</div></div>';
  }
  // "2026.10.27 저점톡 교육 만족도 설문" → "저점톡"
  function topic(title) {
    return String(title).replace(/^[\s\d.\-\/년월일]+/, '').replace(/교육\s*만족도\s*설문.*$/, '').trim();
  }
  function titled(d, rest) { const t = topic(d.r.survey.title); return (t ? t + ' ' : '') + rest; }
  function issueBars(d, items, ranked) {
    return items.map(function (it, i) {
      const pct = d.N ? Math.round(it.count / d.N * 100) : 0;
      return '<div class="ib' + (it.count ? '' : ' zero') + '"><div class="l"><span>' + (ranked ? '<span class="rank">' + (i + 1) + '</span>' : '') + esc(it.name) + '</span><span>' + it.count + '명 · ' + pct + '%</span></div><div class="t"><i style="width:' + pct + '%"></i></div></div>';
    }).join('');
  }
  function smallSampleNote(d) {
    return '응답 ' + d.N + '명' + (d.N < 10 ? '으로 소수 의견의 영향이 큽니다.' : '입니다.') +
      (d.closed ? '' : ' 설문 마감(' + md(d.r.survey.end) + ') 전 중간 집계입니다.');
  }

  // ---------------------------------------------------------------- 센터장 보고 1페이지
  function centerPage1(d, rep) {
    const under3 = d.areas.filter(function (a) { return a.avg < 3; }).length;
    const top = d.realIssues[0];
    let cmpKpi;
    if (d.prev) {
      const dd = Math.round((d.overall - d.prevOverall) * 100) / 100;
      cmpKpi = kpi('지난 회차 대비 (전체 평균)', { html: dd === 0 ? '변동 없음' : (dd > 0 ? '<span class="up">▲ ' : '<span class="down">▼ ') + Math.abs(dd).toFixed(2) + '</span>' },
        '직전 회차 ' + esc(d.prev.title) + ' ' + d.prevOverall.toFixed(2) + '점', false);
    } else {
      cmpKpi = kpi('지난 회차 대비', { html: '첫 회차 (기준점)', sm: true }, '다음 회차부터 이번 결과와 비교', false);
    }
    const kpis = '<div class="kpis">' +
      kpi('전체 만족도 (5개 영역 평균)', d.overall.toFixed(2) + '<small>/ 5</small>', (d.overall < 3 ? '보통(3점) 미만' : '보통(3점) 이상') + ' · 3점 미만 영역 ' + under3 + '개', d.overall < 3) +
      kpi("'만족' 이상 응답 비율", Math.round(d.satShare * 100) + '%', '전체 평가 ' + d.total + '건 중 ' + d.satCount + '건', d.satShare < 0.5) +
      (top
        ? kpi('가장 많이 꼽은 아쉬운 점', { html: esc(top.name), sm: true }, top.count + '명 / ' + d.N + '명 (' + Math.round(top.count / d.N * 100) + '%) 선택', top.count / d.N >= 0.5)
        : kpi('가장 많이 꼽은 아쉬운 점', { html: '없음', sm: true }, '아쉬운 점 선택 없음', false)) +
      cmpKpi + '</div>';

    const rows = d.areas.map(function (a, i) {
      const gl = [1, 2, 3, 4, 5].map(function (k) { return '<i class="gl' + (k === 3 ? ' mid' : '') + '" style="left:' + k * 20 + '%"></i>'; }).join('');
      const cmp = d.prev ? delta(a.avg, d.prev.averages[i]) || '–' : '— 첫 회차';
      return '<tr><td class="n' + (a.avg < 2 ? ' low' : '') + '">' + esc(a.name) + '</td><td><div class="bar">' + gl + '<div class="f" style="width:' + (a.avg / 5 * 100) + '%"></div></div></td>' +
        '<td class="num">' + f2(a.avg) + '</td><td class="num" style="font-weight:500">' + Math.round(a.low / d.N * 100) + '%</td><td class="cmp"' + (d.prev ? '' : ' style="font-weight:500"') + '>' + cmp + '</td></tr>';
    }).join('');
    const table = '<table class="areas"><thead><tr><th>영역</th><th>평균 점수 (5점 만점, 회색선 = 보통 3점)</th><th style="text-align:right">평균</th><th style="text-align:right">불만족 이하</th><th style="text-align:right">지난 회차 대비</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<div style="display:grid;grid-template-columns:170px 1fr 90px 90px 130px"><span></span><div class="axis"><span>0</span><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span></div></div>';

    const top3 = d.realIssues.slice(0, 3);
    const rest = d.realIssues.slice(3).map(function (i) { return esc(i.name) + ' ' + i.count + '명'; });
    const issuesPanel = '<div class="panel"><h2>교육에서 아쉬웠던 점 TOP 3</h2><div class="sub">복수 선택 · 응답자 ' + d.N + '명 중 선택 인원</div>' +
      (top3.length ? issueBars(d, top3, true) : '<p style="font-size:17px;color:#75746f">선택된 항목이 없습니다.</p>') +
      (rest.length ? '<div style="font-size:15px;color:#75746f;margin-top:4px">그 외: ' + rest.join(' · ') + '</div>' : '') + '</div>';

    const opin = lines(rep.opinions).length ? '<div class="box"><h2>상담사 주요 의견</h2>' + bullets(rep.opinions) + '</div>' : '';
    const acts = lines(rep.actions);
    const insight = (rep.insight || '').trim();
    const plan = (insight || acts.length) ? '<div class="box dark"><h2>시사점 및 향후 조치</h2>' +
      (insight ? '<div class="insight">' + esc(insight).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>') + '</div>' : '') +
      (acts.length ? '<ol class="acts">' + acts.map(function (l, i) { return '<li><span class="no">' + (i + 1) + '</span>' + rich(l) + '</li>'; }).join('') + '</ol>' : '') + '</div>' : '';
    const bottom = (opin || plan) ? '<div class="grid2" style="grid-template-columns:' + (opin && plan ? '1fr 1.15fr' : '1fr') + ';margin-top:18px">' + opin + plan + '</div>' : '';

    return '<section class="page">' + head(d, titled(d, '교육 만족도 설문 결과')) + kpis +
      '<div class="grid2" style="grid-template-columns:1.45fr 1fr"><div class="panel"><h2>영역별 만족도</h2><div class="sub">매우만족 5 · 만족 4 · 보통 3 · 불만족 2 · 매우불만족 1 &nbsp;|&nbsp; 빨간 글씨 = 2점 미만</div>' + table + '</div>' + issuesPanel + '</div>' +
      bottom + '<div class="foot"><span>※ ' + smallSampleNote(d) + '</span><span class="pg"></span></div></section>';
  }

  // ---------------------------------------------------------------- 센터장 보고 주관식 페이지 (넘치면 여러 장)
  const COLS = [
    { key: 'useful', title: '2. 유익했던 내용' },
    { key: 'issueDetail', title: '3. 아쉬웠던 점 · 구체적 상황' },
    { key: 'improve', title: '4. 개선 사항' },
    { key: 'wish', title: '5. 희망 교육' }
  ];
  function commentPageShell(d, chunks, fontSize, cont) {
    return '<section class="page">' + head(d, '상담사 주관식 응답 전문' + (cont ? ' (계속)' : '')) + '<div class="rcols">' +
      COLS.map(function (c, i) {
        const items = chunks[i];
        return '<div class="rcol"><h2>' + c.title + '<small>' + d.r.texts[c.key].length + '건</small></h2>' +
          (items.length ? items.map(function (t) { return '<div class="rc" style="font-size:' + fontSize + 'px">' + esc(t) + '</div>'; }).join('') : (cont ? '' : '<p class="empty">작성된 내용이 없습니다.</p>')) + '</div>';
      }).join('') + '</div><div class="foot"><span>※ 문항별로 순서를 따로 섞어 배열했습니다(같은 응답자의 답변을 이어 볼 수 없도록). 원문 그대로이며 맞춤법도 수정하지 않았습니다.</span><span class="pg"></span></div></section>';
  }
  function commentPages(d, host) {
    const all = COLS.map(function (c) { return d.r.texts[c.key].slice(); });
    // 1) 글자 크기를 줄여서 한 장에 들어가는지 확인
    for (let fs = 14.2; fs >= 12; fs -= 0.6) {
      host.innerHTML = commentPageShell(d, all, fs, false);
      if (!overflowing(host.firstChild)) return [host.innerHTML];
    }
    // 2) 그래도 넘치면 열마다 들어가는 만큼 채우고 나머지는 다음 장으로
    const pages = [];
    const queues = all.map(function (a) { return a.slice(); });
    let cont = false;
    while (queues.some(function (q) { return q.length; }) && pages.length < 10) {
      host.innerHTML = commentPageShell(d, queues.map(function () { return []; }), 12, cont);
      const page = host.firstChild;
      const cols = page.querySelectorAll('.rcol');
      const limit = page.querySelector('.foot').getBoundingClientRect().top - 8;
      queues.forEach(function (q, i) {
        while (q.length) {
          const el = document.createElement('div');
          el.className = 'rc'; el.style.fontSize = '12px'; el.textContent = q[0];
          cols[i].appendChild(el);
          if (el.getBoundingClientRect().bottom > limit && cols[i].querySelectorAll('.rc').length > 1) { el.remove(); break; }
          q.shift();
        }
      });
      pages.push(host.innerHTML);
      cont = true;
    }
    return pages;
  }
  function overflowing(page) {
    const foot = page.querySelector('.foot').getBoundingClientRect();
    return Array.prototype.some.call(page.querySelectorAll('.rcol'), function (c) { return c.getBoundingClientRect().bottom > foot.top - 4; });
  }

  // ---------------------------------------------------------------- 교육 담당자 피드백
  function trainerPage(d, rep) {
    const min = Math.min.apply(null, d.areas.map(function (a) { return a.avg; }));
    const max = Math.max.apply(null, d.areas.map(function (a) { return a.avg; }));
    const lowest = d.areas.filter(function (a) { return a.avg === min; });
    const highest = d.areas.filter(function (a) { return a.avg === max; });
    const lowOk = lowest.reduce(function (s, a) { return s + a.okUp; }, 0);
    const kpis = '<div class="kpis k3">' +
      kpi('전체 만족도 (5개 영역 평균)', d.overall.toFixed(2) + '<small>/ 5</small>',
        d.prev ? '직전 회차 대비 ' + delta(d.overall, d.prevOverall) : '첫 회차 기준점 · 다음 회차와 비교 예정', d.overall < 3) +
      kpi('가장 낮은 영역' + (lowest.length > 1 ? ' (공동 ' + min.toFixed(2) + '점)' : ' (' + min.toFixed(2) + '점)'), { html: lowest.map(function (a) { return esc(a.name); }).join(' · '), sm: true },
        (lowest.length > 1 ? lowest.length + '개 영역 ' : '') + '응답 ' + lowest.length * d.N + "건 중 '보통' 이상 " + lowOk + '건', min < 3) +
      kpi('가장 높은 영역', { html: highest.map(function (a) { return esc(a.name); }).join(' · ') + ' ' + max.toFixed(2), sm: true },
        "'보통' 이상 " + highest[0].okUp + '/' + d.N + '명', false) + '</div>';

    const legend = '<div class="legend">' + SCALE.map(function (s, k) { return '<span><i class="c' + (5 - k) + '"></i>' + s + '</span>'; }).join('') + '<span style="margin-left:auto">막대 안 숫자 = 응답 인원 · 오른쪽 = 평균</span></div>';
    const dist = d.areas.map(function (a) {
      const segs = a.dist.map(function (c, k) { return c ? '<i class="c' + (5 - k) + '" style="flex:' + c + '">' + c + '</i>' : ''; }).join('');
      return '<div class="dist"><div class="n' + (a.avg < 2 ? ' low' : '') + '">' + esc(a.name) + '</div><div class="seg">' + segs + '</div><div class="a">' + f2(a.avg) + '</div></div>';
    }).join('');
    const issueList = d.issues.filter(function (i) { return i.count || (i.name !== '기타' && i.name !== Q.issueNone); });

    const boxes = [
      { cls: 'keep', lab: 'KEEP', title: '유지할 점', text: rep.keep },
      { cls: 'change', lab: 'CHANGE', title: '바꿔 주세요', text: rep.change },
      { cls: 'try', lab: 'TRY', title: '시도해 주세요', text: rep['try'] }
    ].filter(function (b) { return lines(b.text).length; });
    const widths = { keep: '0.8fr', change: '1.25fr', 'try': '1fr' };
    const kct = boxes.length ? '<div class="kct" style="grid-template-columns:' + boxes.map(function (b) { return widths[b.cls]; }).join(' ') + '">' +
      boxes.map(function (b) { return '<div class="box ' + b.cls + '"><h3><span class="lab">' + b.lab + '</span>' + b.title + '</h3>' + bullets(b.text) + '</div>'; }).join('') + '</div>' : '';

    return '<section class="page">' + head(d, titled(d, '교육, 상담사들은 이렇게 느꼈습니다')) + kpis +
      '<div class="grid2" style="grid-template-columns:1.3fr 1fr"><div class="panel"><h2>영역별 응답 분포</h2><div class="sub">빨간색 = 불만족 · 파란색 = 만족 · 빨간 글씨 = 평균 2점 미만</div>' + legend + dist + '</div>' +
      '<div class="panel"><h2>교육에서 아쉬웠던 점</h2><div class="sub">복수 선택 · 응답자 ' + d.N + '명 중 선택 인원</div>' + issueBars(d, issueList, false) + '</div></div>' +
      kct + '<div class="foot"><span>※ 익명 설문입니다. 응답 내용으로 개별 상담사를 특정하거나 확인하지 말아 주세요. · ' + smallSampleNote(d) + '</span></div></section>';
  }

  // ---------------------------------------------------------------- 이미지로 변환
  let libPromise = null;
  function loadLibs() {
    if (libPromise) return libPromise;
    if (!document.getElementById('rptFont')) {
      const l = document.createElement('link');
      l.id = 'rptFont'; l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;800;900&display=swap';
      document.head.appendChild(l);
      const st = document.createElement('style');
      st.textContent = CSS;
      document.head.appendChild(st);
    }
    libPromise = new Promise(function (resolve, reject) {
      if (window.html2canvas) return resolve();
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
      s.onload = resolve;
      s.onerror = function () { libPromise = null; reject(new Error('보고서 도구를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.')); };
      document.head.appendChild(s);
    });
    return libPromise;
  }

  async function waitFonts() {
    try {
      await Promise.all(['400', '500', '700', '800', '900'].map(function (w) { return document.fonts.load(w + ' 20px "Noto Sans KR"', '가나다'); }));
      await document.fonts.ready;
    } catch (e) { /* 글꼴을 못 불러와도 기본 글꼴로 진행 */ }
  }

  async function toImages(pagesHtml, host) {
    const out = [];
    for (let i = 0; i < pagesHtml.length; i++) {
      host.innerHTML = pagesHtml[i];
      fitPage(host.firstChild);
      const pg = host.querySelector('.pg');
      if (pg && pagesHtml.length > 1) pg.textContent = (i + 1) + ' / ' + pagesHtml.length;
      const canvas = await window.html2canvas(host.firstChild, {
        scale: 1, width: W, height: H, windowWidth: W, windowHeight: H, backgroundColor: '#ffffff', logging: false, useCORS: true
      });
      out.push(canvas.toDataURL('image/png'));
    }
    return out;
  }

  // 입력 내용이 길어 아래 안내문이 밀려나면 글자·간격을 단계적으로 줄임
  function fitPage(page) {
    const over = function () { return page.querySelector('.foot').getBoundingClientRect().bottom > page.getBoundingClientRect().bottom - 20; };
    if (over()) page.classList.add('t1');
    if (over()) page.classList.add('t2');
  }

  // kind: 'center' | 'trainer'
  async function build(kind, results, surveys, today, report, org) {
    await loadLibs();
    await waitFonts();
    const d = prepare(results, surveys, today, org);
    const host = document.createElement('div');
    host.className = 'rpt';
    document.body.appendChild(host);
    try {
      let pages;
      if (kind === 'center') pages = [centerPage1(d, report)].concat(commentPages(d, host));
      else pages = [trainerPage(d, report)];
      return await toImages(pages, host);
    } finally {
      host.remove();
    }
  }

  return { build: build, lines: lines };
})();
