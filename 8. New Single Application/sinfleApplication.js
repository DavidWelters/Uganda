(function(){
  var _sig = 'SmVhbiBCb3RoYQ==';
  var _iaDocsSetupDone = false;

  var PAGE1 = new Set(['q1','q2','q3','q4','q5','q6']);

  // ── Field groups (sections removed — everything is one list now) ────────
  var PHASE1_FIELDS = ['q1','q2','q3','q4','q5','q6','q7','q8'];  // intro + embed (q8 hidden)
  var NAV_FIELDS    = ['q95','q96'];                             // Checklist + Tab bar (shown in phase 2)
  var HIDDEN_NAV    = ['q93'];                                   // Old StatusBar embed — never shown (Check List replaces it)

  function showEl(id){ var el = document.getElementById(id); if (el) el.style.setProperty('display','block','important'); }
  function hideEl(id){ var el = document.getElementById(id); if (el) el.style.setProperty('display','none','important'); }

  function applyLayout() {
    var q1 = document.getElementById('q1');
    if (!q1) return false;

    // Remove label-left from page 1 fields so labels sit above inputs
    PAGE1.forEach(function(id){
      var el = document.getElementById(id);
      if (el) el.classList.remove('label-left');
    });

    // Make field container flex so we can do column layout
    var container = q1.parentElement;
    container.style.display      = 'flex';
    container.style.flexWrap     = 'wrap';
    container.style.alignItems   = 'flex-end';
    container.style.gap          = '0 12px';
    container.style.paddingLeft  = '48px';
    container.style.paddingRight = '48px';

    function size(id, pct) {
      var el = document.getElementById(id);
      if (!el) return;
      el.style.flex      = '0 0 calc(' + pct + '% - 8px)';
      el.style.width     = 'calc(' + pct + '% - 8px)';
      el.style.boxSizing = 'border-box';
    }

    // Row 1 — three equal columns
    size('q1', 33.33);
    size('q2', 33.33);
    size('q3', 33.33);

    // Row 2 — Purpose of visit + Family application + Group application
    size('q4', 33.33);
    size('q5', 33.33);
    size('q6', 33.33);

    // Hide Cost per person (CSS covers it too)
    hideEl('q8');

    // Phase 1: hide every phase-2 field (nav embeds + all app fields incl. q99)
    NAV_FIELDS.forEach(hideEl);
    HIDDEN_NAV.forEach(hideEl);
    ALL_APP_FIELDS.forEach(hideEl);

    return true;
  }

  var tries = 0;
  var t = setInterval(function(){
    if (applyLayout() || ++tries > 30) clearInterval(t);
  }, 300);

  // ── Tab system — field-based show/hide ──────────────────────────────────
  // ALL_APP_FIELDS = every field toggled by tabs (hidden when its tab isn't active).
  // q95 (CheckList) is excluded — it is permanently visible above the tab bar.
  var ALL_APP_FIELDS = [
    'q10','q11','q12','q13','q14','q15','q16',                              // Personal
    'q22','q23','q24','q25','q26','q27',                                    // Passport
    'q28','q29','q30','q31','q32','q33','q37','q36','q38','q39',            // Identity & Contact
    'q40','q41','q42','q43','q44','q45','q46',                              // Travel & Stay
    'q47','q55','q57','q58','q48','q61','q60','q59',                        // Background
    'q49','q62','q63','q64','q50','q65','q66','q51','q68','q69','q70',
    'q88','q90','q91','q92',                                                // Documents
    'q121','q122','q123','q124','q125',                                     // Payment
    'q99','q85','q76','q80','q79','q78','q75','q53','q52','q56','q67','q86','q98','q82','q84', // Hidden — auth/admin
    'q100','q101','q102','q103','q104','q105','q106','q107','q108','q109',  // Hidden — lookup fields
    'q110','q111','q112','q113','q114','q115','q116','q117','q118','q119','q120'
  ];

  var TAB_DATA = {
    'ia-tab-checklist': [],  // tab removed — checklist is permanently pinned above tab bar
    'ia-tab-data':      [],  // Data tab uses .ia-data-card wrappers — handled in iaShowTab
    'ia-tab-payment':   [],  // Payment tab — handled by iaSetupPaymentTab()
    'ia-tab-documents': ['q88','q90','q92'],
    'ia-tab-hidden': [
      'q99','q85','q76','q80','q79','q78','q75','q53','q52','q56','q67','q86','q98','q82','q84', // auth/admin
      'q100','q101','q102','q103','q104','q105','q106','q107','q108','q109',                      // lookup fields
      'q110','q111','q112','q113','q114','q115','q116','q117','q118','q119','q120',
      'q121','q122','q123','q124','q125'                                                          // payment fields
    ]
  };

  // Background section: 5 Yes/No questions, each with conditional sub-fields shown only when Yes
  var BACKGROUND_GROUPS = [
    { qId: 'q47', radio: 'Field47', subFields: ['q55','q57','q58'] },  // Denied visa  → Country, Date, Reason
    { qId: 'q48', radio: 'Field48', subFields: ['q61','q60','q59'] },  // Deported     → Country, Date, Reason
    { qId: 'q49', radio: 'Field49', subFields: ['q62','q63','q64'] },  // Convicted    → Country, Date, Reason
    { qId: 'q50', radio: 'Field50', subFields: ['q65','q66'] },        // Criminal proceedings → Country, Reason
    { qId: 'q51', radio: 'Field51', subFields: ['q68','q69','q70'] },  // Mental illness → Date, Doctor, Diagnosis
  ];

  // Section cards injected into the Data tab — title/desc match Cognito section headings.
  var DATA_SECTIONS = [
    { id: 'personal',   title: 'Personal information',  desc: 'Personal details of the principal applicant',       fields: ['q10','q11','q12','q13','q14','q15','q16'] },
    { id: 'passport',   title: 'Passport information',  desc: "Details listed on the applicant's passport",        fields: ['q22','q23','q24','q25','q26','q27'] },
    { id: 'identity',   title: 'Identity & Contact',    desc: 'Essential personal records and contact information', fields: ['q28','q29','q30','q31','q32','q33','q37','q36','q38','q39'] },
    { id: 'travel',     title: 'Travel & Stay',         desc: "Overview of applicant's logistics",                 fields: ['q40','q41','q42','q43','q44','q45','q46'] },
    { id: 'background', title: 'Applicant Background',  desc: 'Background information of the applicant',           fields: ['q47','q55','q57','q58','q48','q61','q60','q59','q49','q62','q63','q64','q50','q65','q66','q51','q68','q69','q70'] },
  ];

  function isAdmin() {
    // q99 = Username field; the input may be Field99 or nested inside li#q99
    var el = document.getElementById('Field99');
    var val = el ? (el.value || '') : '';
    if (!val) {
      var li = document.getElementById('q99');
      var inp = li ? li.querySelector('input, textarea') : null;
      if (inp) val = inp.value || '';
    }
    if (val.toLowerCase().indexOf('pinpointadmin') !== -1) return true;
    try {
      if (window.LFForm && LFForm.currentUser) {
        var u = (LFForm.currentUser.username || LFForm.currentUser.login || LFForm.currentUser.email || '').toLowerCase();
        if (u.indexOf('pinpointadmin') !== -1) return true;
      }
    } catch(e) {}
    return false;
  }

  function iaApplyAdminVisibility() {
    var hiddenBtn = document.querySelector('.ia-tab-hidden-btn');
    if (hiddenBtn) hiddenBtn.style.display = isAdmin() ? 'inline-block' : 'none';
  }

  function iaShowTab(tabId) {
    document.querySelectorAll('.ia-tab-btn').forEach(function(b){ b.classList.remove('active'); });
    var btn = document.querySelector('.ia-tab-btn[data-tab="' + tabId + '"]');
    if (btn) btn.classList.add('active');

    // Hide everything
    ALL_APP_FIELDS.forEach(function(id){
      var el = document.getElementById(id);
      if (el) el.style.setProperty('display', 'none', 'important');
    });
    document.querySelectorAll('.ia-data-card').forEach(function(el){
      el.style.setProperty('display', 'none', 'important');
    });

    if (tabId === 'ia-tab-data') {
      // Show cards; also un-hide any field li's inside them that may have been individually hidden
      document.querySelectorAll('.ia-data-card').forEach(function(card){
        card.style.removeProperty('display');
        card.querySelectorAll('li[id^="q"]').forEach(function(li){
          li.style.removeProperty('display');
        });
      });
      window.iaApplyConditionals();
    } else {
      var fields = TAB_DATA[tabId] || [];
      fields.forEach(function(id){
        var el = document.getElementById(id);
        if (el) el.style.setProperty('display', 'block', 'important');
      });
      if (tabId === 'ia-tab-documents') {
        iaSetupDocuments();
        setTimeout(iaSetupDocuments, 2000); // retry after Field84 lookups settle
      }
      if (tabId === 'ia-tab-payment') {
        iaSetupPaymentTab();
      }
    }
  }

  function iaApplyDocConditionals() {
    var q88 = document.getElementById('q88');
    if (!q88) return;
    q88.querySelectorAll('select').forEach(function(sel) {
      var q90li = $(sel).closest('li:not(#q88)')[0];
      if (!q90li) return;
      var q91li = q90li.nextElementSibling;
      if (!q91li) return;
      var q92li = q91li.nextElementSibling;
      // Mandatory labeled rows always keep Other hidden
      if (q90li.classList.contains('ia-doc-labeled')) {
        q91li.style.setProperty('display', 'none', 'important');
        return;
      }
      // Extra rows: show Other only when "Other" is selected in Document Type
      var val = (sel.value || '').trim().toLowerCase();
      var showOther = val && (val === 'other' || val.indexOf('other') !== -1);
      if (showOther) {
        q91li.style.removeProperty('display');
      } else {
        q91li.style.setProperty('display', 'none', 'important');
      }
      // File upload required when any Document Type is selected
      if (q92li) {
        var fInp = q92li.querySelector('input[type="file"]');
        if (fInp) fInp.required = !!val;
      }
    });
  }

  function iaFillDocSelect(sel, docName) {
    if (!sel || sel.tagName !== 'SELECT') return false;
    var doc = docName.trim().toLowerCase();
    sel.value = docName;
    if (sel.value === docName) { try { $(sel).trigger('change'); } catch(e) {} return true; }
    for (var o = 0; o < sel.options.length; o++) {
      var ov = sel.options[o].value.trim().toLowerCase();
      var ot = sel.options[o].text.trim().toLowerCase();
      if (ov === doc || ot === doc || ot.indexOf(doc) !== -1 || doc.indexOf(ot) !== -1) {
        sel.value = sel.options[o].value;
        try { $(sel).trigger('change'); } catch(e) {}
        return true;
      }
    }
    return false;
  }

  function iaSetupDocuments() {
    if (_iaDocsSetupDone) return;

    // Read mandatory document names from the Field84 collection
    var docs = [];
    document.querySelectorAll('input[id^="Field84("]').forEach(function(inp) {
      var val = inp.value.trim();
      if (val) docs.push(val);
    });
    if (!docs.length) return; // Retried via the 2000ms setTimeout in iaShowTab

    _iaDocsSetupDone = true;

    // Add button: <a class="cf-collection-append" data-target="q88">Add</a>
    var addBtn = document.querySelector('.cf-collection-append[data-target="q88"]') ||
                 document.querySelector('a.cf-collection-append');

    // Count rows that already exist; only add what's missing (avoids duplicates on reload)
    var q88elNow = document.getElementById('q88');
    var existingCount = q88elNow ? q88elNow.querySelectorAll('select').length : 0;
    var toAdd = Math.max(0, docs.length - existingCount);
    if (addBtn) {
      for (var r = 0; r < toAdd; r++) { addBtn.click(); }
    }

    // After Cognito renders the rows, label each one via DOM traversal (not ID guessing)
    setTimeout(function() {
      var q88 = document.getElementById('q88');
      if (!q88) return;

      // Hide "Other document type" rows (q91) — skip any li that also has a file input (q92 has hidden text inputs internally)
      q88.querySelectorAll('input[type="text"]').forEach(function(inp) {
        var li = $(inp).closest('li:not(#q88)')[0];
        if (li && !li.querySelector('input[type="file"]')) {
          li.style.setProperty('display', 'none', 'important');
        }
      });

      // All Document Type selects in DOM order — one per collection row
      var typeSelects = Array.prototype.slice.call(q88.querySelectorAll('select'));

      docs.forEach(function(docName, idx) {
        var sel = typeSelects[idx];
        if (!sel) return;

        // Fill the select value for form submission
        iaFillDocSelect(sel, docName);

        // Find the row's li container (not q88 itself)
        var li = $(sel).closest('li:not(#q88)')[0];
        if (!li || li.querySelector('.ia-doc-label')) return;

        // CSS class hides all direct children except .ia-doc-label
        li.classList.add('ia-doc-labeled');
        li.style.setProperty('display', 'block', 'important');

        var lbl = document.createElement('div');
        lbl.className = 'ia-doc-label';
        lbl.innerHTML =
          '<span class="ia-doc-label-name">' + docName + '</span>' +
          '<span class="ia-doc-label-status ia-doc-status-pending">✕ Pending</span>';
        li.insertBefore(lbl, li.firstChild);

        // Mark file upload as required for every mandatory document
        var q91Sib = li.nextElementSibling;
        var q92Sib = q91Sib ? q91Sib.nextElementSibling : null;
        if (q92Sib) {
          q92Sib.classList.add('ia-mandatory-upload');
          var fInp = q92Sib.querySelector('input[type="file"]');
          if (fInp) fInp.required = true;
        }
      });

      // Ensure every file upload row (q92) is visible — Cognito embeds hidden text inputs inside
      // q92 which caused our text-input hiding loop to inadvertently hide it
      typeSelects.forEach(function(sel) {
        var q90li = $(sel).closest('li:not(#q88)')[0];
        if (!q90li) return;
        var q91li = q90li.nextElementSibling;
        var q92li = q91li ? q91li.nextElementSibling : null;
        if (q92li) q92li.style.setProperty('display', 'block', 'important');
      });

      // Watch for new rows and file upload DOM changes — re-evaluate state
      if (!q88._iaMutObs) {
        q88._iaMutObs = new MutationObserver(function() {
          // Disconnect first — our own DOM updates (badge text, classes inside q88)
          // would re-trigger this observer, causing an infinite loop.
          q88._iaMutObs.disconnect();
          q88.querySelectorAll('input[type="text"]').forEach(function(inp) {
            var rowLi = $(inp).closest('li:not(#q88)')[0];
            if (rowLi && !rowLi.style.display && !rowLi.querySelector('input[type="file"]')) {
              rowLi.style.setProperty('display', 'none', 'important');
            }
          });
          iaApplyDocConditionals();
          if (typeof window.iaUpdateStatus === 'function') window.iaUpdateStatus();
          // Re-attach to keep watching for new rows / real upload changes
          q88._iaMutObs.observe(q88, { childList: true, subtree: true });
        });
        q88._iaMutObs.observe(q88, { childList: true, subtree: true });
      }
    }, 1000);
  }

  function iaSetupPaymentTab() {
    var q121 = document.getElementById('q121');
    if (!q121) return;

    // Payment fields (q121-q125) are edited via the Hidden tab — keep hidden here
    ['q121','q122','q123','q124','q125'].forEach(hideEl);

    var wrap = document.getElementById('ia-payment-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'ia-payment-wrap';
      q121.parentNode.insertBefore(wrap, q121);
    }

    function fv(id) {
      var el = document.getElementById(id);
      return el ? (el.value || '').trim() : '';
    }
    function selText(id) {
      var el = document.getElementById(id);
      if (!el || el.tagName !== 'SELECT') return '';
      var opt = el.options[el.selectedIndex];
      return opt ? opt.text.trim() : '';
    }

    var applicant   = [fv('Field10'), fv('Field11')].filter(Boolean).join(' ') || '—';
    var visaCost    = (function() {
      var el = document.getElementById('Field8') || (function(){ var li = document.getElementById('q8'); return li ? li.querySelector('input') : null; })();
      return el ? (el.value || '').trim() : '';
    })();
    var payStatus   = fv('Field122');
    var submittedOn = fv('Field123');
    var receivedOn  = fv('Field124');
    var txnFailed   = (function() {
      var li = document.getElementById('q125');
      if (!li) return false;
      var checked = li.querySelector('input[type="checkbox"]:checked');
      if (!checked) return false;
      var v = (checked.value || '').trim().toLowerCase();
      return v === 'yes' || v === '1' || v === 'true';
    })();

    var appType  = selText('Field1') || '—';
    var category = selText('Field2') || '—';
    var subcat   = selText('Field3') || '—';

    var sl = payStatus.toLowerCase();
    var icon, iCls;
    if (!payStatus || sl.indexOf('outstanding')   !== -1) { icon = '✕'; iCls = 'ia-pay-x'; }
    else if (sl.indexOf('received')    !== -1)            { icon = '✓'; iCls = 'ia-pay-received'; }
    else if (sl.indexOf('submitted')   !== -1)            { icon = '✓'; iCls = 'ia-pay-submitted'; }
    else if (sl.indexOf('exempt')      !== -1)            { icon = '—'; iCls = 'ia-pay-exempt'; }
    else if (sl.indexOf('unsuccessful') !== -1)           { icon = 'ⓘ'; iCls = 'ia-pay-fail'; }
    else                                                  { icon = '✕'; iCls = 'ia-pay-x'; }

    var cost = visaCost ? '$ ' + parseFloat(visaCost).toFixed(2) : '—';

    wrap.innerHTML =
      '<div class="ia-pay-summary-header">' +
        '<strong class="ia-pay-title">PAYMENT SUMMARY</strong>' +
        '<div class="ia-pay-badges">' +
          '<span class="ia-pay-badge">' + appType  + '<em>Apply for a new</em></span>' +
          '<span class="ia-pay-badge">' + category + '<em>Category</em></span>' +
          '<span class="ia-pay-badge">' + subcat   + '<em>Sub-Category</em></span>' +
        '</div>' +
      '</div>' +
      '<table class="ia-pay-table">' +
        '<thead><tr>' +
          '<th>Applicants</th><th>Payment</th><th>Visa Cost</th>' +
          '<th>Payment submitted on</th><th>Payment received on</th>' +
          '<th>Transaction unsuccessful</th><th></th>' +
        '</tr></thead>' +
        '<tbody><tr>' +
          '<td>' + applicant + '</td>' +
          '<td><span class="ia-pay-icon ' + iCls + '">' + icon + '</span></td>' +
          '<td>' + cost + '</td>' +
          '<td>' + (submittedOn || '') + '</td>' +
          '<td>' + (receivedOn  || '') + '</td>' +
          '<td>' + (txnFailed ? '<span class="ia-pay-icon ia-pay-fail">ⓘ</span>' : '') + '</td>' +
          '<td><button type="button" class="ia-pay-btn">Pay</button></td>' +
        '</tr></tbody>' +
      '</table>' +
      '<div class="ia-pay-legend">' +
        '<span><span class="ia-pay-icon ia-pay-x">✕</span> Payment outstanding</span>' +
        '<span><span class="ia-pay-icon ia-pay-submitted">✓</span> Payment submitted</span>' +
        '<span><span class="ia-pay-icon ia-pay-received">✓</span> Payment received</span>' +
        '<span><span class="ia-pay-icon ia-pay-exempt">—</span> Exempt from payment</span>' +
        '<span><span class="ia-pay-icon ia-pay-fail">ⓘ</span> Transaction was unsuccessful</span>' +
      '</div>';
  }

  function injectSectionCards() {
    DATA_SECTIONS.forEach(function(sec) {
      if (document.getElementById('ia-card-' + sec.id)) return;
      var firstEl = document.getElementById(sec.fields[0]);
      if (!firstEl) return;
      var parent = firstEl.parentNode;

      var card = document.createElement('div');
      card.id = 'ia-card-' + sec.id;
      card.className = 'ia-data-card';

      var left = document.createElement('div');
      left.className = 'ia-card-left';
      left.innerHTML =
        '<strong class="ia-card-title">' + sec.title + '</strong>' +
        '<span class="ia-card-desc">' + sec.desc + '</span>';

      var right = document.createElement('div');
      right.className = 'ia-card-right';

      card.appendChild(left);
      card.appendChild(right);

      // Insert card into DOM while firstEl is still a child of parent, THEN move fields
      parent.insertBefore(card, firstEl);

      if (sec.id === 'background') {
        // Stacked layout: each radio question + its sub-fields in their own group div
        BACKGROUND_GROUPS.forEach(function(bg) {
          var group = document.createElement('div');
          group.className = 'ia-bg-group';

          var radioEl = document.getElementById(bg.qId);
          if (radioEl) group.appendChild(radioEl);

          var sub = document.createElement('div');
          sub.className = 'ia-bg-sub';
          bg.subFields.forEach(function(qId) {
            var el = document.getElementById(qId);
            if (el) sub.appendChild(el);
          });
          group.appendChild(sub);
          right.appendChild(group);
        });
      } else {
        sec.fields.forEach(function(qId){
          var el = document.getElementById(qId);
          if (el) right.appendChild(el);
        });
      }

      var confirmRow = document.createElement('div');
      confirmRow.className = 'ia-confirm-row';
      confirmRow.innerHTML =
        '<button type="button" class="ia-confirm-btn" onclick="iaConfirmSection(\'' + sec.id + '\')">' +
        'All information in this section is correct' +
        '</button>';
      right.appendChild(confirmRow);
    });
  }

  window.iaConfirmSection = function(sectionId) {
    var card = document.getElementById('ia-card-' + sectionId);
    if (!card) return;
    card.classList.add('ia-card-locked');
    var confirmRow = card.querySelector('.ia-confirm-row');
    if (confirmRow) {
      confirmRow.innerHTML =
        '<span class="ia-confirmed-label">' +
          '<span class="ia-confirmed-tick">✓</span> Section confirmed' +
          ' — <button type="button" class="ia-unlock-btn" onclick="iaUnlockSection(\'' + sectionId + '\')">Edit</button>' +
        '</span>';
    }
    window.iaUpdateStatus();
  };

  // ── Conditional field visibility — re-run whenever Data tab is shown or a trigger field changes ──
  window.iaApplyConditionals = function() {
    // #1 Name of Spouse (q16): only visible when Marital Status is Married or Other
    var f15 = document.getElementById('Field15');
    var marital = f15 ? f15.value.trim().toLowerCase() : '';
    var showSpouse = marital.indexOf('married') !== -1 || marital.indexOf('other') !== -1;
    var q16 = document.getElementById('q16');
    if (q16) {
      if (showSpouse) q16.style.removeProperty('display');
      else q16.style.setProperty('display', 'none', 'important');
    }

    // #5 Other Nationality (q32): only visible when Dual Nationality = Yes
    var dualChecked = document.querySelector('.dualNationality input:checked');
    var dualVal = dualChecked ? dualChecked.value.trim() : '';
    var showOtherNat = dualVal === 'Yes';
    var q32 = document.getElementById('q32');
    if (q32) {
      if (showOtherNat) q32.style.removeProperty('display');
      else q32.style.setProperty('display', 'none', 'important');
    }

    // #6 Background sub-fields: hidden unless parent radio = Yes
    BACKGROUND_GROUPS.forEach(function(bg) {
      var checked = document.querySelector('input[name="' + bg.radio + '"]:checked');
      var isYes = checked && checked.value.trim().toLowerCase() === 'yes';
      bg.subFields.forEach(function(qId) {
        var el = document.getElementById(qId);
        if (el) {
          if (isYes) el.style.removeProperty('display');
          else el.style.setProperty('display', 'none', 'important');
        }
      });
    });

    // Nationality match validation — Other Nationality cannot equal Nationality (q14)
    var f14 = document.getElementById('Field14');
    var f32 = document.getElementById('Field32');
    var nat1 = f14 ? f14.value.trim() : '';
    var nat2 = f32 ? f32.value.trim() : '';
    var warn = document.getElementById('ia-nat-warning');
    if (!warn && q32) {
      warn = document.createElement('div');
      warn.id = 'ia-nat-warning';
      warn.style.cssText = 'color:#c00;font-size:12px;margin-top:4px;font-family:Arial,sans-serif;display:none;';
      warn.textContent = 'Other Nationality cannot be the same as Nationality.';
      q32.appendChild(warn);
    }
    if (warn) {
      warn.style.display = (showOtherNat && nat1 && nat2 && nat1 === nat2) ? 'block' : 'none';
    }
  };

  window.iaUnlockSection = function(sectionId) {
    var card = document.getElementById('ia-card-' + sectionId);
    if (!card) return;
    card.classList.remove('ia-card-locked');
    var confirmRow = card.querySelector('.ia-confirm-row');
    if (confirmRow) {
      confirmRow.innerHTML =
        '<button type="button" class="ia-confirm-btn" onclick="iaConfirmSection(\'' + sectionId + '\')">' +
        'All information in this section is correct' +
        '</button>';
    }
    window.iaUpdateStatus();
  };

  window.iaInitTabs = function() {
    injectSectionCards();
    // Hidden tab only visible for PinPointAdmin — re-check for ~15s in case
    // the Username field is populated by a lookup after Phase 2 loads
    iaApplyAdminVisibility();
    var adminTries = 0;
    var adminTimer = setInterval(function(){
      iaApplyAdminVisibility();
      if (isAdmin() || ++adminTries >= 30) clearInterval(adminTimer);
    }, 500);

    if (!window._iaTabsInited) {
      window._iaTabsInited = true;
      document.addEventListener('click', function(e){
        var btn = e.target.closest('.ia-tab-btn');
        if (!btn) return;
        iaShowTab(btn.getAttribute('data-tab'));
      });
      // Live-refresh the Check List + pills as fields are filled
      document.addEventListener('input',  function(){ window.iaUpdateStatus(); });
      document.addEventListener('change', function(){ window.iaUpdateStatus(); });
      $(document).on('change', '#q88 select', function() { iaApplyDocConditionals(); });
    }
    // Establish the default tab (Data — Check List tab is removed)
    iaShowTab('ia-tab-data');
  };

  // ── Segmented nav: click a segment → go to that section ────────────────
  function iaNavToSection(idx) {
    var sec = IA_SECTIONS[idx];
    if (!sec) return;
    // Mark the clicked segment active; clear others
    document.querySelectorAll('.ia-seg').forEach(function(s){ s.classList.remove('active'); });
    var allSegs = document.querySelectorAll('.ia-seg:not(.ia-seg-doc)');
    if (allSegs[idx]) allSegs[idx].classList.add('active');
    // Navigate
    if (sec.cardId) {
      iaShowTab('ia-tab-data');
      setTimeout(function() {
        var card = document.getElementById('ia-card-' + sec.cardId);
        if (!card) return;
        var stickyBar = document.getElementById('q95');
        var barH = stickyBar ? stickyBar.getBoundingClientRect().height : 0;
        var top = card.getBoundingClientRect().top + window.pageYOffset - barH - 8;
        window.scrollTo({ top: top, behavior: 'smooth' });
      }, 150);
    } else {
      iaShowTab('ia-tab-documents');
    }
  }

  // ── Phase 2 reveal — called from naConfirmGo() ──────────────────────────
  window.iaEnterPhase2 = function() {
    // Revert the flex grid so phase-2 fields stack full width (intro is hidden)
    var q1 = document.getElementById('q1');
    if (q1 && q1.parentElement) {
      var c = q1.parentElement;
      c.style.display      = 'block';
      c.style.paddingLeft  = '';
      c.style.paddingRight = '';
    }

    // Hide the phase-1 intro fields + embed, and the retired StatusBar embed
    PHASE1_FIELDS.forEach(hideEl);
    HIDDEN_NAV.forEach(hideEl);

    // Show the tab bar
    NAV_FIELDS.forEach(showEl);

    var q95 = document.getElementById('q95');
    var q96 = document.getElementById('q96');

    // Inject the header bar before the Tab bar (q96), only once
    if (!document.getElementById('ia-header-bar') && q96 && q96.parentNode) {
      var hb = document.createElement('div');
      hb.id  = 'ia-header-bar';
      hb.innerHTML =
        '<div class="hb-left">' +
          '<span class="hb-id" id="ia-hb-app-id">—</span>' +
          '<span class="hb-label">Application ID</span>' +
        '</div>' +
        '<div class="hb-right">' +
          '<div class="hb-badges"><span class="hb-badge blue" id="ia-hb-status">—</span></div>' +
          '<span class="hb-created">Created on: <span id="ia-hb-created">—</span></span>' +
        '</div>';
      q96.parentNode.insertBefore(hb, q96);
    }

    // Pin checklist (q95) between header bar and tab bar, always visible
    if (q96 && q95 && q96.parentNode && q95.nextSibling !== q96) {
      q96.parentNode.insertBefore(q95, q96);
    }
    showEl('q95');

    // Inject segmented progress/nav strip into q95 (below the pills)
    if (!document.getElementById('ia-progress-strip') && q95) {
      var strip = document.createElement('div');
      strip.id = 'ia-progress-strip';
      strip.innerHTML = IA_SECTIONS.filter(function(s){ return s.seg !== false; }).map(function(s, i) {
        return '<div class="ia-seg incomplete" data-idx="' + i + '">' +
               '<div class="ia-seg-bar"></div>' +
               '<span class="ia-seg-label">' + s.label + '</span>' +
               '</div>';
      }).join('');
      strip.addEventListener('click', function(e) {
        var seg = e.target.closest('.ia-seg');
        if (!seg) return;
        iaNavToSection(parseInt(seg.getAttribute('data-idx'), 10));
      });
      q95.appendChild(strip);
    }

    // Show the Cognito submit button (was hidden in phase 1 by CSS)
    var submitWrap = document.querySelector('.btn-wrapper');
    if (submitWrap) submitWrap.style.setProperty('display', 'block', 'important');

    // Initialise tabs (sets Check List active), status pills, header
    window.iaInitTabs();
    window.iaUpdateStatus();
    window.iaUpdateHeader();
  };

  // ── Check List updates (q95) ──────────────────────────────────────────────
  // Each section drives one Check List item (icon id matches #ia-cl-subnav)
  var IA_SECTIONS = [
    { iconId: 'ia-icon-personal',   cardId: 'personal',   label: 'Personal',   fields: ['Field10','Field11','Field12','Field13','Field14'] },
    { iconId: 'ia-icon-passport',   cardId: 'passport',   label: 'Passport',   fields: ['Field22','Field23','Field24','Field26','Field27'] },
    { iconId: 'ia-icon-identity',   cardId: 'identity',   label: 'Identity',   fields: ['Field28','Field33','Field36','Field38','Field39'] },
    { iconId: 'ia-icon-travel',     cardId: 'travel',     label: 'Travel',     fields: ['Field42','Field44','Field45','Field46'] },
    { iconId: 'ia-icon-background', cardId: 'background', label: 'Background', fields: ['Field47-0','Field48-0','Field49-0','Field50-0','Field51-0'] },
    { iconId: 'ia-icon-documents',  cardId: null,         label: 'Documents',  seg: false, fields: ['Field90','Field92'] },
  ];

  function iaIsFilled(id) {
    var el = document.getElementById(id);
    if (!el) return false;
    if (el.type === 'radio' || el.type === 'checkbox') return !!document.querySelector('[name="'+el.name+'"]:checked');
    return el.value.trim() !== '';
  }

  function iaSetState(el, complete) {
    if (!el) return;
    el.classList.remove('complete','incomplete');
    el.classList.add(complete ? 'complete' : 'incomplete');
  }

  function iaHasUpload(rowIdx) {
    var q88 = document.getElementById('q88');
    if (!q88) return false;
    var sel = q88.querySelectorAll('select')[rowIdx];
    if (!sel) return false;
    var q90li = $(sel).closest('li:not(#q88)')[0];
    if (!q90li) return false;
    var q91li = q90li.nextElementSibling;
    var q92li = q91li ? q91li.nextElementSibling : null;
    if (!q92li) return false;
    var fileInp = q92li.querySelector('input[type="file"]');
    if (fileInp && fileInp.files && fileInp.files.length > 0) return true;
    // Cognito adds file links after upload — any anchor whose text looks like a filename
    var anchors = q92li.querySelectorAll('a');
    for (var i = 0; i < anchors.length; i++) {
      var text = (anchors[i].textContent || '').trim();
      if (text && text.indexOf('.') !== -1) return true;
      var href = anchors[i].getAttribute('href') || '';
      if (href && href !== '#' && href.indexOf('javascript') === -1) return true;
    }
    if (q92li.querySelector('.cf-file-item,.cf-upload-item,.lf-file-row,[class*="file-name"],[class*="fileupload-item"]')) return true;
    return false;
  }

  // Append each mandatory document (Field84 collection) as its own Check List item
  function iaBuildDocChecklist() {
    var nav   = document.getElementById('ia-cl-subnav');
    var strip = document.getElementById('ia-progress-strip');

    // Clear old doc entries from both pill nav and segment strip
    if (nav)   nav.querySelectorAll('.ia-cl-doc').forEach(function(p){ p.parentNode.removeChild(p); });
    if (strip) strip.querySelectorAll('.ia-seg-doc').forEach(function(s){ s.parentNode.removeChild(s); });

    var rowIdx = 0;
    document.querySelectorAll('input[id^="Field84("]').forEach(function(inp){
      var val = inp.value.trim();
      if (!val) return;
      var uploaded = iaHasUpload(rowIdx);
      var rIdx = rowIdx; // capture for closures

      // Pill — clickable, navigates to Documents tab
      if (nav) {
        var item = document.createElement('span');
        item.className = 'ia-cl-status ia-cl-doc ' + (uploaded ? 'complete' : 'incomplete');
        item.innerHTML = '<span class="ia-cl-icon">' + (uploaded ? '✓' : '✕') + '</span>' + val;
        nav.appendChild(item);
      }

      // Sync Pending/Uploaded badge on the label card row
      var docLbl = document.querySelectorAll('.ia-doc-label')[rIdx];
      if (docLbl) {
        var badge = docLbl.querySelector('.ia-doc-label-status');
        if (badge) {
          badge.textContent = uploaded ? '✓ Uploaded' : '✕ Pending';
          badge.className = 'ia-doc-label-status ' + (uploaded ? 'ia-doc-status-uploaded' : 'ia-doc-status-pending');
        }
      }

      // Segment — clickable, marks active + navigates to Documents tab
      if (strip) {
        var seg = document.createElement('div');
        seg.className = 'ia-seg ia-seg-doc ' + (uploaded ? 'complete' : 'incomplete');
        seg.innerHTML = '<div class="ia-seg-bar"></div><span class="ia-seg-label">' + val + '</span>';
        seg.addEventListener('click', function(){
          document.querySelectorAll('.ia-seg').forEach(function(s){ s.classList.remove('active'); });
          seg.classList.add('active');
          iaShowTab('ia-tab-documents');
          // Scroll to the matching document upload row
          setTimeout(function() {
            var labels = document.querySelectorAll('.ia-doc-label');
            for (var l = 0; l < labels.length; l++) {
              var nameSpan = labels[l].querySelector('.ia-doc-label-name');
              var labelText = nameSpan ? nameSpan.textContent.trim() : labels[l].textContent.trim();
              if (labelText === val) {
                var target = labels[l].parentNode;  // li.ia-doc-labeled (the label row)
                var barH   = (document.getElementById('q95') || {getBoundingClientRect: function(){ return {height:0}; }}).getBoundingClientRect().height;
                window.scrollTo({ top: target.getBoundingClientRect().top + window.pageYOffset - barH - 8, behavior: 'smooth' });
                target.style.transition = 'background 0.3s';
                target.style.background = '#fff8e1';
                setTimeout(function(){ target.style.background = ''; }, 1400);
                break;
              }
            }
          }, 200);
        });
        strip.appendChild(seg);
      }

      rowIdx++;
    });
  }

  // ── Header Bar (field IDs to be confirmed) ──────────────────────────────
  window.iaUpdateHeader = function() {
    function getVal(id) {
      var el = document.getElementById(id);
      if (!el) return '';
      var inp = el.querySelector('input, select, textarea');
      return inp ? inp.value.trim() : '';
    }
    function badgeClass(val) {
      var v = (val || '').toLowerCase();
      if (v.includes('processing'))                       return 'purple';
      if (v.includes('waiting') || v.includes('pending')) return 'amber';
      if (v.includes('approved') || v.includes('complete')) return 'green';
      if (v.includes('reject') || v.includes('denied'))  return 'red';
      return 'blue';
    }
    var appId   = getVal('q78') || '—';   // Field78 — Application ID
    var status  = getVal('q80') || '—';   // Field80 — Application status
    var created = getVal('q76') || '—';   // Field76 — Created on date

    var idEl  = document.getElementById('ia-hb-app-id');
    var stEl  = document.getElementById('ia-hb-status');
    var crEl  = document.getElementById('ia-hb-created');
    if (idEl) idEl.textContent = appId;
    if (crEl) crEl.textContent = created;
    if (stEl) { stEl.textContent = status; stEl.className = 'hb-badge ' + badgeClass(status); }
  };

  window.iaUpdateStatus = function() {
    var completeCount = 0;
    var allSegs = document.querySelectorAll('.ia-seg:not(.ia-seg-doc)');
    IA_SECTIONS.forEach(function(s, i){
      var complete;
      if (s.cardId) {
        // Section is complete only when the confirm button has been clicked
        var card = document.getElementById('ia-card-' + s.cardId);
        complete = !!(card && card.classList.contains('ia-card-locked'));
      } else {
        // Documents: complete only when every mandatory document has been uploaded
        var dIdx = 0, dCount = 0, allUp = true;
        document.querySelectorAll('input[id^="Field84("]').forEach(function(inp) {
          var v = inp.value.trim();
          if (!v) return;
          dCount++;
          if (!iaHasUpload(dIdx)) allUp = false;
          dIdx++;
        });
        complete = dCount > 0 && allUp;
      }

      if (complete) completeCount++;

      var clIcon = document.getElementById(s.iconId);
      if (clIcon) {
        var clItem = clIcon.parentNode;
        iaSetState(clItem, complete);
        clIcon.textContent = complete ? '✓' : '✕';
      }

      // Update segment colour (active class is preserved — set by iaNavToSection)
      if (allSegs[i]) {
        allSegs[i].classList.remove('complete', 'incomplete');
        allSegs[i].classList.add(complete ? 'complete' : 'incomplete');
      }
    });
    iaBuildDocChecklist();

    // Gate the submit button — disabled until all sections are green
    var allComplete = completeCount === IA_SECTIONS.length;
    var submitBtn = document.querySelector('.btn-wrapper input[type="submit"], .btn-wrapper button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = !allComplete;
      submitBtn.title = allComplete ? '' : 'Complete all sections before submitting';
      submitBtn.classList.toggle('ia-submit-locked', !allComplete);
    }
  };
})();

