(function(){
  function init(){
    if(window.I18n){
      window.I18n.init();
      window.I18n.bindLanguageSelector("#langSelect");
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
