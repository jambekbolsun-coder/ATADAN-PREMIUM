/* Android присылает предложение установки очень рано: ловим его до запуска страницы. */
window.addEventListener("beforeinstallprompt", function (event) {
  event.preventDefault();
  window.__axInstall = event;
});
