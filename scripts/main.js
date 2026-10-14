/*!
 * Fidelity Capital — Squarespace 7.1 site scripts
 * Deployed via: Code Injection > FOOTER
 * (npm run build wraps this file in <script> tags: dist/footer-injection.html)
 *
 * Self-contained: one re-entry guard on window, no other globals. Each
 * component enhances markup from /blocks/*.html and does nothing if that
 * markup is absent. The only network calls are the application form's own
 * Zapier / Zoho endpoints, configured on the Code Block (data-* attributes).
 */
(function () {
  'use strict';

  if (window.__fcSiteScripts) return;
  window.__fcSiteScripts = true;

  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function digits(value) {
    return Number(String(value || '').replace(/[^\d]/g, '')) || 0;
  }

  function headerOffset() {
    var header = document.getElementById('header');
    return header ? header.offsetHeight + 16 : 16;
  }

  function scrollToEl(el) {
    var top = el.getBoundingClientRect().top + window.pageYOffset - headerOffset();
    window.scrollTo({ top: top, behavior: reducedMotion ? 'auto' : 'smooth' });
  }

  function referenceNumber() {
    var d = new Date();
    var pad = function (n) { return String(n).padStart(2, '0'); };
    return 'FC-' + String(d.getFullYear()).slice(2) + pad(d.getMonth() + 1) + pad(d.getDate()) +
      '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
  }

  // ---------------------------------------------------------------------------
  // Application form  (blocks/apply-form.html)
  // ---------------------------------------------------------------------------
  function initApplyForm(root) {
    var card = $('.fc-apply__card', root);
    var form = $('form', root);
    if (!card || !form) return;

    var cfg = {
      zapierUrl: (root.getAttribute('data-zapier-url') || '').trim(),
      zohoAction: (root.getAttribute('data-zoho-action') || '').trim(),
      zohoXnQsjsdp: (root.getAttribute('data-zoho-xnqsjsdp') || '').trim(),
      zohoXmIwtLD: (root.getAttribute('data-zoho-xmiwtld') || '').trim(),
      zohoActionType: (root.getAttribute('data-zoho-action-type') || 'TGVhZHM=').trim(),
      zohoLeadSource: (root.getAttribute('data-zoho-lead-source') || 'Website application').trim(),
      debug: root.hasAttribute('data-debug')
    };

    var panes = $$('.fc-apply__pane', form);
    var bars = $$('.fc-apply__progress span', card);
    var whoBar = $('.fc-apply__who', card);
    var progress = $('.fc-apply__progress', card);
    var backBtn = $('[data-fc-back]', form);
    var nextBtn = $('[data-fc-next]', form);
    var submitBtn = $('[data-fc-submit]', form);
    var done = $('[data-fc-done]', card);
    var submitErr = $('[data-fc-submit-err]', form);
    var submitLabel = submitBtn.textContent;
    var step = 1;
    var who = 'client';
    var sending = false;

    root.classList.add('is-enhanced');

    // --- Business owner / broker -------------------------------------------
    function setWho(value) {
      who = value === 'broker' ? 'broker' : 'client';
      $('[data-fc-applicant-type]', form).value = who;
      $$('[data-fc-set-who]', card).forEach(function (btn) {
        btn.setAttribute('aria-pressed', String(btn.getAttribute('data-fc-set-who') === who));
      });
      $('[data-fc-broker-only]', form).hidden = who !== 'broker';
      $('[data-fc-contact-legend]', form).textContent = who === 'broker' ? 'Your details and your client' : 'Your details';
      $$('[data-fc-client-req]', form).forEach(function (el) { el.hidden = who === 'broker'; });
    }

    // --- Steps ---------------------------------------------------------------
    function go(n, moveFocus) {
      step = Math.max(1, Math.min(panes.length, n));
      panes.forEach(function (pane) { pane.hidden = Number(pane.getAttribute('data-step')) !== step; });
      bars.forEach(function (bar, i) { bar.classList.toggle('is-on', i < step); });
      backBtn.hidden = step === 1;
      nextBtn.hidden = step === panes.length;
      submitBtn.hidden = step !== panes.length;
      if (moveFocus) {
        scrollToEl(card);
        var legend = $('.fc-apply__pane[data-step="' + step + '"] legend', form);
        if (legend) legend.focus({ preventScroll: true });
      }
    }

    // --- Validation ----------------------------------------------------------
    function mark(field, invalid) {
      field.setAttribute('aria-invalid', invalid ? 'true' : 'false');
      return !invalid;
    }

    function validate(n) {
      var pane = $('.fc-apply__pane[data-step="' + n + '"]', form);
      var first = null;
      var fields = $$('[required]', pane).concat($$(who === 'broker' ? '[data-req-broker]' : '[data-req-client]', pane));

      fields.forEach(function (field) {
        if (field.type === 'checkbox') return;
        var value = field.value.trim();
        var invalid = !value;
        if (!invalid && field.type === 'email') invalid = !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
        if (!invalid && field.hasAttribute('data-fc-abn')) invalid = value.replace(/\D/g, '').length < 9;
        if (!mark(field, invalid) && !first) first = field;
      });

      if (n === 3) {
        var anyPurpose = $$('input[name="purpose"]:checked', form).length > 0;
        $('[data-fc-purpose-err]', form).hidden = anyPurpose;
        if (!anyPurpose && !first) first = $('[data-fc-purpose] input', form);
      }
      if (n === 4) {
        var consent = $('[data-fc-consent]', form);
        $('[data-fc-consent-err]', form).hidden = consent.checked;
        if (!consent.checked && !first) first = consent;
      }

      if (first) first.focus();
      return !first;
    }

    // Clear an error as soon as the visitor changes the field.
    form.addEventListener('input', function (e) {
      if (e.target.getAttribute('aria-invalid') === 'true') mark(e.target, false);
    });
    form.addEventListener('change', function (e) {
      if (e.target.name === 'purpose') $('[data-fc-purpose-err]', form).hidden = true;
      if (e.target.hasAttribute('data-fc-consent')) $('[data-fc-consent-err]', form).hidden = true;
    });

    // --- Money fields + indicative LVR ---------------------------------------
    var lvrHint = $('[data-fc-lvr]', form);
    function updateLvr() {
      var value = digits(form.elements.security_value.value);
      var debt = digits(form.elements.existing_debt.value);
      var amount = digits(form.elements.loan_amount.value);
      if (!value) {
        lvrHint.textContent = 'Enter both to see the indicative LVR.';
        return;
      }
      lvrHint.textContent = 'Indicative LVR including this loan: ' + Math.round(((debt + amount) / value) * 100) + '%';
    }
    $$('[data-fc-money]', form).forEach(function (input) {
      input.addEventListener('blur', function () {
        var n = digits(input.value);
        input.value = n ? n.toLocaleString('en-AU') : '';
        updateLvr();
      });
    });

    // --- Submission ----------------------------------------------------------
    function buildPayload(ref) {
      var data = new FormData(form);
      var out = {};
      data.forEach(function (value, key) {
        if (key === 'website_url') return;
        out[key] = key in out ? out[key] + '; ' + value : value;
      });
      ['loan_amount', 'security_value', 'existing_debt', 'monthly_turnover'].forEach(function (key) {
        if (out[key]) out[key] = digits(out[key]);
      });
      out.consent = !!out.consent;
      out.reference = ref;
      out.submitted_at = new Date().toISOString();
      out.source_page = window.location.href.split('#')[0];
      return out;
    }

    function sendZapier(payload) {
      if (!/^https:\/\//.test(cfg.zapierUrl)) return Promise.resolve(false);
      var body = new URLSearchParams();
      Object.keys(payload).forEach(function (key) { body.append(key, payload[key]); });
      // Zapier catch hooks don't send CORS headers, so the response is opaque.
      // A resolved request means it was delivered; a network error rejects.
      return fetch(cfg.zapierUrl, { method: 'POST', mode: 'no-cors', body: body })
        .then(function () { return true; })
        .catch(function (err) {
          console.error('[Fidelity] Zapier webhook failed:', err);
          return false;
        });
    }

    function sendZoho(p) {
      if (!cfg.zohoXnQsjsdp || !cfg.zohoXmIwtLD || !/^https:\/\//.test(cfg.zohoAction)) return false;

      var sink = document.getElementById('fc-zoho-sink');
      if (!sink) {
        sink = document.createElement('iframe');
        sink.name = sink.id = 'fc-zoho-sink';
        sink.title = 'Zoho submission';
        sink.hidden = true;
        document.body.appendChild(sink);
      }

      var description = [
        'Ref: ' + p.reference,
        'Applicant: ' + p.applicant_type,
        p.applicant_type === 'broker'
          ? 'Broker: ' + p.broker_name + ' (' + p.broker_company + ') ' + p.broker_email + ' ' + p.broker_phone +
            ' Agg: ' + (p.broker_aggregator || '-') + ' ACL: ' + (p.broker_acl || '-')
          : '',
        'ABN: ' + p.abn,
        'Amount: $' + (p.loan_amount || 0).toLocaleString('en-AU'),
        'Purpose: ' + (p.purpose || '-'),
        'Status: ' + (p.status || '-'),
        'Security: ' + p.security_type + ' ' + (p.security_postcode || '') +
          ' value $' + (p.security_value || '-') + ' debt $' + (p.existing_debt || '-'),
        'Exit: ' + (p.exit_strategy || '-'),
        'Urgency: ' + p.urgency,
        'Story: ' + (p.story || '-')
      ].filter(Boolean).join('\n');

      var fields = {
        xnQsjsdp: cfg.zohoXnQsjsdp,
        xmIwtLD: cfg.zohoXmIwtLD,
        actionType: cfg.zohoActionType,
        returnURL: 'null',
        'First Name': p.first_name,
        'Last Name': p.last_name,
        'Email': p.email || p.broker_email,
        'Mobile': p.phone || p.broker_phone,
        'Company': p.business_name,
        'State': p.state || '',
        'Industry': p.industry || '',
        'Lead Source': cfg.zohoLeadSource,
        'Description': description
      };

      var zohoForm = document.createElement('form');
      zohoForm.action = cfg.zohoAction;
      zohoForm.method = 'POST';
      zohoForm.target = 'fc-zoho-sink';
      zohoForm.hidden = true;
      Object.keys(fields).forEach(function (key) {
        var input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = fields[key] == null ? '' : fields[key];
        zohoForm.appendChild(input);
      });
      document.body.appendChild(zohoForm);
      zohoForm.submit();
      setTimeout(function () { zohoForm.remove(); }, 2000);
      return true;
    }

    function showDone(ref, payload, sent) {
      form.hidden = true;
      progress.hidden = true;
      whoBar.hidden = true;
      $('[data-fc-ref]', done).textContent = ref;
      var preview = !sent && cfg.debug;
      $('[data-fc-preview-note]', done).hidden = !preview;
      var pre = $('[data-fc-payload]', done);
      pre.hidden = !preview;
      pre.textContent = preview ? JSON.stringify(payload, null, 2) : '';
      done.hidden = false;
      scrollToEl(card);
      done.focus({ preventScroll: true });
    }

    function setSending(state) {
      sending = state;
      submitBtn.disabled = state;
      submitBtn.textContent = state ? 'Sending…' : submitLabel;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (sending) return;

      // Enter pressed inside an earlier step acts as "Continue".
      if (step < panes.length) {
        if (validate(step)) go(step + 1, true);
        return;
      }
      if (!validate(step)) return;
      submitErr.hidden = true;

      var ref = referenceNumber();
      var payload = buildPayload(ref);

      // Bots fill the honeypot: show a normal confirmation, send nothing.
      if (form.elements.website_url.value) {
        showDone(ref, payload, true);
        return;
      }

      var configured = /^https:\/\//.test(cfg.zapierUrl) || (cfg.zohoXnQsjsdp && cfg.zohoXmIwtLD);
      if (!configured) {
        console.error('[Fidelity] Application form has no Zapier or Zoho settings. Set the data-* attributes on the Code Block.');
        if (cfg.debug) {
          showDone(ref, payload, false);
        } else {
          submitErr.hidden = false;
        }
        return;
      }

      setSending(true);
      sendZapier(payload).then(function (zapierSent) {
        var zohoSent = false;
        try {
          zohoSent = sendZoho(payload);
        } catch (err) {
          console.error('[Fidelity] Zoho submission failed:', err);
        }
        setSending(false);
        if (zapierSent || zohoSent) {
          showDone(ref, payload, true);
        } else {
          submitErr.hidden = false;
        }
      });
    });

    // --- Buttons -------------------------------------------------------------
    card.addEventListener('click', function (e) {
      var whoBtn = e.target.closest('[data-fc-set-who]');
      if (whoBtn) {
        setWho(whoBtn.getAttribute('data-fc-set-who'));
      } else if (e.target.closest('[data-fc-next]')) {
        if (validate(step)) go(step + 1, true);
      } else if (e.target.closest('[data-fc-back]')) {
        go(step - 1, true);
      } else if (e.target.closest('[data-fc-restart]')) {
        form.reset();
        $$('[aria-invalid="true"]', form).forEach(function (f) { f.setAttribute('aria-invalid', 'false'); });
        form.hidden = false;
        progress.hidden = false;
        whoBar.hidden = false;
        done.hidden = true;
        submitErr.hidden = true;
        updateLvr();
        setWho('client');
        go(1, true);
      }
    });

    // "#apply-broker" links anywhere on the page open the form as a broker.
    function openAsBroker() {
      setWho('broker');
      if (!done.hidden) return;
      go(1, false);
      scrollToEl(card);
    }
    document.addEventListener('click', function (e) {
      var link = e.target.closest('a[href$="#apply-broker"]');
      if (!link) return;
      var url = new URL(link.href, window.location.href);
      if (url.pathname !== window.location.pathname) return; // different page: let it navigate
      e.preventDefault();
      history.replaceState(null, '', '#apply-broker');
      openAsBroker();
    });

    setWho('client');
    go(1, false);
    if (window.location.hash === '#apply-broker') openAsBroker();
  }

  // ---------------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------------
  var components = {
    apply: initApplyForm
  };

  function initAll() {
    $$('[data-fc]:not([data-fc-ready])').forEach(function (el) {
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