$(document).ready(function(){
    /* ── Passport Number injection ───────────────────────────────────────── */
    var url    = new URL(window.location.href);   
    var sessionToken = url.searchParams.get('session');
    var type  = url.searchParams.get('type');
    var category = url.searchParams.get('category');
    var subcategory = url.searchParams.get('subcategory');
    var purpose = url.searchParams.get('purpose');
    var family = url.searchParams.get('family');
    var group = url.searchParams.get('group');

    console.log('URL params:', { sessionToken, type, category, subcategory, purpose, family, group });

    if (sessionToken) {
        setTimeout(function () {
            $('.sessionToken input').val(sessionToken).change();
        }, 2000);
    }
       
    if (type) {
        setTimeout(function () {
            var $sel = $('.type select');
            if ($sel.find('option[value="' + type + '"]').length === 0) {
                $sel.append($('<option>', { value: type, text: type }));
            }
            $sel.val(type).attr('readonly', true);
        }, 1000);
    }

    if (category) {
        setTimeout(function () {
            var $sel = $('.category select');
            if ($sel.find('option[value="' + category + '"]').length === 0) {
                $sel.append($('<option>', { value: category, text: category }));
            }
            $sel.val(category).attr('readonly', true);
        }, 1000);
    }

    if (subcategory) {
        setTimeout(function () {
            var $sel = $('.subcategory select');
            if ($sel.find('option[value="' + subcategory + '"]').length === 0) {
                $sel.append($('<option>', { value: subcategory, text: subcategory }));
            }
            $sel.val(subcategory).change().attr('readonly', true);
        }, 1000);
    }
    
    if (purpose) {
        setTimeout(function () {
            var $sel = $('.purpose select');
            if ($sel.find('option[value="' + purpose + '"]').length === 0) {
                $sel.append($('<option>', { value: purpose, text: purpose }));
            }
            $sel.val(purpose).change().attr('readonly', true);
        }, 1000);
    }
    
    if (family) {
        setTimeout(function () {
            $('.family input[type="checkbox"]').val(['Family_application']).change().attr('readonly', true);
        }, 1000);
    }
    
    if (group) {
        setTimeout(function () {
            $('.group input[type="checkbox"]').val(['Group_application']).change().attr('readonly', true);
        }, 1000);
    }
});

