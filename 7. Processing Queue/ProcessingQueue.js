function ugShowLoader() {
  if (document.getElementById('ug-loader')) return;
  var style = document.createElement('style');
  style.id = 'ug-loader-style';
  style.textContent =
    '#ug-loader{position:fixed;inset:0;background:rgba(255,255,255,0.95);display:flex;' +
    'flex-direction:column;align-items:center;justify-content:center;z-index:9999;' +
    'gap:16px;font-family:Arial,sans-serif;transition:opacity 0.4s ease;}' +
    '#ug-loader-spinner{width:44px;height:44px;border:4px solid #e2e8f0;' +
    'border-top-color:#1a6e2e;border-radius:50%;animation:ug-spin 0.75s linear infinite;}' +
    '#ug-loader-text{font-size:13px;color:#64748b;letter-spacing:0.03em;}' +
    '@keyframes ug-spin{to{transform:rotate(360deg);}}';
  document.head.appendChild(style);
  var el = document.createElement('div');
  el.id = 'ug-loader';
  el.innerHTML =
    '<div id="ug-loader-spinner"></div>' +
    '<span id="ug-loader-text">Loading application data…</span>';
  document.body.appendChild(el);
}

function ugHideLoader() {
  var el = document.getElementById('ug-loader');
  if (!el) return;
  el.style.opacity = '0';
  setTimeout(function () {
    if (el.parentNode) el.parentNode.removeChild(el);
    var s = document.getElementById('ug-loader-style');
    if (s && s.parentNode) s.parentNode.removeChild(s);
  }, 420);
}

