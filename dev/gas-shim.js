// 미리보기/테스트용: Google Apps Script 의 SpreadsheetApp 등을 흉내 내서
// apps-script/Code.gs 를 브라우저(또는 node)에서 그대로 실행합니다.
// 실제 운영(API_URL 설정 시)에는 사용되지 않습니다.
(function (root) {
  function createGasEnv(storage) {
    function load(key, fallback) {
      try { const v = storage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
    }
    function save(key, v) {
      try { storage.setItem(key, JSON.stringify(v)); } catch (e) { /* 무시 */ }
    }

    const book = load('gas_sheets', {});
    function sheetApi(name) {
      const data = book[name];
      const persist = function () { save('gas_sheets', book); };
      return {
        getLastRow: function () { return data.length; },
        getMaxRows: function () { return Math.max(1000, data.length); },
        setFrozenRows: function () {},
        deleteRow: function (r) { data.splice(r - 1, 1); persist(); },
        getRange: function (row, col, nRows, nCols) {
          return {
            setNumberFormat: function () { return this; },
            setValues: function (vals) {
              for (let i = 0; i < nRows; i++) {
                while (data.length < row + i) data.push([]);
                for (let j = 0; j < nCols; j++) {
                  let v = vals[i][j];
                  if (typeof v === 'string' && v.charAt(0) === "'") v = v.slice(1);
                  data[row + i - 1][col + j - 1] = v;
                }
              }
              persist();
              return this;
            },
            getValues: function () {
              const out = [];
              for (let i = 0; i < nRows; i++) {
                const src = data[row + i - 1] || [];
                const r = [];
                for (let j = 0; j < nCols; j++) r.push(src[col + j - 1] == null ? '' : src[col + j - 1]);
                out.push(r);
              }
              return out;
            }
          };
        }
      };
    }

    const cache = load('gas_cache', {});
    return {
      SpreadsheetApp: {
        getActiveSpreadsheet: function () {
          return {
            getSheetByName: function (n) { return book[n] ? sheetApi(n) : null; },
            insertSheet: function (n) { book[n] = []; save('gas_sheets', book); return sheetApi(n); }
          };
        }
      },
      CacheService: {
        getScriptCache: function () {
          return {
            get: function (k) {
              const e = cache[k];
              if (!e || e.exp < Date.now()) return null;
              return e.v;
            },
            put: function (k, v, sec) { cache[k] = { v: v, exp: Date.now() + sec * 1000 }; save('gas_cache', cache); },
            remove: function (k) { delete cache[k]; save('gas_cache', cache); }
          };
        }
      },
      LockService: { getScriptLock: function () { return { waitLock: function () {}, releaseLock: function () {} }; } },
      Utilities: {
        DigestAlgorithm: { SHA_256: 'sha256' },
        Charset: { UTF_8: 'utf8' },
        computeDigest: function (alg, s) {
          // 미리보기 전용 - 실제 해시 아님
          const out = [];
          for (let i = 0; i < s.length; i++) out.push(s.charCodeAt(i) & 0xff);
          out.push(s.length);
          return out;
        },
        getUuid: function () {
          return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
          });
        },
        formatDate: function (d, tz) {
          const p = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
          return p;
        }
      },
      ContentService: {
        MimeType: { JSON: 'json' },
        createTextOutput: function (t) { return { text: t, setMimeType: function () { return this; } }; }
      }
    };
  }

  // Code.gs 소스를 받아 doPost(payload) 를 호출할 수 있는 함수로 만든다.
  function loadGas(source, storage, overrides) {
    let src = source;
    Object.keys(overrides || {}).forEach(function (k) {
      src = src.replace(new RegExp('const ' + k + " = '[^']*';"), 'const ' + k + ' = ' + JSON.stringify(overrides[k]) + ';');
    });
    const env = createGasEnv(storage);
    const names = Object.keys(env);
    const factory = new Function(names.join(','), src + '\nreturn { doPost: doPost };');
    const gas = factory.apply(null, names.map(function (n) { return env[n]; }));
    return function call(payload) {
      return JSON.parse(gas.doPost({ postData: { contents: JSON.stringify(payload) } }).text);
    };
  }

  root.GasShim = { createGasEnv: createGasEnv, loadGas: loadGas };
  if (typeof module !== 'undefined') module.exports = root.GasShim;
})(typeof window !== 'undefined' ? window : globalThis);