$(document).on('change', '.genderLookup input', function () {
    let val = $(this).val().trim();
    setTimeout(function () {
        $('.gender select').val(val).trigger('change');
    }, 2000);
});

$(document).on('change', '.nationalityLookup input', function () {
    let val = $(this).val().trim();
    setTimeout(function () {
        $('.nationality select').val(val).trigger('change');
    }, 2000);
});

$(document).on('change', '.maritalStatusLookup input', function () {
    let val = $(this).val().trim();
    setTimeout(function () {
        $('.maritalStatus select').val(val).trigger('change');
    }, 2000);
});

$(document).on('change', '.maritalStatus select, #Field15', function () {
    var activeTab = document.querySelector('.ia-tab-btn.active');
    if (activeTab && activeTab.getAttribute('data-tab') === 'ia-tab-data') {
        window.iaApplyConditionals();
    }
});

$(document).on('change', '.dualNationality input', function () {
    var activeTab = document.querySelector('.ia-tab-btn.active');
    if (activeTab && activeTab.getAttribute('data-tab') === 'ia-tab-data') {
        window.iaApplyConditionals();
    }
});

$(document).on('change', '.nationality select, .otherNationality select', function () {
    var activeTab = document.querySelector('.ia-tab-btn.active');
    if (activeTab && activeTab.getAttribute('data-tab') === 'ia-tab-data') {
        window.iaApplyConditionals();
    }
});

