
(function () {
    var DONE = false;
    var docRowCount = 1;

    function makeDiv(cls) {
        var d = document.createElement('div');
        d.className = cls;
        return d;
    }

    function makeSection(text, subtext) {
        var d = document.createElement('div');
        d.className = 'pc-section';
        d.innerHTML = text + (subtext
            ? ' <span style="font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;font-size: 16px !important;font-weight: 700 !important;color: #000000 !important;margin-top: 0 !important;margin-bottom: 16px !important; letter-spacing: -0.01em !important;">' + subtext + '</span>'
            : '');
        return d;
    }

    function makeRow(cols) {
        var d = document.createElement('div');
        var colStr = typeof cols === 'number' ? 'repeat(' + cols + ', 1fr)' : cols;
        d.style.setProperty('display', 'grid', 'important');
        d.style.setProperty('grid-template-columns', colStr, 'important');
        d.style.setProperty('gap', '6px 10px', 'important');
        d.style.setProperty('margin-bottom', '6px', 'important');
        d.style.setProperty('align-items', 'end', 'important');
        d.style.setProperty('padding', '0', 'important');
        return d;
    }

    function showGridCell(el) {
        if (!el) return;
        el.style.setProperty('display', 'flex', 'important');
        el.style.setProperty('flex-direction', 'column', 'important');
        el.style.setProperty('margin', '0', 'important');
        el.style.setProperty('padding', '0', 'important');
        el.style.setProperty('list-style', 'none', 'important');
        el.style.setProperty('width', '100%', 'important');
        el.style.setProperty('min-width', 'auto', 'important');
        el.style.setProperty('overflow', 'hidden', 'important');
    }

    function showBlock(el) {
        if (!el) return;
        el.style.setProperty('display', 'block', 'important');
        el.style.setProperty('margin', '0', 'important');
        el.style.setProperty('padding', '0', 'important');
        el.style.setProperty('list-style', 'none', 'important');
    }

    var inputStyle = 'display:block;height:26px;width:100%;max-width:100%;box-sizing:border-box;' +
        'padding:0 8px;' +
        'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;color:#1a1a1a;background:#fff;outline:none;box-shadow:none;';
    var selectStyle = inputStyle + 'height:28px;';
    var labelStyle = 'display:block;margin-bottom:2px;';

    function styleInputs(container) {
        container.querySelectorAll('.cf-label').forEach(function (el) {
            el.style.setProperty('display', 'block', 'important');
            el.style.setProperty('float', 'none', 'important');
            el.style.setProperty('margin-bottom', '2px', 'important');
            el.style.setProperty('width', 'auto', 'important');
            el.style.setProperty('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', 'important');
        });
        container.querySelectorAll('.cf-field').forEach(function (el) {
            el.style.setProperty('float', 'none', 'important');
            el.style.setProperty('width', '100%', 'important');
            el.style.setProperty('margin', '0', 'important');
            el.style.setProperty('padding', '0', 'important');
        });
        container.querySelectorAll('input[type="text"],input[type="email"],select').forEach(function (el) {
            el.style.setProperty('display', 'block', 'important');
            el.style.setProperty('height', '36px', 'important');
            el.style.setProperty('width', '100%', 'important');
            el.style.setProperty('max-width', '100%', 'important');
            el.style.setProperty('box-sizing', 'border-box', 'important');
            el.style.setProperty('border', '1px solid #cccccc', 'important');
            el.style.setProperty('padding', '0 8px', 'important');
            el.style.setProperty('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', 'important');
            el.style.setProperty('color', '#1a1a1a', 'important');
            el.style.setProperty('background', '#fff', 'important');
            el.style.setProperty('outline', 'none', 'important');
            el.style.setProperty('box-shadow', 'none', 'important');
        });
        container.querySelectorAll('select').forEach(function (el) {
            el.style.setProperty('height', '36px', 'important');
        });
        /*container.querySelectorAll('.file-drop-area').forEach(function(el) {
          el.style.setProperty('display', 'none', 'important');
        });*/
        container.querySelectorAll('input[type="button"].shadow-fileuploader').forEach(function (el) {
            if (!el.closest('.pc-upload-panel') && !el.closest('[data-panel]')) {
                el.style.setProperty('display', 'block', 'important');
                el.style.setProperty('width', '100%', 'important');
                el.style.setProperty('height', '36px', 'important');
                el.style.setProperty('background', '#e8e8e8', 'important');
                el.style.setProperty('border', '1px solid #cccccc', 'important');
                el.style.setProperty('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', 'important');
                el.style.setProperty('cursor', 'pointer', 'important');
                el.style.setProperty('margin-top', '4px', 'important');
                el.style.setProperty('box-shadow', 'none', 'important');
                el.style.setProperty('color', '#1a1a1a', 'important');
            }
        });
    }

    function fieldsReady() {
        return !!(document.getElementById('q30') &&
            document.getElementById('q43') &&
            document.getElementById('q77'));
    }

    function buildLayout() {
        if (DONE) return;
        if (!fieldsReady()) return;

        var sectionBlock = document.querySelector('.cf-section-block');
        if (!sectionBlock) return;
        DONE = true;

        function f(id) { return document.getElementById(id); }

        function place(row, id, spanCols) {
            var el = f(id);
            if (!el) return;
            row.appendChild(el);
            showGridCell(el);
            if (spanCols) el.style.setProperty('grid-column', 'span ' + spanCols, 'important');
            styleInputs(el);
        }

        var ul = sectionBlock.querySelector(':scope > ul');
        function ins(el) {
            if (ul) sectionBlock.insertBefore(el, ul);
            else sectionBlock.appendChild(el);
        }

        function renderMedia(box, b64, placeholder) {
            var raw = (b64 || '').trim();
            if (raw.length <= 10) { box.innerHTML = placeholder; return; }
            var stripped = raw.startsWith('data:') ? (raw.split(',')[1] || '') : raw;
            var isPdf = raw.startsWith('data:application/pdf') || stripped.startsWith('JVBERi0');
            if (!isPdf) {
                var src = raw.startsWith('data:') ? raw : 'data:image/jpeg;base64,' + raw;
                box.innerHTML = '<img src="' + src + '" style="width:100%;height:100%;object-fit:contain;" />';
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
                var arr = new Uint8Array(bytes.length);
                for (var i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
                var blob = new Blob([arr], { type: 'application/pdf' });
                var url = URL.createObjectURL(blob);
                window.open(url, '_blank');
                setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
            });
        }

        /* ── PERSONAL INFORMATION ── */
        ins(makeSection('Personal Information'));
        var pi1 = makeRow(4); place(pi1, 'q30'); place(pi1, 'q31'); place(pi1, 'q32'); place(pi1, 'q33'); ins(pi1);
        var pi2 = makeRow(4); place(pi2, 'q34'); place(pi2, 'q84'); place(pi2, 'q35'); place(pi2, 'q36'); ins(pi2);
        var pi3 = makeRow(4); place(pi3, 'q37', 2); place(pi3, 'q38'); place(pi3, 'q61'); ins(pi3);
        var pi4 = makeRow(4); place(pi4, 'q39'); place(pi4, 'q40'); place(pi4, 'q41', 2); ins(pi4);
        /*var pi5 = makeRow(4); place(pi5, 'q94'); ins(pi5);*/

        /* ── LATEST PASSPORT INFORMATION ── */
        ins(makeSection('Latest Passport Information'));
        var pp1 = makeRow(4); place(pp1, 'q43'); place(pp1, 'q44'); place(pp1, 'q45'); place(pp1, 'q46'); ins(pp1);
        var pp2 = makeRow(4); place(pp2, 'q47'); place(pp2, 'q85'); place(pp2, 'q56'); place(pp2, 'q49'); place(pp2, 'q88'); ins(pp2);
        var pp3 = makeRow(3); place(pp3, 'q50'); place(pp3, 'q52'); place(pp3, 'q51'); ins(pp3);

        /* ── DOCUMENTS SECTION HIDDEN ── */
        /* Documents, Upload Return Ticket and Upload Photo are intentionally not rendered */

        /* Hide the original collections 
        var q66 = f('q66');
        if (q66) q66.style.setProperty('display', 'none', 'important');*/

        /* ── UPLOAD PANELS + PASSPORT THUMBNAIL ── */
        /* Single-column layout — only Passport panel is shown */
        var uploadRow = document.createElement('div');
        uploadRow.style.setProperty('display', 'grid', 'important');
        uploadRow.style.setProperty('grid-template-columns', 'repeat(2, 1fr)', 'important');
        uploadRow.style.setProperty('gap', '10px', 'important');
        uploadRow.style.setProperty('margin-top', '30px', 'important');

        /* ── PASSPORT THUMBNAIL PANEL ── */
        var passportPanel = document.createElement('div');
        passportPanel.id = 'pc-passport-panel';
        passportPanel.style.cssText = 'border-radius:10px;padding:25px 22px;' + 'background:#f5f7f7;';

        /* Title bar with trash icon */
        var passportTitleBar = document.createElement('div');
        passportTitleBar.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;';
        var passportTitle = document.createElement('span');
        passportTitle.textContent = 'Passport';
        passportTitle.style.cssText = 'font-weight:bold !important; color:black !important; font-size:16px !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important';
        var trashBtn = document.createElement('button');
        trashBtn.type = 'button';
        trashBtn.title = 'Remove';
        trashBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#da373d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>';
        trashBtn.style.cssText = 'background:#da373d42;border:none;cursor:pointer;line-height:1; border-radius:100px !important;height: 35px; width: 35px;' +
            'align-items:center;';
        trashBtn.onmouseover = function () { this.style.opacity = '1'; };
        trashBtn.onmouseout = function () { this.style.opacity = '0.6'; };
        trashBtn.onclick = function () {
            ['q83', 'q73', 'q74', 'q75'].forEach(function (id) {
                var el = document.getElementById(id);
                if (!el) return;
                var input = el.querySelector('input[type="text"], textarea');
                if (input) input.value = '';
            });
            updatePassportPanel();
        };
        passportTitleBar.appendChild(passportTitle);
        passportTitleBar.appendChild(trashBtn);
        passportPanel.appendChild(passportTitleBar);

        /* Image + metadata side by side */
        var passportBody = document.createElement('div');
        passportBody.style.cssText = 'display:flex;flex-direction:column;gap:6px;';

        /* Image box */
        var imgBox = document.createElement('div');
        imgBox.id = 'pc-passport-imgbox';
        imgBox.style.cssText = 'width:100%;height:160px;' +
            'background:#ebebeb;display:flex;align-items:center;justify-content:center;' +
            'overflow:hidden;flex-shrink:0;border-radius:10px;margin-bottom:8px; ';
        var passportPlaceholderSvg = '<svg width="50" height="38" viewBox="0 0 60 45" xmlns="http://www.w3.org/2000/svg">' +
            '<rect width="60" height="45" fill="#ddd"/>' +
            '<line x1="0" y1="0" x2="60" y2="45" stroke="#bbb" stroke-width="2.5"/>' +
            '<line x1="60" y1="0" x2="0" y2="45" stroke="#bbb" stroke-width="2.5"/></svg>';
        imgBox.innerHTML = passportPlaceholderSvg;
        passportBody.appendChild(imgBox);

        /* Metadata column */
        var metaCol = document.createElement('div');
        metaCol.style.cssText = 'display:flex;flex-direction:row;gap:10px;flex-wrap:wrap;';

        /* Expiry date field */
        var expiryWrap = document.createElement('div');
        var expiryLabel = document.createElement('div');
        expiryLabel.textContent = 'Expiry date';
        expiryLabel.style.cssText = 'font-size:10px;color:#999;margin-bottom:1px;';
        var expiryVal = document.createElement('div');
        expiryVal.id = 'pc-passport-expiry';
        expiryVal.style.cssText = 'font-size:11px;background:#e0e0e0;border-radius:10px;padding:2px 8px;color:#444;display:inline-block;font-weight:500;';
        expiryVal.textContent = 'yyyy/mm/dd';
        expiryWrap.appendChild(expiryLabel);
        expiryWrap.appendChild(expiryVal);
        metaCol.appendChild(expiryWrap);

        /* Passport number field */
        var passNumWrap = document.createElement('div');
        var passNumLabel = document.createElement('div');
        passNumLabel.textContent = 'Passport number';
        passNumLabel.style.cssText = 'font-size:10px;color:#999;margin-bottom:1px;';
        var passNumVal = document.createElement('div');
        passNumVal.id = 'pc-passport-number';
        passNumVal.style.cssText = 'font-size:11px;background:#c8daf0;border-radius:10px;padding:2px 8px;color:#1a4a7a;display:inline-block;font-weight:500;';
        passNumVal.textContent = '—';
        passNumWrap.appendChild(passNumLabel);
        passNumWrap.appendChild(passNumVal);
        metaCol.appendChild(passNumWrap);

        /* Uploaded on field */
        var uploadedWrap = document.createElement('div');
        var uploadedLabel = document.createElement('div');
        uploadedLabel.textContent = 'Uploaded on';
        uploadedLabel.style.cssText = 'font-size:10px;color:#999;margin-bottom:1px;';
        var uploadedVal = document.createElement('div');
        uploadedVal.id = 'pc-passport-uploaded';
        uploadedVal.style.cssText = 'font-size:11px;background:#e0e0e0;border-radius:10px;padding:2px 8px;color:#444;display:inline-block;font-weight:500;';
        uploadedVal.textContent = 'yyyy/mm/dd';
        uploadedWrap.appendChild(uploadedLabel);
        uploadedWrap.appendChild(uploadedVal);
        metaCol.appendChild(uploadedWrap);

        passportBody.appendChild(metaCol);
        /* ── OCR SCAN BUTTON ── */
        var ocrSection = document.createElement('div');
        ocrSection.style.cssText = 'margin-top:14px;';

        var ocrBtn = document.createElement('button');
        ocrBtn.type = 'button';
        ocrBtn.id = 'pc-ocr-btn';
        ocrBtn.textContent = '🔍  Scan Passport';
        ocrBtn.style.setProperty('width', '100%', 'important');
        ocrBtn.style.setProperty('height', '38px', 'important');
        ocrBtn.style.setProperty('background', '#e07b39', 'important');
        ocrBtn.style.setProperty('border', 'none', 'important');
        ocrBtn.style.setProperty('border-radius', '8px', 'important');
        ocrBtn.style.setProperty('color', '#ffffff', 'important');
        ocrBtn.style.setProperty('font-size', '13px', 'important');
        ocrBtn.style.setProperty('font-weight', '600', 'important');
        ocrBtn.style.setProperty('cursor', 'pointer', 'important');
        ocrBtn.style.setProperty('letter-spacing', '0.03em', 'important');
        ocrBtn.style.setProperty('font-family', '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif', 'important');
        ocrBtn.addEventListener('mouseover', function () { if (!this.disabled) this.style.setProperty('background', '#c46a2c', 'important'); });
        ocrBtn.addEventListener('mouseout', function () { if (!this.disabled) this.style.setProperty('background', '#e07b39', 'important'); });
        ocrBtn.addEventListener('click', runPassportOCR);   /* function declaration — hoisted */

        var ocrStatus = document.createElement('div');
        ocrStatus.id = 'pc-ocr-status';
        ocrStatus.style.cssText = 'margin-top:7px;font-size:11px;text-align:center;border-radius:6px;' +
            'padding:5px 10px;display:none;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;line-height:1.4;';

        ocrSection.appendChild(ocrBtn);
        ocrSection.appendChild(ocrStatus);
        passportBody.appendChild(ocrSection);
        /* ── END OCR BUTTON ── */
        passportPanel.appendChild(passportBody);

        uploadRow.appendChild(passportPanel);

        /* ── PROFILE PHOTO PANEL ── */
        var photoPanel = document.createElement('div');
        photoPanel.id = 'pc-photo-panel';
        photoPanel.style.cssText = 'border-radius:10px;padding:25px 22px;' + 'background:#f5f7f7;';

        var photoTitleBar = document.createElement('div');
        photoTitleBar.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;';
        var photoTitle = document.createElement('span');
        photoTitle.textContent = 'Profile Photo';
        photoTitle.style.cssText = 'font-weight:bold !important; color:black !important; font-size:16px !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important';
        var photoTrashBtn = document.createElement('button');
        photoTrashBtn.type = 'button';
        photoTrashBtn.title = 'Remove';
        photoTrashBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#da373d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>';
        photoTrashBtn.style.cssText = 'background:#da373d42;border:none;cursor:pointer;line-height:1; border-radius:100px !important;height: 35px; width: 35px;' +
            'align-items:center;';
        photoTrashBtn.onmouseover = function () { this.style.opacity = '1'; };
        photoTrashBtn.onmouseout = function () { this.style.opacity = '0.6'; };
        photoTitleBar.appendChild(photoTitle);
        photoTitleBar.appendChild(photoTrashBtn);
        photoPanel.appendChild(photoTitleBar);

        var photoImgBox = document.createElement('div');
        photoImgBox.id = 'pc-photo-imgbox';
        photoImgBox.style.cssText = 'width:100%;height:160px;' +
            'background:#ebebeb;display:flex;align-items:center;justify-content:center;' +
            'overflow:hidden;border-radius:10px;margin-bottom:8px;';
        var photoPlaceholderSvg = '<svg width="50" height="38" viewBox="0 0 60 45" xmlns="http://www.w3.org/2000/svg">' +
            '<rect width="60" height="45" fill="#ddd"/>' +
            '<line x1="0" y1="0" x2="60" y2="45" stroke="#bbb" stroke-width="2.5"/>' +
            '<line x1="60" y1="0" x2="0" y2="45" stroke="#bbb" stroke-width="2.5"/></svg>';
        photoImgBox.innerHTML = photoPlaceholderSvg;
        photoPanel.appendChild(photoImgBox);

        photoTrashBtn.onclick = function () {
            var el = document.getElementById('q89');
            var ta = el ? el.querySelector('textarea') : null;
            if (ta) { ta.value = ''; $(ta).trigger('change'); }
            photoImgBox.innerHTML = photoPlaceholderSvg;
        };

        uploadRow.appendChild(photoPanel);

        /* ── RETURN TICKET PANEL ── */
        var ticketPanel = document.createElement('div');
        ticketPanel.id = 'pc-ticket-panel';
        ticketPanel.style.cssText = 'border:1px solid #ccc;border-radius:4px;padding:10px 12px;' +
            'background:#fafafa';

        var ticketTitleBar = document.createElement('div');
        ticketTitleBar.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;';
        var ticketTitle = document.createElement('span');
        ticketTitle.textContent = 'Return Ticket';
        ticketTitle.style.cssText = 'font-size:12px;font-weight:600;color:#1a1a1a;letter-spacing:0.02em;';
        var ticketTrashBtn = document.createElement('button');
        ticketTrashBtn.type = 'button';
        ticketTrashBtn.title = 'Remove';
        ticketTrashBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>';
        ticketTrashBtn.style.cssText = 'background:none;border:none;cursor:pointer;padding:2px;line-height:1;display:flex;align-items:center;opacity:0.6;';
        ticketTrashBtn.onmouseover = function () { this.style.opacity = '1'; };
        ticketTrashBtn.onmouseout = function () { this.style.opacity = '0.6'; };
        ticketTitleBar.appendChild(ticketTitle);
        ticketTitleBar.appendChild(ticketTrashBtn);
        ticketPanel.appendChild(ticketTitleBar);

        var ticketImgBox = document.createElement('div');
        ticketImgBox.id = 'pc-ticket-imgbox';
        ticketImgBox.style.cssText = 'width:100%;height:160px;border:1px solid #ddd;' +
            'background:#ebebeb;display:flex;align-items:center;justify-content:center;' +
            'overflow:hidden;border-radius:3px;margin-bottom:8px;';
        var ticketPlaceholderSvg = '<svg width="50" height="38" viewBox="0 0 60 45" xmlns="http://www.w3.org/2000/svg">' +
            '<rect width="60" height="45" fill="#ddd"/>' +
            '<line x1="0" y1="0" x2="60" y2="45" stroke="#bbb" stroke-width="2.5"/>' +
            '<line x1="60" y1="0" x2="0" y2="45" stroke="#bbb" stroke-width="2.5"/></svg>';
        ticketImgBox.innerHTML = ticketPlaceholderSvg;
        ticketPanel.appendChild(ticketImgBox);

        ticketTrashBtn.onclick = function () {
            var ta = document.querySelector('.returnTicketBase64 textarea');
            if (ta) { ta.value = ''; $(ta).trigger('change'); }
            ticketImgBox.innerHTML = ticketPlaceholderSvg;
        };

        // ticketPanel intentionally not added to uploadRow

        /* ── Function to update passport panel from field values ── */
        function updatePassportPanel() {
            var q83el = document.getElementById('q83');
            var b64 = q83el ? (q83el.querySelector('textarea') || q83el).value : '';
            renderMedia(imgBox, b64, passportPlaceholderSvg);

            var q73el = document.getElementById('q73');
            var expiry = q73el ? (q73el.querySelector('input[type="text"]') || {}).value || '' : '';
            var expiryDiv = document.getElementById('pc-passport-expiry');
            if (expiryDiv) {
                expiryDiv.textContent = expiry || 'yyyy/mm/dd';
                var expDate = expiry ? new Date(expiry) : null;
                if (expDate && !isNaN(expDate)) {
                    expiryDiv.style.background = expDate > new Date() ? '#b6e8b6' : '#f5b6b6';
                    expiryDiv.style.color = expDate > new Date() ? '#1a5c1a' : '#7a1a1a';
                } else {
                    expiryDiv.style.background = '#e0e0e0';
                    expiryDiv.style.color = '#333';
                }
            }

            var q74el = document.getElementById('q74');
            var passNum = q74el ? (q74el.querySelector('input[type="text"]') || {}).value || '' : '';
            var passNumDiv = document.getElementById('pc-passport-number');
            if (passNumDiv) passNumDiv.textContent = passNum || '—';

            var q75el = document.getElementById('q75');
            var uploaded = q75el ? (q75el.querySelector('input[type="text"]') || {}).value || '' : '';
            var uploadedDiv = document.getElementById('pc-passport-uploaded');
            if (uploadedDiv) uploadedDiv.textContent = uploaded || 'yyyy/mm/dd';
        }

        ['q73', 'q74', 'q75', 'q83'].forEach(function (id) {
            var el = document.getElementById(id);
            if (!el) return;
            var input = el.querySelector('input[type="text"], textarea');
            if (input) {
                input.addEventListener('change', updatePassportPanel);
                input.addEventListener('input', updatePassportPanel);
            }
        });

        setTimeout(updatePassportPanel, 800);

        var q89el = document.getElementById('q89');
        if (q89el) {
            var q89input = q89el.querySelector('textarea');
            if (q89input) {
                q89input.addEventListener('change', updatePhotoPanel);
                q89input.addEventListener('input', updatePhotoPanel);
            }
        }

        var lastVals = { q73: '', q74: '', q75: '', q83: '' };
        setInterval(function () {
            var changed = false;
            ['q73', 'q74', 'q75', 'q83'].forEach(function (id) {
                var el = document.getElementById(id);
                if (!el) return;
                var input = el.querySelector('input[type="text"], textarea');
                var val = input ? input.value : '';
                if (val !== lastVals[id]) {
                    lastVals[id] = val;
                    changed = true;
                }
            });
            if (changed) updatePassportPanel();
        }, 1000);

        ins(uploadRow);

        /* ── UPLOAD BUTTON ROW (3-column grid aligned with image panels above) ── */
        var uploadBtnRow = document.createElement('div');
        uploadBtnRow.style.setProperty('display', 'grid', 'important');
        uploadBtnRow.style.setProperty('grid-template-columns', 'repeat(2, 1fr)', 'important');
        uploadBtnRow.style.setProperty('gap', '0 10px', 'important');
        uploadBtnRow.style.setProperty('margin-top', '4px', 'important');

        ['.uploadPassportBtn', '.uploadPhotoBtn'].forEach(function (cls) {
            var el = document.querySelector(cls);
            if (el) {
                el.style.setProperty('display', 'block', 'important');
                el.style.setProperty('width', '100%', 'important');
                el.style.setProperty('box-sizing', 'border-box', 'important');
                el.style.setProperty('margin', '0', 'important');
                el.style.setProperty('list-style', 'none', 'important');
                uploadBtnRow.appendChild(el);
            }
        });
        ins(uploadBtnRow);

        /* ── HIDE THE ORIGINAL <ul> (upload buttons moved to uploadBtnRow above) ── */
        if (ul) {
            ul.style.setProperty('display', 'none', 'important');
        }

        /* ── UPLOAD BUTTON STYLING ── */
        function convertToBase64(file, callback) {
            var reader = new FileReader();
            reader.onload = function (e) { callback(e.target.result); };
            reader.readAsDataURL(file);
        }

        var uploadSlots = [
            { btnClass: '.uploadPassportBtn', field: '#q83', imgBox: imgBox, label: 'Passport', onUpdate: function () { updatePassportPanel(); setTimeout(runPassportOCR, 300); } },
            { btnClass: '.uploadPhotoBtn', field: '#q89', imgBox: photoImgBox, label: 'Profile Photo', onUpdate: updatePhotoPanel },
            // Return Ticket upload intentionally hidden
        ];

        function styleUploadButtons() {
            uploadSlots.forEach(function (s) {
                var $container = $(s.btnClass);
                if (!$container.length || $container.data('upload-styled')) return;
                $container.data('upload-styled', true);

                $container.find('.shadow-fileuploader, .file-drop-area').hide();
                $container.find('label').hide();

                var $box = $('<div></div>').css({
                    padding: '32px 24px',
                    border: '2.5px dashed #d2b48c',
                    borderRadius: '8px',
                    background: '#fff',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'background 0.2s, border-color 0.2s',
                    marginTop: '4px',
                    position: 'relative',
                }).html(
                    '<span style="font-size: 24px; color: #d2b48c; vertical-align: middle; margin-right: 10px;">📎</span>' +
                    '<div style="font-size: 15px !important; font-weight: 500 !important; color: #555; margin: 0 0 4px; display: inline-block; vertical-align: middle;">Click here to add your <b>' + s.label + '</b></div>'
                );
                $container.find('.cf-field').prepend($box);

                $box.on('click', function () {
                    $container.find('input[type="file"]').trigger('click');
                });

                $container.find('input[type="file"]').on('change', function () {
                    var file = this.files[0];
                    if (!file) return;
                    var $fileInput = $(this);
                    convertToBase64(file, function (base64) {
                        var $ta = $(s.field).find('textarea');
                        if ($ta.length) $ta.val(base64).trigger('change');
                        renderMedia(s.imgBox, base64, '');
                        if (s.onUpdate) s.onUpdate();
                        setTimeout(function () {
                            $container.find('.files tbody tr').last().find('button').trigger('click');
                            $container.find('[id^="reachUploadLimit"]').hide();
                            $fileInput.val('');
                        }, 300);
                    });
                });
            });
        }

        function updatePhotoPanel() {
            var q89el = document.getElementById('q89');
            var b64 = q89el ? (q89el.querySelector('textarea') || q89el).value.trim() : '';
            renderMedia(photoImgBox, b64, photoPlaceholderSvg);
        }

        function updateTicketPanel() {
            var ta = document.querySelector('.returnTicketBase64 textarea');
            var b64 = ta ? ta.value.trim() : '';
            renderMedia(ticketImgBox, b64, ticketPlaceholderSvg);
        }

        setTimeout(updatePhotoPanel, 800);
        setTimeout(updateTicketPanel, 800);

        var lastPhotoVal = '', lastTicketVal = '';
        setInterval(function () {
            var photoEl = document.getElementById('q89');
            var photoInput = photoEl ? photoEl.querySelector('textarea') : null;
            var ticketTa = document.querySelector('.returnTicketBase64 textarea');
            var pv = photoInput ? photoInput.value : '';
            var tv = ticketTa ? ticketTa.value : '';
            if (pv !== lastPhotoVal) { lastPhotoVal = pv; updatePhotoPanel(); }
            if (tv !== lastTicketVal) { lastTicketVal = tv; updateTicketPanel(); }
        }, 1000);

        styleUploadButtons();
        setTimeout(function () { styleUploadButtons(); }, 500);
        setTimeout(function () { styleUploadButtons(); }, 1500);
        setTimeout(function () { styleUploadButtons(); }, 3000);

        /* ── HIDE ORIGINALS ── */
        /*['q64','q80','q71','q77','q79'].forEach(function(id) {
          var el = f(id);
          if (el) el.style.setProperty('display', 'none', 'important');
        });
        if (ul) ul.style.setProperty('display', 'none', 'important');*/

        /* ── DATE + EMAIL PASS ── */
        setTimeout(function () {
            document.querySelectorAll('.cf-date-field-date').forEach(function (el) {
                el.style.setProperty('display', 'flex', 'important');
                el.style.setProperty('align-items', 'center', 'important');
                el.style.setProperty('gap', '4px', 'important');
            });
            document.querySelectorAll('.cf-date-field-date input[type="text"]').forEach(function (el) {
                el.style.setProperty('flex', '1', 'important');
                el.style.setProperty('width', 'auto', 'important');
                el.style.setProperty('min-width', '0', 'important');
            });
            document.querySelectorAll('.cf-date-field-date img.ui-datepicker-trigger').forEach(function (el) {
                el.style.setProperty('width', '16px', 'important');
                el.style.setProperty('height', '16px', 'important');
                el.style.setProperty('flex-shrink', '0', 'important');
                el.style.setProperty('cursor', 'pointer', 'important');
            });
            var email = document.querySelector('#q41 input[type="email"]');
            if (email) {
                email.removeAttribute('readonly');
                email.removeAttribute('backend-readonly');
                email.style.setProperty('background', '#efefef', 'important');
            }
        }, 600);

        /* ── SESSION TOKEN ── */
        setTimeout(function () {
            try {
                var url = new URL(window.location.href);
                var token = url.searchParams.get('token');
                if (token) {
                    var tokenInput = document.querySelector('#q81 input[type="text"]');
                    if (tokenInput) {
                        tokenInput.value = token;
                        $(tokenInput).val(token).trigger('change');
                    }
                }
            } catch (e) { }
        }, 2000);

        /* ── RE-ATTACH LF VALIDATION ── */
        setTimeout(function () {
            try {
                if (window.$ && $.fn.parsley) {
                    $('#form1').parsley().destroy();
                    $('#form1').parsley();
                }
                if (window.LF && window.LF.validation) {
                    LF.validation.init();
                }
            } catch (e) { }
        }, 1000);
        /* ══════════════════════════════════════════════════════════
       PASSPORT OCR FUNCTIONS
       All are function declarations — hoisted to top of buildLayout
    ══════════════════════════════════════════════════════════ */

        function showOCRStatus(msg, success) {
            var s = document.getElementById('pc-ocr-status');
            if (!s) return;
            s.textContent = msg;
            s.style.display = 'block';
            if (success === true) { s.style.background = '#e8f5e8'; s.style.color = '#1a5c1a'; }
            if (success === false) { s.style.background = '#fdecea'; s.style.color = '#7a1a1a'; }
            if (success === null) { s.style.background = '#fff8e8'; s.style.color = '#7a5a00'; }
            if (success !== null) setTimeout(function () { s.style.display = 'none'; }, 6000);
        }

        /* Set any text input or textarea by field id */
        function setTxtInput(id, val) {
            if (!val) return;
            var el = document.getElementById(id);
            if (!el) return;
            var inp = el.querySelector('input[type="text"], textarea');
            if (!inp) return;
            inp.value = val;
            $(inp).val(val).trigger('change').trigger('input');
        }

        /* Set a <select> inside field id — tries exact value, exact text, partial text.
           Pass a fallback term (e.g. issuing state name) as second option. */
        function setOCRSelect(id, text, fallback) {
            if (!text && !fallback) return false;
            var el = document.getElementById(id);
            var sel = el ? el.querySelector('select') : null;
            if (!sel) return false;
            var terms = [text, fallback].filter(Boolean);
            for (var t = 0; t < terms.length; t++) {
                var term = terms[t].toLowerCase().trim();
                var opts = Array.prototype.slice.call(sel.options);
                // 1. exact value match
                for (var i = 1; i < opts.length; i++) {
                    if (opts[i].value.toLowerCase() === term) { $(sel).val(opts[i].value).trigger('change'); return true; }
                }
                // 2. exact text match
                for (var i = 1; i < opts.length; i++) {
                    if (opts[i].text.toLowerCase().trim() === term) { $(sel).val(opts[i].value).trigger('change'); return true; }
                }
                // 3. partial text match
                for (var i = 1; i < opts.length; i++) {
                    var ot = opts[i].text.toLowerCase().trim();
                    if (ot && (ot.indexOf(term) !== -1 || term.indexOf(ot) !== -1)) { $(sel).val(opts[i].value).trigger('change'); return true; }
                }
            }
            return false;
        }

        /* Set a Laserfiche date field.  dateStr format: "yyyy/mm/dd" or "yyyy-mm-dd".
           Handles both multi-input (mon/day/year) and single combined input. */
        function setOCRDate(id, dateStr) {
            if (!dateStr) return;
            var el = document.getElementById(id);
            if (!el) return;
            var m = dateStr.match(/^(\d{4})[\/\-](\d{2})[\/\-](\d{2})$/);
            if (!m) return;
            var year = m[1], mon = m[2], day = m[3];
            var inputs = el.querySelectorAll('.cf-date-field-date input[type="text"]');
            if (inputs.length >= 3) {
                /* Laserfiche default order: month / day / year */
                inputs[0].value = mon; $(inputs[0]).trigger('change');
                inputs[1].value = day; $(inputs[1]).trigger('change');
                inputs[2].value = year; $(inputs[2]).trigger('change').trigger('blur');
            } else {
                var single = inputs[0] || el.querySelector('input[type="text"]');
                if (single) {
                    single.value = year + '/' + mon + '/' + day;
                    $(single).trigger('change').trigger('blur');
                }
            }
            /* Also try jQuery UI datepicker (no-op if not present) */
            try {
                var d = new Date(year + '-' + mon + '-' + day);
                $(el).find('.cf-date-field-date input:first').datepicker('setDate', d);
            } catch (e) { }
        }

        /* Map OCR response fields to form fields */
        function applyOCRResult(result) {
            var fields = result.fields || [];
            function g(n) {
                var found = fields.filter(function (x) { return x.fieldName === n; })[0];
                return found ? found.fieldValue : '';
            }

            var surname = g('Surname');
            var givenNames = g('Given Names');
            var dob = g('Date of Birth');
            var docNum = g('Document Number');
            var dateExpiry = g('Date of Expiry');
            var dateIssue = g('Date of Issue');
            var sex = g('Sex');
            var nationality = g('Nationality');          /* often a 3-letter code */
            var issuingState = g('Issuing State Name');   /* full country name — better for select matching */
            var placeOfBirth = g('Place of Birth');
            var authority = g('Authority');
            var genderStr = sex === 'M' ? 'Male' : sex === 'F' ? 'Female' : sex;

            /* ── PERSONAL INFORMATION ─────────────────── */
            setTxtInput('q30', givenNames);
            setTxtInput('q31', surname);
            setOCRDate('q32', dob);
            if (genderStr) setOCRSelect('q33', genderStr);
            setOCRSelect('q34', issuingState, nationality);   /* Nationality */
            setTxtInput('q35', placeOfBirth || issuingState); /* Place of Birth */
            setOCRSelect('q84', issuingState);                /* Country of Birth */

            /* ── LATEST PASSPORT INFORMATION ─────────── */
            setTxtInput('q43', givenNames);
            setTxtInput('q44', surname);
            setOCRDate('q45', dob);
            if (genderStr) setOCRSelect('q46', genderStr);
            setOCRSelect('q47', issuingState, nationality);   /* Nationality */
            setTxtInput('q56', docNum);                      /* Passport Number */
            setOCRDate('q49', dateIssue);                   /* Date of Issue */
            setOCRDate('q50', dateExpiry);                  /* Expiration Date */
            setTxtInput('q51', authority);                   /* Issuing Location */
            setOCRSelect('q52', issuingState);                /* Issuing Country */

            /* ── HIDDEN PANEL DISPLAY FIELDS ─────────── */
            /* q73/q74 feed the thumbnail card; q75 = "Uploaded on" */
            setTxtInput('q73', dateExpiry);
            setTxtInput('q74', docNum);
            var now = new Date();
            var todayStr = now.getFullYear() + '/' +
                String(now.getMonth() + 1).padStart(2, '0') + '/' +
                String(now.getDate()).padStart(2, '0');
            setTxtInput('q75', todayStr);

            /* ── PORTRAIT → PROFILE PHOTO ────────────── */
            /* OCR returns the extracted face photo; auto-populate q89 */
            if (result.portrait && result.portrait.length > 100) {
                var portraitSrc = 'data:image/jpeg;base64,' + result.portrait;
                var q89el = document.getElementById('q89');
                var q89ta = q89el ? q89el.querySelector('textarea') : null;
                if (q89ta) { q89ta.value = portraitSrc; $(q89ta).trigger('change'); }
                renderMedia(photoImgBox, portraitSrc, '');
            }

            /* Refresh thumbnail panel */
            setTimeout(updatePassportPanel, 400);
        }

        /* Main OCR trigger */
        function runPassportOCR() {
            var q83el = document.getElementById('q83');
            var ta = q83el ? q83el.querySelector('textarea') : null;
            var raw = ta ? ta.value.trim() : '';

            /* q83 stores the full data URL (data:image/jpeg;base64,/9j/...)
               The OCR API expects only the raw base64 — strip the prefix */
            var base64 = raw.startsWith('data:') ? (raw.split(',')[1] || '') : raw;

            if (!base64 || base64.length <= 10) {
                showOCRStatus('⚠  Upload a passport image first.', false);
                return;
            }

            var btn = document.getElementById('pc-ocr-btn');
            if (btn) {
                btn.disabled = true;
                btn.textContent = 'Scanning…';
                btn.style.setProperty('background', '#aaaaaa', 'important');
            }
            showOCRStatus('Scanning passport — please wait…', null);

            fetch('https://passportocr.pinpoint.web.za/Passport', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: base64 }),
                redirect: 'follow'
            })
                .then(function (r) { return r.json(); })
                .then(function (result) {
                    if (btn) {
                        btn.disabled = false;
                        btn.textContent = '🔍  Scan Passport';
                        btn.style.setProperty('background', '#e07b39', 'important');
                    }
                    if (result.error) { showOCRStatus('✗  ' + result.error, false); return; }
                    applyOCRResult(result);
                    var docLabel = result.docType ? ' (' + result.docType + ')' : '';
                    showOCRStatus('✓  Scanned' + docLabel + ' — fields updated', true);
                })
                .catch(function (err) {
                    if (btn) {
                        btn.disabled = false;
                        btn.textContent = '🔍  Scan Passport';
                        btn.style.setProperty('background', '#e07b39', 'important');
                    }
                    showOCRStatus('✗  Scan failed. Check connection and try again.', false);
                    console.error('OCR error:', err);
                });
        }
        /* ══════════════════════════════════════════════════════════ */
    }

    var observer = new MutationObserver(function () {
        if (fieldsReady() && !DONE) {
            buildLayout();
            if (DONE) observer.disconnect();
        }
    });

    function start() {
        if (fieldsReady()) { buildLayout(); return; }
        observer.observe(document.body, { childList: true, subtree: true });
        setTimeout(function () { observer.disconnect(); }, 15000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }

})();

