/*
  Mit Menschen reden — Consent-Management (Cookie-Banner)
  ------------------------------------------------------------------
  - Kategorie "Notwendig": immer aktiv (speichert nur die Consent-Wahl).
  - Kategorie "Statistik": Google Analytics 4, ausschließlich nach Einwilligung.
  - Google Consent Mode v2: Standard = alles verweigert, Update erst bei Zustimmung.

  ANALYTICS AKTIVIEREN: unten GA_ID auf die eigene Mess-ID setzen
  (z. B. 'G-XXXXXXXXXX'). Solange GA_ID leer ist, wird NICHTS geladen,
  auch nicht bei erteilter Zustimmung. Der Banner funktioniert trotzdem
  vollständig und merkt sich die Wahl.
*/
(function () {
  'use strict';

  var GA_ID = ''; // <-- hier Google-Analytics-Mess-ID eintragen
  var STORAGE_KEY = 'mmr_consent';
  var VERSION = 1;

  // ---------- Google Consent Mode v2: Grundzustand ----------
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;
  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    functionality_storage: 'granted',
    security_storage: 'granted',
    wait_for_update: 500
  });

  // ---------- Speicher ----------
  function readConsent() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); }
    catch (e) { return null; }
  }
  function saveConsent(statistics) {
    var data = { v: VERSION, necessary: true, statistics: !!statistics, ts: new Date().toISOString() };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) {}
    return data;
  }

  // ---------- Analytics laden (nur mit Consent + gesetzter ID) ----------
  var gaLoaded = false;
  function applyConsent(statistics) {
    if (!statistics) return;
    gtag('consent', 'update', { analytics_storage: 'granted' });
    if (gaLoaded || !GA_ID) return;
    gaLoaded = true;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_ID);
    document.head.appendChild(s);
    gtag('js', new Date());
    gtag('config', GA_ID, { anonymize_ip: true });
  }

  // ---------- Pfad zur Datenschutzseite (tiefenunabhängig) ----------
  function siteRoot() {
    var s = document.querySelector('script[src$="consent.js"]');
    if (s && s.src) return s.src.replace(/js\/consent\.js(\?.*)?$/, '');
    return '';
  }

  // ---------- Banner-UI ----------
  var root = null;

  function render(showSettings) {
    var dsHref = siteRoot() + 'datenschutz.html';
    var stored = readConsent();
    var statsOn = stored ? !!stored.statistics : false;

    root = document.createElement('div');
    root.className = 'consent';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'false');
    root.setAttribute('aria-label', 'Datenschutz-Einstellungen');
    root.innerHTML = [
      '<div class="consent__card">',
      '  <div class="consent__head">',
      '    <h2 class="consent__title">Datenschutz und Reichweitenmessung</h2>',
      '    <p class="consent__text">Diese Seite braucht nur wenige notwendige Daten für den reinen Betrieb. Zusätzlich würden wir gern anonymisiert messen, wie die Seite genutzt wird (Google Analytics), um sie besser zu machen. Das passiert ausschließlich mit deiner Einwilligung, und du kannst deine Wahl jederzeit ändern. Mehr dazu in der <a href="' + dsHref + '">Datenschutzerklärung</a>.</p>',
      '  </div>',
      '  <div class="consent__options" ' + (showSettings ? '' : 'hidden') + '>',
      '    <div class="consent__opt">',
      '      <div class="consent__opt-main"><span class="consent__opt-name">Notwendig</span><span class="consent__opt-desc">Für den sicheren Betrieb der Seite. Speichert nur deine Cookie-Entscheidung.</span></div>',
      '      <label class="consent__switch consent__switch--locked"><input type="checkbox" checked disabled aria-label="Notwendig, immer aktiv"><span class="consent__slider"></span></label>',
      '    </div>',
      '    <div class="consent__opt">',
      '      <div class="consent__opt-main"><span class="consent__opt-name">Statistik</span><span class="consent__opt-desc">Anonyme Reichweitenmessung mit Google Analytics. Zeigt uns, welche Gespräche gelesen werden.</span></div>',
      '      <label class="consent__switch"><input type="checkbox" id="consent-stats" aria-label="Statistik, anonyme Reichweitenmessung mit Google Analytics"' + (statsOn ? ' checked' : '') + '><span class="consent__slider"></span></label>',
      '    </div>',
      '  </div>',
      '  <div class="consent__actions">',
      '    <button type="button" class="consent__btn consent__btn--ghost" data-act="settings" ' + (showSettings ? 'hidden' : '') + '>Einstellungen</button>',
      '    <button type="button" class="consent__btn consent__btn--ghost" data-act="save" ' + (showSettings ? '' : 'hidden') + '>Auswahl speichern</button>',
      '    <button type="button" class="consent__btn consent__btn--ghost" data-act="reject">Ablehnen</button>',
      '    <button type="button" class="consent__btn consent__btn--solid" data-act="accept">Alle akzeptieren</button>',
      '  </div>',
      '</div>'
    ].join('');

    root.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-act]');
      if (!btn) return;
      var act = btn.getAttribute('data-act');
      if (act === 'settings') { close(); render(true); return; }
      if (act === 'accept') { finish(true); return; }
      if (act === 'reject') { finish(false); return; }
      if (act === 'save') {
        var cb = root.querySelector('#consent-stats');
        finish(cb ? cb.checked : false);
        return;
      }
    });

    document.body.appendChild(root);
  }

  function close() { if (root && root.parentNode) { root.parentNode.removeChild(root); } root = null; }

  function finish(statistics) {
    saveConsent(statistics);
    applyConsent(statistics);
    close();
  }

  // ---------- Init ----------
  function init() {
    var stored = readConsent();
    if (stored && stored.v === VERSION) {
      applyConsent(!!stored.statistics);
    } else {
      render(false);
    }
    // Footer-Link "Cookie-Einstellungen" öffnet den Banner erneut
    document.addEventListener('click', function (e) {
      var t = e.target.closest('.js-cookie-settings');
      if (!t) return;
      e.preventDefault();
      if (root) close();
      render(true);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
