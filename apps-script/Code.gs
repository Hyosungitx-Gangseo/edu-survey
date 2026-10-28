//
// 교육 만족도 설문 - 서버 코드 (Google Apps Script)
// 설치 방법은 README.md를 참고하세요.
// 이 코드는 응답을 저장하는 구글 시트에 연결(확장 프로그램 > Apps Script)해서 사용합니다.
// [익명성 원칙]
// - 이름, 사번, 이메일, IP 등 개인 식별 정보는 받지도 저장하지도 않습니다.
// - 제출 시각은 날짜(yyyy-MM-dd)까지만 저장합니다.
// - 관리자 화면에는 응답 순서를 섞어서 보여줍니다.
//

// ▼▼▼ 관리자 아이디 / 비밀번호 - 반드시 바꾼 뒤 배포하세요 ▼▼▼
const ADMIN_ID = 'CHANGE_ME';
const ADMIN_PASSWORD = 'CHANGE_ME';
// ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

const TZ = 'Asia/Seoul';
const TOKEN_TTL_SEC = 6 * 60 * 60;   // 로그인 유지 6시간
const MAX_LOGIN_FAILS = 5;           // 연속 실패 허용 횟수
const LOGIN_LOCK_SEC = 10 * 60;      // 초과 시 10분간 로그인 차단
const MAX_TEXT = 2000;

// 문항 정의 - 웹페이지(questions.js)와 동일하게 유지하세요.
const AREAS = ['업무 연관성', '강사 전달력', '교육 방식', '교육 시간·일정', '교육 자료'];
const ISSUES = [
  '실무와 맞지 않는 내용',
  '이미 아는 내용의 반복',
  '교육 시간이 너무 길거나 잦음',
  '일방적인 강의식 진행',
  '업무(콜) 공백에 대한 부담',
  '교육 자료가 부족하거나 이해하기 어려움',
  '기타',
  '특별히 없음'
];
const ISSUE_NONE = '특별히 없음';

const SURVEY_HEADERS = ['id', 'title', 'start', 'end', 'createdAt', 'closedAt'];   // closedAt: 조기 마감한 날짜
const RESPONSE_HEADERS = ['surveyId', 'date']
  .concat(AREAS.map(function (a, i) { return 'r' + (i + 1); }))
  .concat(['issues', 'issueDetail', 'improve', 'wish', 'useful']);

// ---------------------------------------------------------------- 진입점

function doGet() {
  return json_({ ok: true, message: 'survey api' });
}

function doPost(e) {
  let req;
  try {
    req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return json_({ ok: false, error: '잘못된 요청입니다.' });
  }
  try {
    return json_(handle_(req));
  } catch (err) {
    return json_({ ok: false, error: err && err.userMessage ? err.userMessage : '서버 오류가 발생했습니다.' });
  }
}

function handle_(req) {
  switch (req.action) {
    case 'active': return getActive_(req);
    case 'submit': return submit_(req);
    case 'login': return login_(req);
  }
  requireAdmin_(req.token);
  switch (req.action) {
    case 'listSurveys': return listSurveys_();
    case 'saveSurvey': return saveSurvey_(req);
    case 'deleteSurvey': return deleteSurvey_(req);
    case 'closeSurvey': return closeSurvey_(req);
    case 'results': return results_(req);
  }
  throw userError_('알 수 없는 요청입니다.');
}

// ---------------------------------------------------------------- 공개: 설문 응답

// 진행 중인 설문 목록. req.id 가 있으면(설문별 전용 링크) 그 설문의 상태도 함께 돌려준다.
function getActive_(req) {
  const today = today_();
  const surveys = readSurveys_().sort(function (a, b) { return a.start < b.start ? -1 : 1; });
  const active = surveys.filter(function (s) { return stateOf_(s, today) === 'active'; });
  const upcoming = surveys.filter(function (s) { return stateOf_(s, today) === 'upcoming'; })[0] || null;
  const out = {
    ok: true,
    today: today,
    surveys: active.map(publicSurvey_),
    survey: active.length ? publicSurvey_(active[0]) : null,   // 예전 화면 호환용
    upcoming: upcoming && publicSurvey_(upcoming)
  };
  if (req && req.id) {
    const t = surveys.filter(function (s) { return s.id === String(req.id); })[0];
    out.target = t ? Object.assign(publicSurvey_(t), { state: stateOf_(t, today), closedEarly: !!t.closedAt }) : null;
  }
  return out;
}