$(document).on('change', '.genderLookup input', function () {
    let gender = $(this).val().trim();
    setTimeout(function () {
        $('.gender select').val(gender).trigger('change');
    }, 1000);
});

$(document).on('change', '.nationalityLookup input', function () {
    let nationality = $(this).val().trim();
    setTimeout(function () {
        $('.nationality select').val(nationality).trigger('change');
    }, 1000);
});


$(document).on('change', '.maritalstatusLookup input', function () {
    let MaritalStatus = $(this).val().trim();
    setTimeout(function () {
        $('.MaritalStatus select').val(MaritalStatus).trigger('change');
    }, 1000);
});

$(document).on('change', '.CountryresLookup input', function () {
    let CountryofResidence = $(this).val().trim();
    setTimeout(function () {
        $('.CountryofResidence select').val(CountryofResidence).trigger('change');
    }, 1000);
});

$(document).on('change', '.Passport input', function () {
  let passportInput = $(this).val().trim();
  let sessionToken = $('.sessionToken input').val().trim();
  let applicationUrl = '';

  if (passportInput) {
      applicationUrl = 'https://pinpoint.web.za/Forms/ApplicationTypeGateway?passport=' + encodeURIComponent(passportInput) + '&sessionToken=' + encodeURIComponent(sessionToken);
  };

  $('.visaAppUrl input').val(applicationUrl).trigger('change');

});
