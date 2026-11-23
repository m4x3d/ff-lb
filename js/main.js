/* Feuerwehr Lorsbach – Seitenlogik (ohne Abhängigkeiten).
   Inhalte kommen aus js/daten.js. */
(function () {
  "use strict";
  var FW = window.FW || { termine: [], einsaetze: [], jahresstatistik: {} };
  var MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
  var TAGE = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function parse(iso) { var p = iso.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function todayIso() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function deDate(iso) { var d = parse(iso); return String(d.getDate()).padStart(2, "0") + "." + String(d.getMonth() + 1).padStart(2, "0") + "." + d.getFullYear(); }

  /* ---------- Navigation ---------- */
  var toggle = $(".nav-toggle"), nav = $(".site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }
  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------- Termine ---------- */
  function kommendeTermine() {
    var heute = todayIso();
    return FW.termine
      .filter(function (t) { return (t.bis || t.datum) >= heute; })
      .sort(function (a, b) { return a.datum < b.datum ? -1 : 1; });
  }
  function terminHtml(t) {
    var d = parse(t.datum);
    var meta = TAGE[d.getDay()] + ", " + deDate(t.datum);
    if (t.bis) { var b = parse(t.bis); meta += " bis " + TAGE[b.getDay()] + ", " + deDate(t.bis); }
    if (t.zeit) meta += " · " + t.zeit + " Uhr";
    return '<li class="termin' + (t.oeffentlich ? " is-public" : "") + '">' +
      '<div class="termin-date" aria-hidden="true"><span class="d">' + d.getDate() + '</span><span class="m">' + MONATE[d.getMonth()].slice(0, 3) + "</span></div>" +
      '<div><div class="termin-title">' + esc(t.titel) + (t.oeffentlich ? ' <span class="tag tag-public">Öffentlich</span>' : "") + "</div>" +
      '<div class="termin-meta">' + meta + "</div></div></li>";
  }
  var homeTermine = $("#home-termine");
  if (homeTermine) {
    var k = kommendeTermine().slice(0, 4);
    homeTermine.innerHTML = k.length ? k.map(terminHtml).join("") : '<li class="empty">Zurzeit sind keine Termine eingetragen.</li>';
  }
  var alleTermine = $("#alle-termine");
  if (alleTermine) {
    var liste = kommendeTermine(), html = "", monat = "";
    liste.forEach(function (t) {
      var d = parse(t.datum), m = MONATE[d.getMonth()] + " " + d.getFullYear();
      if (m !== monat) { if (monat) html += "</ul>"; html += '<h2 class="month-head">' + m + '</h2><ul class="list">'; monat = m; }
      html += terminHtml(t);
    });
    if (monat) html += "</ul>";
    alleTermine.innerHTML = html || '<p class="empty">Zurzeit sind keine Termine eingetragen.</p>';
  }

  /* ---------- Einsätze ---------- */
  function kategorie(art) {
    var a = art.toLowerCase();
    if (/fehlalarm|keine tätigkeit|keine feststellung|kein auslösegrund/.test(a)) return ["fehl", "Fehlalarm"];
    if (/brandsicherheitsdienst|amtshilfe|bereitstellung|wachbesetzung/.test(a)) return ["th", "Sonstiges"];
    if (/brand|feuer|rauch|explosion|flamme/.test(a)) return ["brand", "Brand"];
    return ["th", "Hilfeleistung"];
  }
  function einsatzHtml(e) {
    var nr = e[0], datum = e[1], zeit = e[2], dauer = e[3], art = e[4], link = e[5], kat = kategorie(art);
    var text = link ? '<a href="' + esc(link) + '">' + esc(art) + "</a>" : esc(art);
    return '<li class="einsatz">' +
      '<span class="einsatz-nr"><span class="visually-hidden">Einsatz Nr. </span>' + nr + "</span>" +
      '<span class="einsatz-date">' + deDate(datum) + (zeit ? '<span class="t">' + zeit + " Uhr</span>" : "") + "</span>" +
      '<span class="einsatz-art"><span class="tag cat cat-' + kat[0] + '">' + kat[1] + "</span>" + text + "</span>" +
      '<span class="einsatz-dauer">' + (dauer ? dauer + " h" : "") + "</span></li>";
  }
  var homeEinsaetze = $("#home-einsaetze");
  if (homeEinsaetze) homeEinsaetze.innerHTML = FW.einsaetze.slice(0, 5).map(einsatzHtml).join("");

  var aktJahr = FW.einsaetze.length ? +FW.einsaetze[0][1].slice(0, 4) : new Date().getFullYear();
  function einsaetzeImJahr(j) { return FW.einsaetze.filter(function (e) { return +e[1].slice(0, 4) === j; }); }
  $$("[data-einsaetze-jahr]").forEach(function (el) { el.textContent = einsaetzeImJahr(aktJahr).length; });
  $$("[data-aktuelles-jahr]").forEach(function (el) { el.textContent = aktJahr; });

  var liste = $("#einsatz-liste");
  if (liste) {
    var jahre = [];
    FW.einsaetze.forEach(function (e) { var j = +e[1].slice(0, 4); if (jahre.indexOf(j) < 0) jahre.push(j); });
    var seg = $("#jahr-wahl"), suche = $("#einsatz-suche"), summary = $("#jahr-summary"), gewaehlt = jahre[0];
    var mehr = $("#einsatz-mehr"), LIMIT = 15, alle = false;
    mehr.addEventListener("click", function () { alle = true; render(); });
    seg.innerHTML = jahre.map(function (j) { return '<button type="button" data-j="' + j + '" aria-pressed="' + (j === gewaehlt) + '">' + j + "</button>"; }).join("");
    seg.addEventListener("click", function (ev) {
      var b = ev.target.closest("button"); if (!b) return;
      gewaehlt = +b.dataset.j; alle = false;
      $$("button", seg).forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      render();
    });
    suche.addEventListener("input", render);
    function render() {
      var q = suche.value.trim().toLowerCase();
      var imJahr = einsaetzeImJahr(gewaehlt);
      var treffer = imJahr.filter(function (e) { return !q || e[4].toLowerCase().indexOf(q) >= 0; });
      var z = { brand: 0, th: 0, fehl: 0 };
      imJahr.forEach(function (e) { z[kategorie(e[4])[0]]++; });
      summary.innerHTML = "<span><strong>" + imJahr.length + "</strong>Einsätze " + gewaehlt + "</span>" +
        "<span><strong>" + z.brand + "</strong>Brände</span>" +
        "<span><strong>" + z.th + "</strong>Hilfeleistungen &amp; Sonstiges</span>" +
        "<span><strong>" + z.fehl + "</strong>Fehlalarme / ohne Tätigkeit</span>";
      var zeigen = alle || q ? treffer : treffer.slice(0, LIMIT);
      liste.innerHTML = treffer.length ? zeigen.map(einsatzHtml).join("") : '<li class="empty">Keine Einsätze gefunden.</li>';
      mehr.hidden = zeigen.length >= treffer.length;
      mehr.textContent = "Alle " + treffer.length + " Einsätze " + gewaehlt + " anzeigen";
    }
    render();
  }

  /* ---------- Diagramm: Einsätze pro Jahr ---------- */
  var chart = $("#chart-jahre");
  if (chart) {
    var stat = {};
    Object.keys(FW.jahresstatistik).forEach(function (j) { stat[j] = FW.jahresstatistik[j]; });
    if (!stat[aktJahr]) stat[aktJahr] = einsaetzeImJahr(aktJahr).length;
    var ys = Object.keys(stat).map(Number).sort(function (a, b) { return a - b; });
    var max = Math.max.apply(null, ys.map(function (y) { return stat[y]; }));
    var top = Math.ceil(max / 40) * 40, W = 1000, H = 240, pb = 26, pt = 8, pl = 30;
    var bw = (W - pl) / ys.length, gap = Math.max(2, bw * 0.28);
    var svg = '<svg viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none" role="img" aria-label="Balkendiagramm: Einsätze pro Jahr von ' + ys[0] + " bis " + ys[ys.length - 1] + '">';
    for (var g = 0; g <= top; g += 40) {
      var gy = H - pb - (g / top) * (H - pb - pt);
      svg += '<line class="grid" x1="' + pl + '" x2="' + W + '" y1="' + gy + '" y2="' + gy + '" vector-effect="non-scaling-stroke"/>';
    }
    ys.forEach(function (y, i) {
      var v = stat[y], h = (v / top) * (H - pb - pt), x = pl + i * bw + gap / 2, w = bw - gap, by = H - pb - h, r = Math.min(4, w / 2);
      var d = "M" + x + "," + (H - pb) + "V" + (by + r) + "Q" + x + "," + by + " " + (x + r) + "," + by + "H" + (x + w - r) + "Q" + (x + w) + "," + by + " " + (x + w) + "," + (by + r) + "V" + (H - pb) + "Z";
      svg += '<path class="bar' + (y === aktJahr ? " is-current" : "") + '" data-i="' + i + '" d="' + d + '"/>';
      svg += '<rect class="hit" data-i="' + i + '" x="' + (pl + i * bw) + '" y="' + pt + '" width="' + bw + '" height="' + (H - pt) + '"/>';
    });
    svg += "</svg>";
    // Achsenbeschriftung als HTML, damit sie bei preserveAspectRatio="none" nicht verzerrt
    var labels = '<div class="chart-axis" aria-hidden="true" style="position:relative;height:18px;margin-top:-18px">';
    ys.forEach(function (y, i) {
      if (i % 5 === 0 || i === ys.length - 1) labels += '<span class="axis-label" style="position:absolute;left:' + ((pl + i * bw + bw / 2) / W * 100) + '%;transform:translateX(-50%);font-size:12px;color:var(--ink-2)">' + y + "</span>";
    });
    labels += "</div>";
    var yLabels = '<div aria-hidden="true">';
    for (var t = 0; t <= top; t += 40) {
      yLabels += '<span style="position:absolute;left:0;top:' + ((H - pb - (t / top) * (H - pb - pt)) / H * 240 - 9) + 'px;font-size:12px;color:var(--ink-2)">' + t + "</span>";
    }
    yLabels += "</div>";
    chart.innerHTML = svg + labels + yLabels + '<div class="chart-tip" role="status"></div>';
    var tip = $(".chart-tip", chart), bars = $$(".bar", chart);
    function show(i, evX) {
      var y = ys[i];
      bars.forEach(function (b) { b.classList.toggle("is-hover", +b.dataset.i === i); });
      tip.textContent = y + ": " + stat[y] + " Einsätze" + (y === aktJahr ? " (bisher)" : "");
      var rect = chart.getBoundingClientRect();
      var x = (pl + i * bw + bw / 2) / W * rect.width;
      var barTop = (H - pb - (stat[y] / top) * (H - pb - pt)) / H * 240;
      tip.style.left = Math.min(Math.max(x, 70), rect.width - 70) + "px";
      tip.style.top = barTop + "px";
      tip.classList.add("show");
    }
    function hide() { tip.classList.remove("show"); bars.forEach(function (b) { b.classList.remove("is-hover"); }); }
    $$(".hit", chart).forEach(function (h) {
      h.addEventListener("mouseenter", function () { show(+h.dataset.i); });
      h.addEventListener("touchstart", function () { show(+h.dataset.i); }, { passive: true });
    });
    chart.addEventListener("mouseleave", hide);

    var tbody = $("#chart-tabelle");
    if (tbody) tbody.innerHTML = ys.slice().reverse().map(function (y) { return "<tr><td>" + y + (y === aktJahr ? " (bisher)" : "") + "</td><td>" + stat[y] + "</td></tr>"; }).join("");
  }

  /* ---------- IBAN kopieren ---------- */
  $$("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var txt = btn.getAttribute("data-copy");
      if (navigator.clipboard) navigator.clipboard.writeText(txt).then(function () {
        var old = btn.textContent; btn.textContent = "Kopiert"; setTimeout(function () { btn.textContent = old; }, 1600);
      });
    });
  });
})();