function submit_(req) {
  const a = req.answers || {};
  const ratings = a.ratings;
  if (!Array.isArray(ratings) || ratings.length !== AREAS.length) throw userError_('만족도 문항에 모두 응답해 주세요.');
  ratings.forEach(function (r) {
    if ([1, 2, 3, 4, 5].indexOf(r) < 0) throw userError_('만족도 응답 값이 올바르지 않습니다.');
  });
  const issues = Array.isArray(a.issues) ? a.issues.filter(function (v, i, arr) { return arr.indexOf(v) === i; }) : [];
  if (!issues.length) throw userError_('3번 문항에서 하나 이상 선택해 주세요.');
  issues.forEach(function (v) {
    if (ISSUES.indexOf(v) < 0) throw userError_('3번 문항 응답 값이 올바르지 않습니다.');
  });
  if (issues.indexOf(ISSUE_NONE) >= 0 && issues.length > 1) throw userError_('"특별히 없음"은 다른 항목과 함께 선택할 수 없습니다.');

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const today = today_();
    const survey = readSurveys_().filter(function (s) { return s.id === req.surveyId; })[0];
    if (!survey) throw userError_('설문을 찾을 수 없습니다.');
    if (today < survey.start) throw userError_('아직 시작되지 않은 설문입니다.');
    if (today > survey.end || survey.closedAt) throw userError_('마감된 설문입니다.');

    const row = [survey.id, today]
      .concat(ratings)
      .concat([
        issues.join(' | '),
        cleanText_(a.issueDetail),
        cleanText_(a.improve),
        cleanText_(a.wish),
        cleanText_(a.useful)
      ]);
    appendRow_(sheet_('Responses', RESPONSE_HEADERS), row);
  } finally {
    lock.releaseLock();
  }
  return { ok: true };
}

// ---------------------------------------------------------------- 관리자 인증

function login_(req) {
  if (ADMIN_ID === 'CHANGE_ME' || ADMIN_PASSWORD === 'CHANGE_ME') {
    throw userError_('관리자 아이디/비밀번호가 아직 설정되지 않았습니다. Code.gs 상단을 수정해 주세요.');
  }
  const cache = CacheService.getScriptCache();
  if (cache.get('login_locked')) throw userError_('로그인 시도가 너무 많습니다. 10분 후 다시 시도해 주세요.');

  const okId = safeEqual_(String(req.id || ''), ADMIN_ID);
  const okPw = safeEqual_(String(req.pw || ''), ADMIN_PASSWORD);
  if (!(okId && okPw)) {
    const fails = Number(cache.get('login_fails') || 0) + 1;
    if (fails >= MAX_LOGIN_FAILS) {
      cache.put('login_locked', '1', LOGIN_LOCK_SEC);
      cache.remove('login_fails');
    } else {
      cache.put('login_fails', String(fails), LOGIN_LOCK_SEC);
    }
    throw userError_('아이디 또는 비밀번호가 올바르지 않습니다.');
  }
  cache.remove('login_fails');
  const token = Utilities.getUuid() + Utilities.getUuid();
  cache.put('tok_' + token, '1', TOKEN_TTL_SEC);
  return { ok: true, token: token };
}

function requireAdmin_(token) {
  if (!token || !CacheService.getScriptCache().get('tok_' + token)) {
    const err = userError_('로그인이 필요합니다.');
    throw err;
  }
}

