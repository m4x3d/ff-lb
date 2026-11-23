// Simple password gate for the preview deployment. Remove this file and its <script> tag before going live.
// ponytail: client-side only, the HTML stays readable for anyone who opens the source; real protection = HTTP basic auth on the host.
// Change the password: printf %s 'NEW' | sha256sum, paste the hash below.
(function () {
  var HASH = "5816049a827dadfcfb3d1d041dba487fa7864e0aa8370752eb8c679b4b033b27";
  var KEY = "ff-gate";
  try { if (sessionStorage.getItem(KEY) === HASH) return; } catch (e) {}

  var style = document.createElement("style");
  style.textContent =
    "html{overflow:hidden}body{visibility:hidden}" +
    "#gate{visibility:visible;position:fixed;inset:0;z-index:2147483647;display:grid;place-content:center;gap:.75rem;" +
    "padding:1rem;color-scheme:light dark;background:Canvas;color:CanvasText;font:1.125rem/1.4 system-ui,sans-serif}" +
    "#gate input,#gate button{font:inherit;padding:.6rem .8rem;border-radius:4px}" +
    "#gate button{background:#c3161c;color:#fff;border:0;cursor:pointer}#gate p{margin:0;min-height:1.4em}";
  document.head.appendChild(style);

  document.addEventListener("DOMContentLoaded", function () {
    var f = document.createElement("form");
    f.id = "gate";
    f.innerHTML =
      '<label for="gate-pw">Passwort</label>' +
      '<input id="gate-pw" type="password" autocomplete="current-password" required autofocus>' +
      '<button type="submit">Anzeigen</button><p role="alert"></p>';
    document.body.prepend(f);
    var msg = f.querySelector("p");
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!window.crypto || !crypto.subtle) { msg.textContent = "Bitte die Seite über https öffnen."; return; }
      crypto.subtle.digest("SHA-256", new TextEncoder().encode(f.elements[0].value)).then(function (buf) {
        var hex = Array.from(new Uint8Array(buf), function (b) { return b.toString(16).padStart(2, "0"); }).join("");
        if (hex !== HASH) { msg.textContent = "Falsches Passwort."; return; }
        try { sessionStorage.setItem(KEY, HASH); } catch (e) {}
        style.remove();
        f.remove();
      });
    });
  });
})();
