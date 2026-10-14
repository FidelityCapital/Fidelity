/*!
 * Fidelity Capital — Squarespace 7.1 site scripts
 * Deployed via: Settings > Advanced > Code Injection > FOOTER
 * (npm run build wraps this file in <script> tags: dist/footer-injection.html)
 *
 * Self-contained: no globals besides a re-entry guard, no external requests
 * except the Apply form's own submit endpoint. Each component enhances the
 * markup from /blocks/*.html and does nothing if that markup is absent.
 */
(function () {
  'use strict';

  if (window.__fcSiteScripts) return;
  window.__fcSiteScripts = true;

  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  function toArray(list) {
    return Array.prototype.slice.call(list);
  }

  function formatAmount(value) {
    var n = Number(value);
    if (!isFinite(n)) return '';
    if (n >= 1000000) return '$' + String(+(n / 1000000).toFixed(2)) + 'm';
    return '$' + Math.round(n / 1000) + 'k';
  }

  function headerOffset() {
    var header = document.getElementById('header');
    return header ? header.offsetHeight + 16 : 16;
  }

  function scrollIntoViewIfAbove(el) {
    var rect = el.getBoundingClientRect();
    if (rect.top >= headerOffset()) return;
    window.scrollTo({
      top: rect.top + window.pageYOffset - headerOffset(),
      behavior: reducedMotion ? 'auto' : 'smooth'
    });
  }

  // ---------------------------------------------------------------------------
  // Loan amount picker  (blocks/loan-picker.html)
  // ---------------------------------------------------------------------------
  function initLoanPicker(root) {
    var range = root.querySelector('[data-fc-loan-range]');
    var output = root.querySelector('[data-fc-loan-output]');
    var cta = root.querySelector('[data-fc-loan-cta]');
    var applyUrl = root.getAttribute('data-apply-url') || '/apply';
    if (!range || !output) return;

    function update() {
      var label = formatAmount(range.value);
      output.textContent = label;
      range.setAttribute('aria-valuetext', label);
      if (cta) {
        cta.href = applyUrl + (applyUrl.indexOf('?') === -1 ? '?' : '&') +
          'amount=' + encodeURIComponent(range.value);
      }
    }

    range.addEventListener('input', update);
    update();
  }

  // ---------------------------------------------------------------------------
  // Apply form  (blocks/apply-form.html)
  // ---------------------------------------------------------------------------
  function initApplyForm(root) {
    var form = root.querySelector('form');
    if (!form) return;

    var steps = toArray(root.querySelectorAll('.fc-apply__step'));
    var progress = root.querySelector('[data-fc-progress]');
    var progressItems = progress ? toArray(progress.children) : [];
    var summary = root.querySelector('[data-fc-summary]');
    var done = root.querySelector('[data-fc-done]');
    var fineprint = root.querySelector('[data-fc-fineprint]');
    var submitBtn = root.querySelector('[data-fc-submit]');
    var submitError = root.querySelector('[data-fc-submit-error]');
    var amountInput = form.elements.loan_amount;
    var amountOutput = root.querySelector('[data-fc-amount-output]');
    var submitLabel = submitBtn ? submitBtn.textContent : '';
    var current = 0;
    var sending = false;

    // Switch from "one long form" to the stepped experience.
    root.classList.add('is-enhanced');
    toArray(root.querySelectorAll('[data-fc-nav]')).forEach(function (el) { el.hidden = false; });
    if (progress) progress.hidden = false;
    if (summary) summary.hidden = false;

    // Pre-fill the amount from the homepage picker (?amount=350000).
    // Range inputs clamp and snap assigned values to min/max/step themselves.
    var param = new URLSearchParams(window.location.search).get('amount');
    if (amountInput && param && /^\d+$/.test(param)) amountInput.value = param;

    function syncAmount() {
      if (!amountInput || !amountOutput) return;
      var label = formatAmount(amountInput.value);
      amountOutput.textContent = label;
      amountInput.setAttribute('aria-valuetext', label);
    }
    if (amountInput) amountInput.addEventListener('input', syncAmount);
    syncAmount();

    function value(name) {
      var el = form.elements[name];
      if (!el) return '';
      return String(el.value || '').trim();
    }

    function show(index, moveFocus) {
      current = Math.max(0, Math.min(steps.length - 1, index));
      steps.forEach(function (step, i) { step.classList.toggle('is-active', i === current); });
      progressItems.forEach(function (li, i) {
        li.classList.toggle('is-reached', i <= current);
        if (i === current) li.setAttribute('aria-current', 'step');
        else li.removeAttribute('aria-current');
      });
      if (current === steps.length - 1) buildSummary();
      if (moveFocus) {
        scrollIntoViewIfAbove(root);
        var title = steps[current].querySelector('.fc-apply__step-title');
        if (title) title.focus({ preventScroll: true });
      }
    }

    function fieldIsValid(field) {
      if (!field.checkValidity()) return false;
      // Reject whitespace-only answers in required text fields.
      if (field.required && field.type !== 'checkbox' && field.type !== 'radio') {
        return field.value.trim() !== '';
      }
      return true;
    }

    function validate(step) {
      var firstInvalid = null;
      toArray(step.querySelectorAll('input, select, textarea')).forEach(function (field) {
        if (field.name === '_gotcha' || field.type === 'file' || field.type === 'range') return;
        var ok = fieldIsValid(field);
        if (field.required || field.type === 'email') field.setAttribute('aria-invalid', ok ? 'false' : 'true');
        if (!ok && !firstInvalid) firstInvalid = field;
      });
      var error = step.querySelector('[data-fc-error]');
      if (error) error.hidden = !firstInvalid;
      if (firstInvalid) firstInvalid.focus();
      return !firstInvalid;
    }

    // Clear an error as soon as the visitor fixes the field.
    function onFieldChange(e) {
      var field = e.target;
      if (field.getAttribute('aria-invalid') !== 'true' || !fieldIsValid(field)) return;
      field.setAttribute('aria-invalid', 'false');
      var step = field.closest('.fc-apply__step');
      if (step && !step.querySelector('[aria-invalid="true"]')) {
        var error = step.querySelector('[data-fc-error]');
        if (error) error.hidden = true;
      }
    }
    form.addEventListener('input', onFieldChange);
    form.addEventListener('change', onFieldChange);

    function buildSummary() {
      if (!summary) return;
      var money = function (v) { return v ? '$' + v : '—'; };
      var orDash = function (v) { return v || '—'; };
      var rows = [
        ['Loan amount', amountInput ? formatAmount(amountInput.value) : '—'],
        ['Loan type', orDash(value('loan_type'))],
        ['Purpose', orDash(value('purpose'))],
        ['Funds needed', orDash(value('timing'))],
        ['Security', orDash(value('security_address'))],
        ['Property type', orDash(value('property_type'))],
        ['Value / existing debt', money(value('security_value')) + ' / ' + money(value('existing_debt'))],
        ['Repayment plan', orDash(value('exit_strategy'))],
        ['Applicant', orDash(value('name')) + ' (' + value('applicant_role') + ')'],
        ['Contact', orDash(value('phone')) + ' · ' + orDash(value('email'))],
        ['Business', orDash(value('business_name')) + (value('abn') ? ' · ABN ' + value('abn') : '')]
      ];
      summary.textContent = '';
      rows.forEach(function (row) {
        var wrap = document.createElement('div');
        var dt = document.createElement('dt');
        var dd = document.createElement('dd');
        dt.textContent = row[0];
        dd.textContent = row[1];
        wrap.appendChild(dt);
        wrap.appendChild(dd);
        summary.appendChild(wrap);
      });
    }

    function showSuccess() {
      steps.forEach(function (step) { step.classList.remove('is-active'); });
      if (progress) progress.hidden = true;
      if (fineprint) fineprint.hidden = true;
      if (!done) return;
      var set = function (sel, text) {
        var el = done.querySelector(sel);
        if (el) el.textContent = text;
      };
      set('[data-fc-done-name]', value('name'));
      set('[data-fc-done-email]', value('email'));
      set('[data-fc-done-amount]', amountInput ? formatAmount(amountInput.value) : '');
      done.hidden = false;
      scrollIntoViewIfAbove(root);
      done.focus({ preventScroll: true });
    }

    function setSending(state) {
      sending = state;
      if (!submitBtn) return;
      submitBtn.disabled = state;
      submitBtn.textContent = state ? 'Sending…' : submitLabel;
    }

    root.addEventListener('click', function (e) {
      if (e.target.closest('[data-fc-next]')) {
        if (validate(steps[current])) show(current + 1, true);
      } else if (e.target.closest('[data-fc-back]')) {
        show(current - 1, true);
      }
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (sending) return;

      // Enter pressed inside an earlier step acts as "Continue".
      if (current < steps.length - 1) {
        if (validate(steps[current])) show(current + 1, true);
        return;
      }
      if (!validate(steps[current])) return;
      if (submitError) submitError.hidden = true;

      // Bots fill the honeypot; give them a fake success and send nothing.
      if (value('_gotcha')) { showSuccess(); return; }

      var endpoint = form.getAttribute('action') || '';
      if (!/^https:\/\//.test(endpoint)) {
        console.error('[Fidelity] Apply form has no submit endpoint. Set the <form action> in the Code Block.');
        if (submitError) submitError.hidden = false;
        return;
      }

      var data = new FormData(form);
      data.delete('_gotcha');
      if (amountInput) data.append('loan_amount_display', formatAmount(amountInput.value));
      data.append('submitted_from', window.location.href);

      setSending(true);
      fetch(endpoint, { method: 'POST', body: data, headers: { Accept: 'application/json' } })
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          setSending(false);
          showSuccess();
        })
        .catch(function (err) {
          console.error('[Fidelity] Apply form submit failed:', err);
          setSending(false);
          if (submitError) submitError.hidden = false;
        });
    });

    show(0, false);
  }

  // ---------------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------------
  var components = {
    loan: initLoanPicker,
    apply: initApplyForm
  };

  function initAll() {
    toArray(document.querySelectorAll('[data-fc]:not([data-fc-ready])')).forEach(function (el) {
      var init = components[el.getAttribute('data-fc')];
      if (!init) return;
      el.setAttribute('data-fc-ready', '');
      try {
        init(el);
      } catch (err) {
        console.error('[Fidelity] ' + el.getAttribute('data-fc') + ' failed to start:', err);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
  // Squarespace templates with AJAX page loading fire this after each navigation.
  window.addEventListener('mercury:load', initAll);
})();
