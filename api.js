// 서버(Apps Script) 호출. API_URL 이 비어 있으면 미리보기 모드로 동작합니다.
window.SurveyApi = (function () {
  const cfg = window.SURVEY_CONFIG || {};
  const preview = !cfg.API_URL;
  let previewCall = null;

  function memoryStorage() {
    const m = {};
    return { getItem: function (k) { return k in m ? m[k] : null; }, setItem: function (k, v) { m[k] = String(v); } };
  }

  async function getPreviewCall() {
    if (previewCall) return previewCall;
    const [src] = await Promise.all([
      fetch('apps-script/Code.gs').then(function (r) { return r.text(); }),
      loadScript('dev/gas-shim.js')
    ]);
    let storage;
    try { localStorage.setItem('__t', '1'); storage = localStorage; } catch (e) { storage = memoryStorage(); }
    previewCall = window.GasShim.loadGas(src, storage, { ADMIN_ID: 'preview', ADMIN_PASSWORD: 'preview' });
    return previewCall;
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      const s = document.createElement('script');
      s.src = src; s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function call(payload) {
    if (preview) {
      const fn = await getPreviewCall();
      await new Promise(function (r) { setTimeout(r, 250); });
      return fn(payload);
    }
    // text/plain 으로 보내야 Apps Script 가 CORS 사전요청 없이 받을 수 있음
    const res = await fetch(cfg.API_URL, { method: 'POST', body: JSON.stringify(payload) });
    if (!res.ok) throw new Error('network');
    return res.json();
  }

  return { call: call, preview: preview };
})();