$(document).on('change', 'li#q47 input, li#q48 input, li#q49 input, li#q50 input, li#q51 input', function () {
    var activeTab = document.querySelector('.ia-tab-btn.active');
    if (activeTab && activeTab.getAttribute('data-tab') === 'ia-tab-data') {
        window.iaApplyConditionals();
    }
});

$(document).on('change', '.passportTypeLookup input', function () {
    let val = $(this).val().trim();
    setTimeout(function () {
        $('.passportType select').val(val).trigger('change');
    }, 2000);
});

$(document).on('change', '.countryOfBirthLookup input', function () {
    let val = $(this).val().trim();
    setTimeout(function () {
        $('.countryOfBirth select').val(val).trigger('change');
    }, 2000);
});

$(document).on('change', '.immigrationStatusLookup input', function () {
    let val = $(this).val().trim();
    setTimeout(function () {
        $('.immigrationStatus select').val(val).trigger('change');
    }, 2000);
});

$(document).on('change', '.otherNationalityLookup input', function () {
    let val = $(this).val().trim();
    setTimeout(function () {
        $('.otherNationality select').val(val).trigger('change');
    }, 2000);
});

$(document).on('change', '.countryOfResidenceLookup input', function () {
    let val = $(this).val().trim();
    setTimeout(function () {
        $('.countryOfResidence select').val(val).trigger('change');
    }, 2000);
});