function safeEqual_(a, b) {
  const ha = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, a, Utilities.Charset.UTF_8);
  const hb = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, b, Utilities.Charset.UTF_8);
  let diff = 0;
  for (let i = 0; i < ha.length; i++) diff |= ha[i] ^ hb[i];
  return diff === 0;
}

// ---------------------------------------------------------------- 관리자: 설문 관리

function listSurveys_() {
  const today = today_();
  const responses = readResponses_();
  const surveys = readSurveys_().sort(function (a, b) { return a.start < b.start ? -1 : 1; });
  return {
    ok: true,
    today: today,
    surveys: surveys.map(function (s) {
      const rows = responses.filter(function (r) { return r.surveyId === s.id; });
      return {
        id: s.id, title: s.title, start: s.start, end: s.end, closedAt: s.closedAt,
        count: rows.length,
        averages: AREAS.map(function (_, i) { return average_(rows.map(function (r) { return r.ratings[i]; })); })
      };
    })
  };
}

function saveSurvey_(req) {
  const title = cleanText_(req.title).slice(0, 100);
  const start = String(req.start || ''), end = String(req.end || '');
  if (!title) throw userError_('설문 제목을 입력해 주세요.');
  if (!isDate_(start) || !isDate_(end)) throw userError_('시작일과 마감일을 입력해 주세요.');
  if (end < start) throw userError_('마감일은 시작일보다 빠를 수 없습니다.');

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = sheet_('Surveys', SURVEY_HEADERS);
    const surveys = readSurveys_();
    if (req.id) {
      const target = surveys.filter(function (s) { return s.id === req.id; })[0];
      if (!target) throw userError_('설문을 찾을 수 없습니다.');
      sh.getRange(target.row, 2, 1, 3).setValues([[title, start, end]]);
      return { ok: true, id: req.id };
    }
    const id = Utilities.getUuid().replace(/-/g, '').slice(0, 10);
    appendRow_(sh, [id, title, start, end, today_(), '']);
    return { ok: true, id: id };
  } finally {
    lock.releaseLock();
  }
}

// 마감일 전에 설문을 닫거나(reopen 없음) 다시 연다(reopen: true).
function closeSurvey_(req) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const target = readSurveys_().filter(function (s) { return s.id === req.id; })[0];
    if (!target) throw userError_('설문을 찾을 수 없습니다.');
    if (req.reopen && today_() > target.end) throw userError_('마감일이 지난 설문은 다시 열 수 없습니다. 마감일을 수정해 주세요.');
    const sh = sheet_('Surveys', SURVEY_HEADERS);
    sh.getRange(1, 6, 1, 1).setValues([['closedAt']]);   // 예전에 만든 시트에는 이 열 제목이 없음
    const cell = sh.getRange(target.row, 6, 1, 1);
    cell.setNumberFormat('@');
    cell.setValues([[req.reopen ? '' : today_()]]);
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

function deleteSurvey_(req) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const target = readSurveys_().filter(function (s) { return s.id === req.id; })[0];
    if (!target) throw userError_('설문을 찾을 수 없습니다.');
    // 응답도 함께 삭제 (아래 행부터 지워야 행 번호가 밀리지 않음)
    const rsh = sheet_('Responses', RESPONSE_HEADERS);
    readResponses_()
      .filter(function (r) { return r.surveyId === req.id; })
      .map(function (r) { return r.row; })
      .sort(function (a, b) { return b - a; })
      .forEach(function (row) { rsh.deleteRow(row); });
    sheet_('Surveys', SURVEY_HEADERS).deleteRow(target.row);
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

// ---------------------------------------------------------------- 관리자: 결과

