(function(){
  const FALLBACK_LANG = "es";
  const STORAGE_KEY = "app.lang";

  function getSupportedLanguages(){
    return Object.keys(window.APP_I18N || {});
  }

  function normalizeLang(lang){
    if(!lang) return FALLBACK_LANG;
    const code = String(lang).toLowerCase().slice(0, 2);
    return getSupportedLanguages().includes(code) ? code : FALLBACK_LANG;
  }

  function fromUrl(){
    try {
      const p = new URLSearchParams(window.location.search);
      return p.get("lang");
    } catch (_err) {
      return null;
    }
  }

  function detectLang(){
    return normalizeLang(
      fromUrl() ||
      window.localStorage.getItem(STORAGE_KEY) ||
      window.navigator.language ||
      FALLBACK_LANG
    );
  }

  function resolvePath(obj, path){
    return path.split(".").reduce((acc, k) => (acc && acc[k] !== undefined ? acc[k] : undefined), obj);
  }

  function formatValue(template, params){
    if(!params) return template;
    return String(template).replace(/\{(\w+)\}/g, (_, k) => (params[k] ?? `{${k}}`));
  }

  function setLang(lang, persist){
    const value = normalizeLang(lang);
    window.__APP_LANG__ = value;
    document.documentElement.lang = value;
    if(persist !== false){
      window.localStorage.setItem(STORAGE_KEY, value);
    }
    return value;
  }

  function currentLang(){
    return window.__APP_LANG__ || setLang(detectLang(), false);
  }

  function t(key, params){
    const lang = currentLang();
    const dict = window.APP_I18N || {};
    const selected = resolvePath(dict[lang] || {}, key);
    const fallback = resolvePath(dict[FALLBACK_LANG] || {}, key);
    const value = selected ?? fallback ?? key;
    return formatValue(value, params);
  }

  function applyTranslations(root){
    const scope = root || document;
    scope.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      const attr = el.getAttribute("data-i18n-attr");
      const value = t(key);
      if(attr){
        el.setAttribute(attr, value);
      } else {
        el.textContent = value;
      }
    });
  }

  function updateQueryLang(lang){
    const next = new URL(window.location.href);
    next.searchParams.set("lang", lang);
    window.location.href = next.toString();
  }

  function bindLanguageSelector(selector){
    const el = document.querySelector(selector);
    if(!el) return;
    el.value = currentLang();
    el.addEventListener("change", () => {
      const lang = setLang(el.value, true);
      updateQueryLang(lang);
    });
  }

  function init(){
    setLang(detectLang(), true);
    applyTranslations(document);
  }

  window.I18n = {
    init,
    t,
    currentLang,
    setLang,
    applyTranslations,
    bindLanguageSelector
  };
})();