$(document).on('change', '.countryOfPhoneNumberLookup input', function () {
    let val = $(this).val().trim();
    setTimeout(function () {
        $('.countryOfPhoneNumber select').val(val).trigger('change');
    }, 2000);
});

// li#q90 select change handler removed — Document Type is a hidden pre-filled label

$(document).on('change', '.dualNationalityRadioLookup input', function () {
    let val = $(this).val().trim();
    setTimeout(function () {
        $('.dualNationality input[value="' + val + '"]').prop('checked', true).trigger('change');
    }, 2000);
});

// ── Purpose of Visit: sync q4 (dropdown) → q43 (text, read-only) ────────
function iaSyncPurposeOfVisit() {
    var sel = document.getElementById('Field4');
    var inp = document.getElementById('Field43');
    if (!sel || !inp) return;
    var opt = sel.options[sel.selectedIndex];
    var text = (opt ? opt.text.trim() : '') || sel.value.trim();
    if (text) {
        inp.value = text;
        inp.readOnly = true;
        try { $(inp).trigger('change'); } catch(e) {}
    }
}

$(document).on('change', 'li#q4 select, #Field4', function() {
    iaSyncPurposeOfVisit();
});

$(document).ready(function() {
    [500, 2000, 5000].forEach(function(d) {
        setTimeout(iaSyncPurposeOfVisit, d);
    });
});