function results_(req) {
  const survey = readSurveys_().filter(function (s) { return s.id === req.id; })[0];
  if (!survey) throw userError_('설문을 찾을 수 없습니다.');
  const rows = shuffle_(readResponses_().filter(function (r) { return r.surveyId === survey.id; }));

  const areas = AREAS.map(function (name, i) {
    const vals = rows.map(function (r) { return r.ratings[i]; });
    const dist = [5, 4, 3, 2, 1].map(function (score) {
      return vals.filter(function (v) { return v === score; }).length;
    });
    return { name: name, average: average_(vals), dist: dist };
  });

  const issueCounts = ISSUES.map(function (name) {
    return { name: name, count: rows.filter(function (r) { return r.issues.indexOf(name) >= 0; }).length };
  });

  function texts(key) {
    return shuffle_(rows.map(function (r) { return r[key]; }).filter(function (t) { return t; }));
  }

  return {
    ok: true,
    survey: publicSurvey_(survey),
    count: rows.length,
    areas: areas,
    issues: issueCounts,
    texts: { useful: texts('useful'), issueDetail: texts('issueDetail'), improve: texts('improve'), wish: texts('wish') },
    // CSV 다운로드용 - 순서를 섞어서 제공
    rows: rows.map(function (r) {
      return { ratings: r.ratings, useful: r.useful, issues: r.issues, issueDetail: r.issueDetail, improve: r.improve, wish: r.wish };
    })
  };
}

// ---------------------------------------------------------------- 시트 읽기/쓰기

function sheet_(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    // 날짜·텍스트가 자동 변환되지 않도록 전체를 텍스트 서식으로
    sh.getRange(1, 1, sh.getMaxRows(), headers.length).setNumberFormat('@');
    sh.setFrozenRows(1);
  }
  return sh;
}

function appendRow_(sh, row) {
  const r = sh.getLastRow() + 1;
  const range = sh.getRange(r, 1, 1, row.length);
  range.setNumberFormat('@');
  range.setValues([row.map(function (v) { return typeof v === 'number' ? String(v) : v; })]);
}

function readRows_(name, headers) {
  const sh = sheet_(name, headers);
  const last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, headers.length).getValues().map(function (v, i) {
    v.row = i + 2;
    return v;
  });
}

function readSurveys_() {
  return readRows_('Surveys', SURVEY_HEADERS)
    .filter(function (v) { return v[0]; })
    .map(function (v) {
      return { row: v.row, id: String(v[0]), title: String(v[1]), start: dateStr_(v[2]), end: dateStr_(v[3]), closedAt: v[5] ? dateStr_(v[5]) : '' };
    });
}

function readResponses_() {
  const n = AREAS.length;
  return readRows_('Responses', RESPONSE_HEADERS)
    .filter(function (v) { return v[0]; })
    .map(function (v) {
      return {
        row: v.row,
        surveyId: String(v[0]),
        ratings: v.slice(2, 2 + n).map(Number),
        issues: String(v[2 + n] || '').split(' | ').filter(String),
        issueDetail: readText_(v[3 + n]),
        improve: readText_(v[4 + n]),
        wish: readText_(v[5 + n]),
        useful: readText_(v[6 + n])
      };
    });
}

// ---------------------------------------------------------------- 유틸

function stateOf_(s, today) {
  if (s.closedAt || today > s.end) return 'closed';
  return today < s.start ? 'upcoming' : 'active';
}

function publicSurvey_(s) {
  return { id: s.id, title: s.title, start: s.start, end: s.end };
}

function today_() {
  return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
}

function dateStr_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, TZ, 'yyyy-MM-dd');
  return String(v);
}

function isDate_(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function cleanText_(v) {
  let t = String(v == null ? '' : v).replace(/\r\n?/g, '\n').trim().slice(0, MAX_TEXT);
  // 시트에서 수식으로 해석되지 않도록
  if (/^[=+\-@]/.test(t)) t = "'" + t;
  return t;
}

function readText_(v) {
  return String(v || '').replace(/^'(?=[=+\-@])/, '');
}

function average_(vals) {
  const v = vals.filter(function (x) { return x >= 1 && x <= 5; });
  if (!v.length) return null;
  return Math.round(v.reduce(function (a, b) { return a + b; }, 0) / v.length * 100) / 100;
}

function shuffle_(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

function userError_(msg) {
  const e = new Error(msg);
  e.userMessage = msg;
  return e;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
