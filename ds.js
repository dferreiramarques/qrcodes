/* ==========================================================================
   DM Design System — Runtime
   Zero dependencies. ~3KB. Exposes window.DS
   ==========================================================================
   DS.theme.get()      → 'light' | 'dark'
   DS.theme.set(t)     → set and persist
   DS.theme.toggle()   → flip
   DS.brand.set(name)  → 'blue' | 'green' | 'lime' | …
   DS.toast(msg, opts) → { type, duration }
   DS.modal.open(el)   → open a .f-modal-overlay
   DS.modal.close(el)
   DS.tabs(container)  → wire up [role=tab] switching
   ========================================================================== */
(function (global) {
  'use strict';

  var STORE_THEME = 'ds-theme';
  var STORE_BRAND = 'ds-brand';
  var root = document.documentElement;

  /* ── Theme ─────────────────────────────────────────────────────── */
  var theme = {
    get: function () {
      return root.getAttribute('data-theme') || 'light';
    },
    set: function (value) {
      root.setAttribute('data-theme', value);
      try { localStorage.setItem(STORE_THEME, value); } catch (e) {}
      updateMetaThemeColor();
      emit('ds:themechange', { theme: value });
      return value;
    },
    toggle: function () {
      return theme.set(theme.get() === 'dark' ? 'light' : 'dark');
    },
    /* Follow the OS unless the user has made an explicit choice */
    auto: function () {
      try { localStorage.removeItem(STORE_THEME); } catch (e) {}
      var prefersDark = matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
      updateMetaThemeColor();
    }
  };

  var brand = {
    get: function () { return root.getAttribute('data-brand') || 'blue'; },
    set: function (name) {
      root.setAttribute('data-brand', name);
      try { localStorage.setItem(STORE_BRAND, name); } catch (e) {}
      updateMetaThemeColor();
      emit('ds:brandchange', { brand: name });
      return name;
    }
  };

  function updateMetaThemeColor() {
    var meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return;
    var bg = getComputedStyle(root).getPropertyValue('--f-bg1').trim();
    if (bg) meta.setAttribute('content', bg);
  }

  function emit(name, detail) {
    document.dispatchEvent(new CustomEvent(name, { detail: detail }));
  }

  /* ── Toast ─────────────────────────────────────────────────────── */
  function toast(message, opts) {
    opts = opts || {};
    var container = document.querySelector('.f-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'f-toast-container';
      container.setAttribute('role', 'status');
      container.setAttribute('aria-live', 'polite');
      document.body.appendChild(container);
    }
    var el = document.createElement('div');
    el.className = 'f-toast' + (opts.type ? ' f-toast-' + opts.type : '');
    el.textContent = message;
    container.appendChild(el);

    var duration = opts.duration == null ? 3200 : opts.duration;
    if (duration > 0) {
      setTimeout(function () {
        el.classList.add('is-leaving');
        el.addEventListener('animationend', function () { el.remove(); });
      }, duration);
    }
    return el;
  }

  /* ── Modal ─────────────────────────────────────────────────────── */
  var lastFocused = null;
  var modal = {
    open: function (target) {
      var el = typeof target === 'string' ? document.querySelector(target) : target;
      if (!el) return;
      lastFocused = document.activeElement;
      el.hidden = false;
      var focusable = el.querySelector('input, button, textarea, select, [tabindex]');
      if (focusable) focusable.focus();
      document.body.style.overflow = 'hidden';
      emit('ds:modalopen', { modal: el });
    },
    close: function (target) {
      var el = typeof target === 'string' ? document.querySelector(target) : target;
      if (!el) return;
      el.hidden = true;
      document.body.style.overflow = '';
      if (lastFocused) lastFocused.focus();
      emit('ds:modalclose', { modal: el });
    }
  };

  /* Close on overlay click and Escape */
  document.addEventListener('click', function (e) {
    if (e.target.classList && e.target.classList.contains('f-modal-overlay')) {
      modal.close(e.target);
    }
    var opener = e.target.closest('[data-modal-open]');
    if (opener) modal.open(opener.getAttribute('data-modal-open'));
    var closer = e.target.closest('[data-modal-close]');
    if (closer) {
      var overlay = closer.closest('.f-modal-overlay');
      if (overlay) modal.close(overlay);
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var open = document.querySelector('.f-modal-overlay:not([hidden])');
    if (open) modal.close(open);
  });

  /* ── Tabs ──────────────────────────────────────────────────────── */
  function tabs(container) {
    var el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) return;
    var tabButtons = el.querySelectorAll('[role="tab"]');
    tabButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        tabButtons.forEach(function (b) {
          b.setAttribute('aria-selected', 'false');
          var panelId = b.getAttribute('aria-controls');
          var panel = panelId && document.getElementById(panelId);
          if (panel) panel.hidden = true;
        });
        btn.setAttribute('aria-selected', 'true');
        var id = btn.getAttribute('aria-controls');
        var target = id && document.getElementById(id);
        if (target) target.hidden = false;
      });
    });
  }

  /* ── Auto-wire declarative hooks ───────────────────────────────── */
  function init() {
    document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
      btn.addEventListener('click', theme.toggle);
    });
    document.querySelectorAll('[data-brand-set]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        brand.set(btn.getAttribute('data-brand-set'));
      });
    });
    document.querySelectorAll('[role="tablist"]').forEach(function (list) {
      tabs(list.parentElement || list);
    });
    updateMetaThemeColor();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  global.DS = {
    theme: theme,
    brand: brand,
    toast: toast,
    modal: modal,
    tabs: tabs,
    version: '1.0.0'
  };
})(window);