// ── Travel: Date of Arrival / Date of Return → Duration of Stay ──────────
function iaCalcDuration() {
    var arrInp = document.querySelector('li#q44 input');
    var retInp = document.querySelector('li#q45 input');
    var durInp = document.getElementById('Field46');
    if (!arrInp || !retInp) return;

    var arrVal = arrInp.value.trim();
    var retVal = retInp.value.trim();

    // Inject error element once, inside li#q45
    var errEl = document.getElementById('ia-date-range-err');
    if (!errEl) {
        errEl = document.createElement('div');
        errEl.id = 'ia-date-range-err';
        errEl.className = 'ia-date-range-err';
        var q45li = document.getElementById('q45');
        if (q45li) q45li.appendChild(errEl);
    }

    // Keep the date picker from allowing return before arrival
    if (arrVal) retInp.setAttribute('min', arrVal);

    if (!arrVal || !retVal) {
        errEl.style.display = 'none';
        return;
    }

    var arrDate = new Date(arrVal);
    var retDate = new Date(retVal);
    if (isNaN(arrDate.getTime()) || isNaN(retDate.getTime())) {
        errEl.style.display = 'none';
        return;
    }

    if (retDate <= arrDate) {
        errEl.textContent = 'Date of Return must be after Date of Arrival';
        errEl.style.display = 'block';
        if (durInp) { durInp.value = ''; $(durInp).trigger('change'); }
        return;
    }

    errEl.style.display = 'none';

    var days = Math.round((retDate - arrDate) / 86400000);
    if (durInp) {
        durInp.value = days;
        durInp.readOnly = true;
        $(durInp).trigger('change');
    }
}