function ugInitAutofill() {
  document.querySelectorAll('.Submit').forEach(function (el) { el.style.display = 'none'; });
  ugShowLoader();
  var url            = new URL(window.location.href);
  var reference      = url.searchParams.get('applicationReference');
  var passportNumber = url.searchParams.get('passportNumber');
  setTimeout(function () {
    if (reference) {
      var refInput = document.querySelector('.applicationReference input');
      if (refInput) {
        refInput.value = reference;
        refInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      var passInput = document.querySelector('.passportNumber input');
      if (passInput) {
        passInput.value = passportNumber;
        passInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  }, 1000);
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', ugInitAutofill);
} else {
  ugInitAutofill();
}

var _sig = atob('SmVhbiBCb3RoYSAvIFBpbnBvaW50');

function detectMimeFromBase64(raw) {
  if (raw.startsWith('data:')) {
    var m = raw.match(/^data:([^;,]+)/);
    return m ? m[1] : 'image/jpeg';
  }
  var head = raw.substring(0, 8);
  if (head.startsWith('/9j/'))     return 'image/jpeg';
  if (head.startsWith('iVBORw0')) return 'image/png';
  if (head.startsWith('Qk'))      return 'image/bmp';
  if (head.startsWith('R0lGOD'))  return 'image/gif';
  if (head.startsWith('JVBERi0')) return 'application/pdf';
  return 'image/jpeg';
}

function renderMedia(box, b64, placeholderHtml) {
  var raw = (b64 || '').trim();
  if (raw.length <= 10) { box.innerHTML = placeholderHtml; return; }

  var stripped = raw.startsWith('data:') ? (raw.split(',')[1] || '') : raw;
  var isPdf    = raw.startsWith('data:application/pdf') || stripped.startsWith('JVBERi0');

  if (!isPdf) {
    var mime = detectMimeFromBase64(raw);
    var src  = raw.startsWith('data:') ? raw : 'data:' + mime + ';base64,' + raw;
    box.innerHTML = '<img src="' + src + '" style="max-width:100%;max-height:360px;display:block;border-radius:8px;object-fit:contain;" />';
    return;
  }

  var pdfBase64 = raw.startsWith('data:') ? (raw.split(',')[1] || '') : raw;
  box.innerHTML =
    '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:8px;">' +
    '<svg width="44" height="56" viewBox="0 0 44 56" xmlns="http://www.w3.org/2000/svg">' +
    '<rect x="1" y="1" width="42" height="54" rx="4" fill="#fff" stroke="#ddd" stroke-width="1.5"/>' +
    '<polyline points="28,1 28,16 43,16" fill="none" stroke="#ddd" stroke-width="1.5"/>' +
    '<rect x="4" y="28" width="36" height="16" rx="2" fill="#e53935" opacity="0.9"/>' +
    '<text x="22" y="40" font-size="10" font-family="Arial,sans-serif" fill="#fff" text-anchor="middle" font-weight="700">PDF</text></svg>' +
    '<span style="font-size:11px;color:#888;font-family:Segoe UI,Arial,sans-serif;">PDF Document</span>' +
    '<button type="button" style="font-size:11px;color:#1a6cc4;border:1px solid #1a6cc4;border-radius:10px;padding:3px 14px;background:#fff;cursor:pointer;font-weight:500;font-family:Segoe UI,Arial,sans-serif;">View PDF</button>' +
    '</div>';

  box.querySelector('button').addEventListener('click', function () {
    var bytes = atob(pdfBase64);
    var arr   = new Uint8Array(bytes.length);
    for (var i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    var blob = new Blob([arr], { type: 'application/pdf' });
    var url  = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
  });
}

function ugInitLightbox() {
  if (document.getElementById('ug-lightbox')) return;
  if (!document.getElementById('ug-lightbox-style')) {
    var style = document.createElement('style');
    style.id = 'ug-lightbox-style';
    style.textContent =
      '#ug-lightbox{position:fixed;inset:0;background:rgba(0,0,0,0.88);' +
      'align-items:center;justify-content:center;z-index:10000;cursor:zoom-out;}' +
      '#ug-lightbox img{max-width:90vw;max-height:90vh;border-radius:8px;' +
      'object-fit:contain;box-shadow:0 8px 32px rgba(0,0,0,0.6);cursor:default;}' +
      '#ug-lightbox-close{position:absolute;top:16px;right:20px;color:#fff;font-size:32px;' +
      'line-height:1;cursor:pointer;opacity:0.75;user-select:none;}' +
      '#ug-lightbox-close:hover{opacity:1;}';
    document.head.appendChild(style);
  }
  var lb = document.createElement('div');
  lb.id = 'ug-lightbox';
  lb.style.display = 'none';
  lb.innerHTML = '<span id="ug-lightbox-close">&#x2715;</span><img alt="Document preview">';
  document.body.appendChild(lb);
  function close() { lb.style.display = 'none'; }
  lb.addEventListener('click', function (e) { if (e.target !== lb.querySelector('img')) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
}

function ugOpenLightbox(src) {
  var lb = document.getElementById('ug-lightbox');
  if (!lb) { ugInitLightbox(); lb = document.getElementById('ug-lightbox'); }
  if (!lb) return;
  lb.querySelector('img').src = src;
  lb.style.display = 'flex';
}

function ugInitTabs() {

  /* ══════════════════════════════════════════════════════════
     Tab content moves
     Add { id: 'qXX', target: 'ug-tab-XXXX' } per field.
     Fields are appended to the target pane in order listed.
  ══════════════════════════════════════════════════════════ */
  var tabMoves = [
    // CHECK LIST
    { id: 'cl-subnav', target: 'ug-tab-checklist' },
    { id: 'q20', target: 'ug-tab-checklist' },
    { id: 'q21', target: 'ug-tab-checklist' },
    { id: 'q22', target: 'ug-tab-checklist' },
    { id: 'q23', target: 'ug-tab-checklist' },
    { id: 'q24', target: 'ug-tab-checklist' },
    { id: 'q30', target: 'ug-tab-checklist' },
    { id: 'q25', target: 'ug-tab-checklist' },
    { id: 'q31', target: 'ug-tab-checklist' },
    { id: 'q26', target: 'ug-tab-checklist' },
    { id: 'q32', target: 'ug-tab-checklist' },
    { id: 'q27', target: 'ug-tab-checklist' },
    { id: 'q33', target: 'ug-tab-checklist' },
    { id: 'q28', target: 'ug-tab-checklist' },
    { id: 'q34', target: 'ug-tab-checklist' },
    { id: 'q29', target: 'ug-tab-checklist' },
    { id: 'q35', target: 'ug-tab-checklist' },
    { id: 'q152', target: 'ug-tab-checklist' },
    { id: 'q153', target: 'ug-tab-checklist' },
    { id: 'q154', target: 'ug-tab-checklist' },
    { id: 'q155', target: 'ug-tab-checklist' },
    { id: 'q156', target: 'ug-tab-checklist' },
    { id: 'q157', target: 'ug-tab-checklist' },
    { id: 'q158', target: 'ug-tab-checklist' },
    { id: 'q159', target: 'ug-tab-checklist' },

    // APPLICATION DETAILS
    { id: 'q161', target: 'ug-tab-appdetails' },
    { id: 'q165', target: 'ug-tab-appdetails' },
    { id: 'q162', target: 'ug-tab-appdetails' },
    { id: 'q166', target: 'ug-tab-appdetails' },
    { id: 'q163', target: 'ug-tab-appdetails' },
    { id: 'q167', target: 'ug-tab-appdetails' },
    { id: 'q164', target: 'ug-tab-appdetails' },
    { id: 'q168', target: 'ug-tab-appdetails' },
    { id: 'passport-card',   target: 'ug-tab-appdetails' },
    { id: 'travel-card',     target: 'ug-tab-appdetails' },
    { id: 'identity-card',   target: 'ug-tab-appdetails' },
    { id: 'background-card', target: 'ug-tab-appdetails' },

    // DOCUMENTS
    { id: 'q95',  target: 'ug-tab-documents' },
    { id: 'q137', target: 'ug-tab-documents' },
    { id: 'q143', target: 'ug-tab-documents' },
    { id: 'q148', target: 'ug-tab-documents' },
    { id: 'q149', target: 'ug-tab-documents' },
    { id: 'q150', target: 'ug-tab-documents' },
    { id: 'q151', target: 'ug-tab-documents' },

    // COMMENTS
    { id: 'q84', target: 'ug-tab-comments' },

    // APPLICATION LOG
    // { id: 'qXX', target: 'ug-tab-applog' },

    // HIDDEN (PinPointAdmin only)
    { id: 'q13', target: 'ug-tab-hidden' },
  ];

  function runMoves() {
    tabMoves.forEach(function (m) {
      if (m.done) return; /* move each field once — later passes must not re-append
                              it and undo whatever buildChecklistCard nested it into */
      var el     = document.getElementById(m.id);
      var target = document.getElementById(m.target);
      if (el && target) { target.appendChild(el); m.done = true; }
    });
  }

  function tryLoop(n) {
    ugInitLightbox();
    runMoves();
    checklistCards.forEach(buildChecklistCard);
    initCommentsCard();
    initDocumentsCard();
    initAdditionalDocuments();
    initDocumentsComment();
    initAppDetailsSliders();
    if (n > 0) setTimeout(function () { tryLoop(n - 1); }, 400);
  }

  /* ── Tab click handler ─────────────────────────────────── */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.ug-tab-btn');
    if (!btn) return;
    var target = btn.getAttribute('data-tab');
    document.querySelectorAll('.ug-tab-btn').forEach(function (b) { b.classList.remove('active'); });
    btn.classList.add('active');
    document.querySelectorAll('.ug-tab-pane').forEach(function (p) { p.classList.remove('active'); });
    var pane = document.getElementById(target);
    if (pane) pane.classList.add('active');
  });

  /* Registry of slider refresh functions — populated by buildAcceptSlider,
     consumed by refreshAllSliders so the lookup handler can keep every
     slider in sync with its backing select. */
  var _sliderRefreshFns = [];

  function refreshAllSliders() {
    _sliderRefreshFns.forEach(function (fn) { fn(); });
  } 

  /* ── Lookup-driven refresh ──────────────────────────────────
     LF Forms fires jQuery 'lookupstarted' / 'lookupcomplete' events on
     $(document). _lookupCounter tracks in-flight lookups; when it drops
     to 0 we wait 300 ms then call ugOnLookupSettled() to push all fresh
     values into the custom HTML in one shot.                           */
  var _onLookupFns       = [];
  var _lookupCounter     = 0;
  var _lookupSettleTimer = null;

  function ugOnLookupSettled() {
    ugHideLoader();
    refreshAllSliders();
    updateClNav();
    updateAppDetailsNav();
    _onLookupFns.forEach(function (fn) { fn(); });
    /* Call each HTML card's update function directly — they use getVal() to
       read from the DOM, so they pick up lookup-filled values immediately.   */
    if (typeof window.updateCard           === 'function') window.updateCard();
    if (typeof window.updatePassportCard   === 'function') window.updatePassportCard();
    if (typeof window.updateTravelCard     === 'function') window.updateTravelCard();
    if (typeof window.updateIdentityCard   === 'function') window.updateIdentityCard();
    if (typeof window.updateBackgroundCard === 'function') window.updateBackgroundCard();
  }

  $(document).on('lookupstarted', function () {
    _lookupCounter++;
    if (_lookupSettleTimer) { clearTimeout(_lookupSettleTimer); _lookupSettleTimer = null; }
  });

  $(document).on('lookupcomplete', function () {
    if (_lookupCounter > 0) _lookupCounter--;
    if (_lookupCounter === 0) {
      _lookupSettleTimer = setTimeout(function () {
        _lookupSettleTimer = null;
        ugOnLookupSettled();
      }, 300);
    }
  });

  /* ── Acceptable / Null / Not Acceptable slider ─────────────
     Left = Not Acceptable (red), middle = blank (grey), right = Acceptable (green).
     Drives the real <select> so the rest of the form (updateClNav, submit
     validation) keeps working off that value. mountEl lets callers place the
     slider somewhere other than right after the select (e.g. a card header). */
  function buildAcceptSlider(fieldId, mountEl, cardEl) {
    var wrap = document.getElementById(fieldId);
    if (!wrap) return;
    var select = wrap.querySelector('select');
    if (!select || wrap.querySelector('.ug-accept-slider')) return;

    function valToStep(val) {
      if (val === 'Not Acceptable') return '0';
      if (val === 'Acceptable')     return '2';
      return '1';
    }
    function stepToVal(step) {
      if (step === '0') return 'Not Acceptable';
      if (step === '2') return 'Acceptable';
      return '';
    }

    var slider = document.createElement('div');
    slider.className = 'ug-accept-slider';
    slider.innerHTML = '<input type="range" min="0" max="2" step="1" class="ug-accept-range">';

    select.style.display = 'none';
    if (mountEl) mountEl.appendChild(slider);
    else select.insertAdjacentElement('afterend', slider);

    var range = slider.querySelector('.ug-accept-range');

    function paint() {
      var state = (range.value === '0') ? 'ug-accept-red' : (range.value === '2') ? 'ug-accept-green' : 'ug-accept-grey';
      slider.classList.remove('ug-accept-red', 'ug-accept-grey', 'ug-accept-green');
      slider.classList.add(state);
      if (cardEl) {
        cardEl.classList.remove('ug-accept-red', 'ug-accept-grey', 'ug-accept-green');
        cardEl.classList.add(state);
      }
    }

    range.value = valToStep(select.value.trim());
    paint();

    range.addEventListener('input', paint);
    range.addEventListener('change', function () {
      select.value = stepToVal(range.value);
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });

    /* keep slider in sync if the select changes elsewhere (e.g. lookup fill) */
    select.addEventListener('change', function () {
      range.value = valToStep(select.value.trim());
      paint();
    });

    /* register for polling-based sync — catches lookups that don't fire change */
    _sliderRefreshFns.push(function () {
      var step = valToStep(select.value.trim());
      if (range.value !== step) { range.value = step; paint(); }
    });
  }

  /* ── Comments — one read-only card per message row + Noted toggle ──
     q84 is the repeatable collection (Sent_by/Sent_on/Message/Noted per
     row). Each row's native inputs are hidden and re-rendered as plain
     value/label text (same convention as the Application details cards),
     except Noted, which becomes a two-way toggle button driving the real
     select. New rows added via the collection's own "Add" button are
     picked up automatically via MutationObserver. */
  function initCommentsCard() {
    var wrap = document.getElementById('q84');
    if (!wrap || wrap.dataset.cmInit) return;
    var collection = wrap.querySelector('.cf-collection');
    if (!collection) return;
    wrap.dataset.cmInit = '1';

    function styleRow(row) {
      if (!row || row.classList.contains('cm-card')) return;

      var sentByLi = row.querySelector('li[attr="Sent_by"]');
      var sentOnLi = row.querySelector('li[attr="Sent_on"]');
      var msgLi    = row.querySelector('li[attr="Message_of_applicant"]');
      var notedLi  = row.querySelector('li[attr="Noted"]');
      if (!sentByLi || !sentOnLi || !msgLi || !notedLi) return;

      var sentByInput = sentByLi.querySelector('input');
      var sentOnInput = sentOnLi.querySelector('input');
      var msgInput    = msgLi.querySelector('textarea');
      var select      = notedLi.querySelector('select');
      if (!sentByInput || !sentOnInput || !msgInput || !select) return;

      row.classList.add('cm-card');

      var rpx = row.querySelector('ul.rpx');
      var display = document.createElement('div');
      display.className = 'cm-display';
      display.innerHTML =
        '<div class="cm-col-left">' +
          '<div class="cm-field"><span class="cm-value cm-sent-on"></span><span class="cm-label">Sent on</span></div>' +
          '<div class="cm-field"><span class="cm-value cm-sent-by"></span><span class="cm-label">Sent by</span></div>' +
        '</div>' +
        '<div class="cm-col-right">' +
          '<span class="cm-value cm-message"></span>' +
          '<span class="cm-label">Message of applicant</span>' +
        '</div>';
      row.insertBefore(display, rpx);
      if (rpx) rpx.style.display = 'none';

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cm-noted-btn';
      row.appendChild(btn);

      function refreshValues() {
        display.querySelector('.cm-sent-on').textContent = sentOnInput.value.trim() || '—';
        display.querySelector('.cm-sent-by').textContent = sentByInput.value.trim() || '—';
        display.querySelector('.cm-message').textContent = msgInput.value.trim()    || '—';
      }
      function paintBtn() {
        var noted = select.value.trim() === 'Yes';
        btn.textContent = noted ? 'Noted' : 'Not Noted';
        btn.classList.toggle('cm-noted-active', noted);
      }

      [sentByInput, sentOnInput, msgInput].forEach(function (el) {
        el.addEventListener('input', refreshValues);
        el.addEventListener('change', refreshValues);
      });
      btn.addEventListener('click', function () {
        select.value = (select.value.trim() === 'Yes') ? 'No' : 'Yes';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      });
      select.addEventListener('change', paintBtn);

      refreshValues();
      paintBtn();
    }

    Array.prototype.forEach.call(collection.children, styleRow);

    new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        m.addedNodes.forEach(function (node) {
          if (node.nodeType === 1 && node.classList && node.classList.contains('form-q')) {
            styleRow(node);
          }
        });
      });
    }).observe(collection, { childList: true });
  }

  /* ── Additional Documents — show/hide q143 based on q137 ──
     q137 select (Yes/No) controls whether the q143 collection
     is visible. Rows in q143 are styled as simple cards. */
  function initAdditionalDocuments() {
    var reqEl    = document.getElementById('q137');
    var addDocEl = document.getElementById('q143');
    if (!reqEl || !addDocEl || reqEl.dataset.addDocInit) return;
    reqEl.dataset.addDocInit = '1';

    var wrapper = document.createElement('div');
    wrapper.className = 'add-doc-wrapper';
    reqEl.parentNode.insertBefore(wrapper, reqEl);
    wrapper.appendChild(reqEl);
    wrapper.appendChild(addDocEl);

    var reqSelect = reqEl.querySelector('select');

    function updateVisibility() {
      var val = reqSelect ? reqSelect.value.trim() : '';
      if (val === 'Yes') {
        addDocEl.style.removeProperty('display');
      } else {
        addDocEl.style.setProperty('display', 'none', 'important');
      }
    }

    if (reqSelect) reqSelect.addEventListener('change', updateVisibility);

    var collection = addDocEl.querySelector('.cf-collection');
    function styleAddDocRow(row) {
      if (!row || row.classList.contains('add-doc-card')) return;
      row.classList.add('add-doc-card');

      var docTypeLi   = row.querySelector('li[attr="Document_Type_Request_Additional_Documents"]');
      var otherTypeLi = row.querySelector('li[attr="Other_Type_Request_Additional_Documents"]');
      if (!docTypeLi || !otherTypeLi) return;

      var docTypeSelect = docTypeLi.querySelector('select');
      if (!docTypeSelect) return;

      function updateOtherVisibility() {
        if (docTypeSelect.value.trim() === 'Other') {
          otherTypeLi.style.removeProperty('display');
        } else {
          otherTypeLi.style.setProperty('display', 'none', 'important');
        }
      }

      docTypeSelect.addEventListener('change', updateOtherVisibility);
      updateOtherVisibility();

      var adCount = 0;
      var adTimer = setInterval(function () {
        updateOtherVisibility();
        if (++adCount >= 30) clearInterval(adTimer);
      }, 500);
    }
    if (collection) {
      Array.prototype.forEach.call(collection.children, styleAddDocRow);
      new MutationObserver(function (mutations) {
        mutations.forEach(function (m) {
          m.addedNodes.forEach(function (node) {
            if (node.nodeType === 1) styleAddDocRow(node);
          });
        });
      }).observe(collection, { childList: true });
    }

    var count = 0;
    var timer = setInterval(function () {
      updateVisibility();
      if (++count >= 30) clearInterval(timer);
    }, 500);
  }

  /* ── Documents Comments — textarea + "Comment by X on Y Z" stamp ──
     q148 textarea is the editable comment. q149/q150/q151 are hidden
     and their values are combined into a read-only stamp below it. */
  function initDocumentsComment() {
    var commentsEl = document.getElementById('q148');
    if (!commentsEl || commentsEl.dataset.docCmtInit) return;
    commentsEl.dataset.docCmtInit = '1';

    commentsEl.classList.add('doc-comment-section');
    commentsEl.style.setProperty('padding', '16px 18px', 'important');

    var label = commentsEl.querySelector('.cf-label');
    if (label) label.classList.add('doc-comment-label');

    var commentByEl = document.getElementById('q149');
    var dateEl      = document.getElementById('q150');
    var timeEl      = document.getElementById('q151');
    [commentByEl, dateEl, timeEl].forEach(function (el) {
      if (el) el.style.setProperty('display', 'none', 'important');
    });

    var stamp = document.createElement('div');
    stamp.className = 'doc-comment-stamp';
    commentsEl.appendChild(stamp);

    function updateStamp() {
      var by   = commentByEl ? (commentByEl.querySelector('input') || { value: '' }).value.trim() : '';
      var date = dateEl      ? (dateEl.querySelector('input')      || { value: '' }).value.trim() : '';
      var time = timeEl      ? (timeEl.querySelector('input')      || { value: '' }).value.trim() : '';
      if (by || date || time) {
        stamp.textContent = 'Comment by ' + (by || '—') + ' commented on ' + (date || '—') + (time ? ' ' + time : '');
        stamp.style.display = 'block';
      } else {
        stamp.style.display = 'none';
      }
    }

    [commentByEl, dateEl, timeEl].forEach(function (el) {
      if (!el) return;
      var inp = el.querySelector('input');
      if (!inp) return;
      inp.addEventListener('change', updateStamp);
      inp.addEventListener('input', updateStamp);
    });

    var textarea = commentsEl.querySelector('textarea');
    if (textarea) {
      textarea.addEventListener('blur', function () {
        if (!textarea.value.trim()) return;
        var now  = new Date();
        var yyyy = now.getFullYear();
        var MM   = String(now.getMonth() + 1).padStart(2, '0');
        var dd   = String(now.getDate()).padStart(2, '0');
        var HH   = String(now.getHours()).padStart(2, '0');
        var mm   = String(now.getMinutes()).padStart(2, '0');
        var usernameField = document.getElementById('Field19');
        var username = usernameField ? usernameField.value.trim() : '';
        var byInp   = commentByEl ? commentByEl.querySelector('input') : null;
        var dateInp = dateEl      ? dateEl.querySelector('input')      : null;
        var timeInp = timeEl      ? timeEl.querySelector('input')      : null;
        if (byInp && !byInp.value.trim()) {
          byInp.value = username;
          byInp.dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (dateInp && !dateInp.value.trim()) {
          dateInp.value = yyyy + '-' + MM + '-' + dd;
          dateInp.dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (timeInp && !timeInp.value.trim()) {
          timeInp.value = HH + ':' + mm;
          timeInp.dispatchEvent(new Event('change', { bubbles: true }));
        }
        updateStamp();
      });
    }

    _onLookupFns.push(updateStamp);

    updateStamp();
    var count = 0;
    var timer = setInterval(function () {
      updateStamp();
      if (++count >= 30) clearInterval(timer);
    }, 500);
  }

  /* ── Documents — one card per uploaded image ───────────────
     q95 is the repeatable collection (Image_Base_64 per row, q97). Each
     row's base64 textarea is hidden and rendered as an actual <img>
     preview instead. New rows added via "Add" are picked up via
     MutationObserver, same as the Comments collection above. */
  function initDocumentsCard() {
    var wrap = document.getElementById('q95');
    if (!wrap || wrap.dataset.docInit) return;
    var collection = wrap.querySelector('.cf-collection');
    if (!collection) return;
    wrap.dataset.docInit = '1';

    var docPlaceholderHtml = '<span class="doc-placeholder">No document uploaded</span>';

    function styleRow(row) {
      if (!row || row.classList.contains('doc-card')) return;

      var imgLi = row.querySelector('li[attr="Image_Base_64"]');
      if (!imgLi) return;
      var textarea = imgLi.querySelector('textarea');
      if (!textarea) return;

      row.classList.add('doc-card');

      var rpx = row.querySelector('ul.rpx');
      var display = document.createElement('div');
      display.className = 'doc-display';
      display.innerHTML =
        '<img class="doc-img-preview" style="max-width:100%;max-height:200px;border-radius:8px;object-fit:contain;cursor:zoom-in;display:none;" alt="Document">' +
        docPlaceholderHtml;
      row.insertBefore(display, rpx);
      if (rpx) rpx.style.display = 'none';

      var img         = display.querySelector('.doc-img-preview');
      var placeholder = display.querySelector('.doc-placeholder');

      img.addEventListener('click', function () { if (img.src) ugOpenLightbox(img.src); });
      var lastVal     = null;

      function refresh() {
        var raw = (textarea.value || '').trim();
        if (raw === lastVal) return;
        lastVal = raw;

        if (!raw || raw.length < 50) {
          img.src = '';
          img.style.display = 'none';
          placeholder.style.display = 'block';
          return;
        }

        var stripped = raw.startsWith('data:') ? (raw.split(',')[1] || '') : raw;
        var isPdf    = raw.startsWith('data:application/pdf') || stripped.startsWith('JVBERi0');

        if (!isPdf) {
          var mime = detectMimeFromBase64(raw);
          var src  = raw.startsWith('data:') ? raw : 'data:' + mime + ';base64,' + raw;
          img.src = src;
          img.style.display = 'block';
          placeholder.style.display = 'none';
        } else {
          renderMedia(display, raw, docPlaceholderHtml);
        }
      }

      textarea.addEventListener('input', refresh);
      textarea.addEventListener('change', refresh);
      _onLookupFns.push(refresh);
      refresh();

      var pollCount = 0;
      var pollTimer = setInterval(function () {
        refresh();
        if (++pollCount >= 30) clearInterval(pollTimer);
      }, 500);
    }

    Array.prototype.forEach.call(collection.children, styleRow);

    new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        m.addedNodes.forEach(function (node) {
          if (node.nodeType === 1 && node.classList && node.classList.contains('form-q')) {
            styleRow(node);
          }
        });
      });
    }).observe(collection, { childList: true });
  }

  /* ── Check List section cards — toggle + title + comment box ──
     One card per section: { toggleId, commentId }. Card title is read
     straight off the toggle field's own Cognito label, so it stays in
     sync if a label is ever reworded. */
  var checklistCards = [
    { toggleId: 'q20', commentId: 'q21', statusId: 'q152' },
    { toggleId: 'q22', commentId: 'q23', statusId: 'q153' },
    { toggleId: 'q24', commentId: 'q30', statusId: 'q154' },
    { toggleId: 'q25', commentId: 'q31', statusId: 'q155' },
    { toggleId: 'q26', commentId: 'q32', statusId: 'q156' },
    { toggleId: 'q27', commentId: 'q33', statusId: 'q157' },
    { toggleId: 'q28', commentId: 'q34', statusId: 'q158' },
    { toggleId: 'q29', commentId: 'q35', statusId: 'q159' },
  ];

  function buildChecklistCard(cfg) {
    var cardId = 'cl-card-' + cfg.toggleId;
    if (document.getElementById(cardId)) return;

    var toggleLi  = document.getElementById(cfg.toggleId);
    var commentLi = document.getElementById(cfg.commentId);
    if (!toggleLi || !commentLi) return;

    var label     = toggleLi.querySelector('.cf-label');
    var titleSpan = label ? label.querySelector('span:not(.screen-reader-legend)') : null;
    var title     = titleSpan ? titleSpan.textContent.trim() : (label ? label.textContent.trim() : cfg.toggleId);

    var card = document.createElement('div');
    card.className = 'cl-card';
    card.id = cardId;
    card.innerHTML =
      '<div class="cl-card-header">' +
        '<span class="cl-card-toggle-slot"></span>' +
        '<span class="cl-card-title"></span>' +
      '</div>' +
      '<div class="cl-card-body"></div>';
    card.querySelector('.cl-card-title').textContent = title;

    toggleLi.parentNode.insertBefore(card, toggleLi);
    toggleLi.style.display = 'none';

    var body = card.querySelector('.cl-card-body');

    body.appendChild(commentLi);

    var commentLabel = commentLi.querySelector('.cf-label');
    if (commentLabel) commentLabel.style.display = 'none';

    var textarea = commentLi.querySelector('textarea');
    if (textarea) textarea.setAttribute('placeholder', 'Review comment');

    if (cfg.statusId) {
      var statusLi = document.getElementById(cfg.statusId);
      if (statusLi) {
        var statusLabel = statusLi.querySelector('.cf-label');
        if (statusLabel) statusLabel.style.display = 'none';
        var statusInput = statusLi.querySelector('input');
        if (statusInput) {
          statusInput.setAttribute('readonly', 'readonly');
          var toggleSelect = toggleLi.querySelector('select');
          if (toggleSelect) {
            var syncStatus = function () {
              if (!toggleSelect.value.trim()) return;
              var now  = new Date();
              var yyyy = now.getFullYear();
              var MM   = String(now.getMonth() + 1).padStart(2, '0');
              var dd   = String(now.getDate()).padStart(2, '0');
              var HH   = String(now.getHours()).padStart(2, '0');
              var mm   = String(now.getMinutes()).padStart(2, '0');
              var usernameField = document.getElementById('Field19');
              var username = usernameField ? usernameField.value.trim() : '';
              statusInput.value = 'Reviewed by ' + (username || '—') + ' on ' + yyyy + '-' + MM + '-' + dd + ' ' + HH + ':' + mm;
              statusInput.dispatchEvent(new Event('change', { bubbles: true }));
            };
            toggleSelect.addEventListener('change', syncStatus);
          }
        }
        body.appendChild(statusLi);
      }
    }

    buildAcceptSlider(cfg.toggleId, card.querySelector('.cl-card-toggle-slot'), card);
  }

  /* ── Application Details — accept sliders + progress bar ── */
  var appdetailsCards = [
    { toggleId: 'q161', statusId: 'q165', cardId: 'passport-card',   headerSel: '.pc-header', label: 'Passport Information' },
    { toggleId: 'q162', statusId: 'q166', cardId: 'travel-card',     headerSel: '.tc-header', label: 'Travel & Stay'        },
    { toggleId: 'q163', statusId: 'q167', cardId: 'identity-card',   headerSel: '.ic-header', label: 'Identity & Contact'   },
    { toggleId: 'q164', statusId: 'q168', cardId: 'background-card', headerSel: '.bc-header', label: 'Applicant Background' },
  ];

  function updateAppDetailsNav() {
    var accepted = 0, notAccepted = 0;
    appdetailsCards.forEach(function (cfg) {
      var pill = document.querySelector('.ad-status[data-field="' + cfg.toggleId + '"]');
      var seg  = document.querySelector('.ad-progress-seg[data-field="' + cfg.toggleId + '"]');
      var el   = document.getElementById(cfg.toggleId);
      var sel  = el ? el.querySelector('select') : null;
      var val  = sel ? sel.value.trim() : '';
      if (pill) {
        pill.classList.remove('acceptable', 'not-acceptable');
        var icon = pill.querySelector('.ad-icon');
        if (val === 'Acceptable')     { pill.classList.add('acceptable');     if (icon) icon.textContent = '✓ '; }
        else if (val === 'Not Acceptable') { pill.classList.add('not-acceptable'); if (icon) icon.textContent = '✗ '; }
        else                          { if (icon) icon.textContent = ''; }
      }
      if (seg) {
        seg.classList.remove('acceptable', 'not-acceptable');
        if (val === 'Acceptable')          { seg.classList.add('acceptable');     accepted++; }
        else if (val === 'Not Acceptable') { seg.classList.add('not-acceptable'); notAccepted++; }
      } else {
        if (val === 'Acceptable')          accepted++;
        else if (val === 'Not Acceptable') notAccepted++;
      }
    });
    var counter = document.getElementById('ad-progress-count');
    if (counter) counter.textContent = accepted + ' / ' + appdetailsCards.length + ' Acceptable';
  }

  function initAppDetailsSliders() {
    var pane = document.getElementById('ug-tab-appdetails');
    if (pane && !document.getElementById('ad-subnav')) {
      var nav = document.createElement('div');
      nav.id = 'ad-subnav';
      pane.insertBefore(nav, pane.firstChild);

      appdetailsCards.forEach(function (cfg) {
        var pill = document.createElement('span');
        pill.className = 'ad-status';
        pill.setAttribute('data-field', cfg.toggleId);
        pill.innerHTML = '<span class="ad-icon"></span>' + cfg.label;
        nav.appendChild(pill);
      });

      var barWrap = document.createElement('div');
      barWrap.className = 'ad-progress-wrap';
      barWrap.innerHTML =
        '<div class="ad-progress-bar">' +
          appdetailsCards.map(function (cfg) {
            return '<div class="ad-progress-seg" data-field="' + cfg.toggleId + '" title="' + cfg.label + '"></div>';
          }).join('') +
        '</div>' +
        '<span class="ad-progress-count" id="ad-progress-count">0 / ' + appdetailsCards.length + ' Acceptable</span>';
      pane.insertBefore(barWrap, pane.children[1] || null);
    }

    appdetailsCards.forEach(function (cfg) {
      var card     = document.getElementById(cfg.cardId);
      var toggleLi = document.getElementById(cfg.toggleId);
      var statusLi = document.getElementById(cfg.statusId);
      if (!card || !toggleLi || card.dataset.adInit) return;
      card.dataset.adInit = '1';

      toggleLi.style.setProperty('display', 'none', 'important');
      if (statusLi) statusLi.style.setProperty('display', 'none', 'important');

      var header = card.querySelector(cfg.headerSel);
      var slot   = document.createElement('span');
      slot.className = 'ad-accept-slot';
      if (header) header.appendChild(slot);

      var select      = toggleLi.querySelector('select');
      var statusInput = statusLi ? statusLi.querySelector('input') : null;
      if (select && statusInput) {
        statusInput.setAttribute('readonly', 'readonly');
        var syncStatus = function () {
          if (!select.value.trim()) return;
          var now  = new Date();
          var yyyy = now.getFullYear();
          var MM   = String(now.getMonth() + 1).padStart(2, '0');
          var dd   = String(now.getDate()).padStart(2, '0');
          var HH   = String(now.getHours()).padStart(2, '0');
          var mm   = String(now.getMinutes()).padStart(2, '0');
          var usernameField = document.getElementById('Field19');
          var username = usernameField ? usernameField.value.trim() : '';
          statusInput.value = 'Reviewed by ' + (username || '—') + ' on ' + yyyy + '-' + MM + '-' + dd + ' ' + HH + ':' + mm;
          statusInput.dispatchEvent(new Event('change', { bubbles: true }));
        };
        select.addEventListener('change', syncStatus);
        select.addEventListener('change', updateAppDetailsNav);
      }

      buildAcceptSlider(cfg.toggleId, slot, card);
    });

    updateAppDetailsNav();
  }

  /* ── Check List nav — Acceptable / Not Acceptable states ── */
  var clSections = [
    { fieldId: 'q20', iconId: 'icon-personal'     },
    { fieldId: 'q22', iconId: 'icon-biographic'   },
    { fieldId: 'q24', iconId: 'icon-contact'       },
    { fieldId: 'q25', iconId: 'icon-background'   },
    { fieldId: 'q26', iconId: 'icon-travel'        },
    { fieldId: 'q27', iconId: 'icon-passport'      },
    { fieldId: 'q28', iconId: 'icon-photo'         },
    { fieldId: 'q29', iconId: 'icon-returnticket'  },
  ];

  function updateClNav() {
    clSections.forEach(function (s) {
      var btn  = document.querySelector('.cl-status[data-field="' + s.fieldId + '"]');
      var icon = document.getElementById(s.iconId);
      if (!btn || !icon) return;
      var el  = document.getElementById(s.fieldId);
      var sel = el ? el.querySelector('select') : null;
      var val = sel ? sel.value.trim() : '';
      btn.classList.remove('acceptable', 'not-acceptable');
      if (val === 'Acceptable') {
        btn.classList.add('acceptable');
        icon.textContent = '✓ ';
      } else if (val === 'Not Acceptable') {
        btn.classList.add('not-acceptable');
        icon.textContent = '✗ ';
      } else {
        icon.textContent = '';
      }
    });
  }

  clSections.forEach(function (s) {
    var el  = document.getElementById(s.fieldId);
    var sel = el ? el.querySelector('select') : null;
    if (sel) sel.addEventListener('change', updateClNav);
  });

  /* ── Hidden tab — only visible for PinPointAdmin ───────── */
  function checkAdminTab() {
    var el  = document.getElementById('Field19');
    var btn = document.getElementById('ug-tab-btn-hidden');
    if (!el || !btn) return;
    btn.style.display = (el.value.trim() === 'PinPointAdmin' || el.value.trim() === 'David Welters') ? 'inline-block' : 'none';
  }

  function initAdminTabWatch() {
    var el = document.getElementById('Field19');
    if (el) {
      el.addEventListener('change', checkAdminTab);
      el.addEventListener('input', checkAdminTab);
    }
  }

  /* ── Init ──────────────────────────────────────────────── */
  tryLoop(8);
  setTimeout(checkAdminTab, 600);
  setTimeout(checkAdminTab, 1500);
  setTimeout(initAdminTabWatch, 600);
  /* Deferred refresh covers the initial lookup that fires before the
     'lookupstarted' listener is registered on first page load.      */
  setTimeout(ugOnLookupSettled, 1500);
  setTimeout(ugOnLookupSettled, 3000);

}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function () { setTimeout(ugInitTabs, 500); });
} else {
  setTimeout(ugInitTabs, 500);
}