$(document).on('change', 'li#q44 input, li#q45 input', function () {
    iaCalcDuration();
});

// Run on load to handle pre-populated dates
$(document).ready(function () {
    setTimeout(iaCalcDuration, 2000);
});

// ── Exempt Status notice + cost zero ─────────────────────────────────────
function iaGetExemptStatus() {
    var el = document.getElementById('Field98');
    if (!el) {
        var li = document.getElementById('q98');
        el = li ? li.querySelector('input, textarea') : null;
    }
    var v = el ? (el.value || '').trim().toLowerCase() : '';
    return v === 'true' || v === 'yes' || v === '1';
}

function iaSelText(id) {
    var el = document.getElementById(id);
    if (!el) return '';
    if (el.tagName === 'SELECT') {
        var opt = el.options[el.selectedIndex];
        return (opt ? opt.text.trim() : '') || '';
    }
    return (el.value || '').trim();
}

function iaUpdateExemptNotice() {
    // #na-notice lives inside the q7 embed (same DOM) — hide/show it directly
    var notice = document.getElementById('na-notice');
    if (!notice) return;

    var isExempt = iaGetExemptStatus();

    if (!isExempt) {
        notice.style.setProperty('display', 'none', 'important');
        return;
    }

    var country = iaSelText('Field14') || '—';
    var subcat  = iaSelText('Field3')  || '—';
    var appType = iaSelText('Field1')  || '—';

    notice.innerHTML =
        'Passport holders from <strong>' + country + '</strong> do not have to apply for a ' +
        '<strong>' + subcat + '</strong> <strong>' + appType + '</strong>.<br>' +
        'Continue only if you have minor dependents that are not Passport holders from ' +
        '<strong>' + country + '</strong>.';

    notice.style.removeProperty('display');
}

function iaApplyExemptCost() {
    if (!iaGetExemptStatus()) return;
    // Set Cost per person (Field8) to 0 when exempt
    var el = document.getElementById('Field8');
    if (!el) {
        var li = document.getElementById('q8');
        el = li ? li.querySelector('input') : null;
    }
    if (el && el.value.trim() !== '0') {
        el.value = '0';
        try { $(el).trigger('change'); } catch(e) {}
    }
}

$(document).on('change', 'li#q1 select, li#q3 select', function () {
    iaUpdateExemptNotice();
});

// Field14 (Nationality) and Field98 (Exempt Status) are pre-filled by lookups
$(document).on('change', 'li#q14 select, li#q98 input, #Field98, #Field14', function () {
    iaUpdateExemptNotice();
    iaApplyExemptCost();
});

$(document).ready(function () {
    // Retries to catch lookup-populated fields
    [1000, 3000, 6000].forEach(function(d) {
        setTimeout(function() {
            iaUpdateExemptNotice();
            iaApplyExemptCost();
        }, d);
    });
});
