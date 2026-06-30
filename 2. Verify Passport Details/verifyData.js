document.addEventListener("DOMContentLoaded", function () {
    console.log('[UIBCP] DOMContentLoaded fired');

    // -- Existing: poll for passport photo from LF table #118 --------------
    var passportPhoto = document.getElementById("passportPhoto");
    console.log('[UIBCP] passportPhoto element:', passportPhoto ? 'FOUND' : 'NOT FOUND');

    if (passportPhoto) {
        var attempts = 0;

        var poll = setInterval(function () {
            attempts++;

            var table = document.getElementById("118");

            if (table) {
                var cells = table.querySelectorAll("tbody tr:first-child td");
                var dataUri   = null;
                var photoCell = null;

                // Find first cell containing a supported image data URI
                var supported = [
                    'data:image/jpeg',
                    'data:image/jpg',
                    'data:image/png',
                    'data:image/bmp',
                    'data:application/pdf'
                ];

                for (var i = 0; i < cells.length; i++) {
                    var val = cells[i].textContent.trim();
                    for (var s = 0; s < supported.length; s++) {
                        if (val.indexOf(supported[s]) === 0) {
                            dataUri   = val;
                            photoCell = i;
                            break;
                        }
                    }
                    if (dataUri) break;
                }

                if (dataUri) {
                    clearInterval(poll);
                    console.log('[UIBCP] Passport data URI found in cell', photoCell, '— mime:', dataUri.split(';')[0]);

                    // Only set photo display for image types, not PDF
                    if (dataUri.indexOf('data:application/pdf') === -1) {
                        passportPhoto.src = dataUri;
                        passportPhoto.style.display = '';
                        var photoWrap = passportPhoto.closest('.vpd-photo');
                        if (photoWrap) photoWrap.classList.add('has-image');
                        console.log('[UIBCP] Passport photo displayed');
                    } else {
                        console.log('[UIBCP] PDF detected — skipping photo display');
                    }

                    console.log('[UIBCP] Triggering OCR');
                    runPassportOCR(dataUri);
                }
            }

            if (attempts >= 100) {
                clearInterval(poll);
                console.warn('[UIBCP] Polling timed out after 100 attempts');
            }

        }, 100);
    }

    // -- OCR: helper functions ----------------------------------------------
    function getPassportField(fields, fieldName) {
        var f = fields.find(function (x) { return x.fieldName === fieldName; });
        return f ? f.fieldValue : '';
    }

    function toInputDate(val) {
        if (!val) return '';
        return val.replace(/\//g, '-');
    }

    function mapDocClassToType(code) {
        var map = { 'P': 'Ordinary', 'D': 'Diplomatic', 'S': 'Official/Service' };
        return map[code] || '';
    }

    function mapSex(val) {
        if (!val) return '';
        var v = val.toUpperCase();
        if (v === 'M') return 'Male';
        if (v === 'F') return 'Female';
        return '';
    }

    function toTitleCase(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    function setInput(id, value) {
        var el = document.getElementById(id);
        if (el && value) {
            el.value = value;
            console.log('[UIBCP] setInput #' + id + ' =', value);
        } else if (!el) {
            console.warn('[UIBCP] setInput: element #' + id + ' NOT FOUND');
        }
    }

    function setSelect(id, value) {
        var el = document.getElementById(id);
        if (!el) { console.warn('[UIBCP] setSelect: element #' + id + ' NOT FOUND'); return; }
        if (!value) { console.warn('[UIBCP] setSelect: no value provided for #' + id); return; }

        var opts = el.options;
        var v    = value.trim();

        // 1. Exact match
        for (var i = 0; i < opts.length; i++) {
            if (opts[i].value === v) {
                el.value = v;
                console.log('[UIBCP] setSelect #' + id + ' = (exact)', v);
                return;
            }
        }
        // 2. Title-case match
        var tc = toTitleCase(v);
        for (var j = 0; j < opts.length; j++) {
            if (opts[j].value === tc) {
                el.value = tc;
                console.log('[UIBCP] setSelect #' + id + ' = (title-case)', tc);
                return;
            }
        }
        // 3. Case-insensitive match
        var vl = v.toLowerCase();
        for (var k = 0; k < opts.length; k++) {
            if (opts[k].value.toLowerCase() === vl) {
                el.value = opts[k].value;
                console.log('[UIBCP] setSelect #' + id + ' = (case-insensitive)', opts[k].value);
                return;
            }
        }

        console.warn('[UIBCP] setSelect: no dropdown match for "' + v + '" in #' + id);
    }

    // -- OCR: populate form fields from API result --------------------------
    function populateFormFromOCR(result) {
        console.log('[UIBCP] populateFormFromOCR called');

        var fields  = result.fields;
        var surname = getPassportField(fields, 'Surname');
        var given   = getPassportField(fields, 'Given Names');

        console.log('[UIBCP] OCR Surname:', surname, '| Given Names:', given);

        var nameParts  = given.trim().split(/\s+/);
        var firstName  = nameParts[0] || '';
        var middleName = nameParts.slice(1).join(' ');

        // Personal details
        setInput('Surname',    surname);
        setInput('FirstName',  firstName);
        setInput('MiddleName', middleName);
        setInput('DOB',        toInputDate(getPassportField(fields, 'Date of Birth')));
        setInput('PlaceOfBirth', getPassportField(fields, 'Place of Birth'));
        setSelect('Gender',      mapSex(getPassportField(fields, 'Sex')));
        setSelect('Nationality', toTitleCase(getPassportField(fields, 'Nationality')));

        // Passport details
        setInput('PassportNumber',          getPassportField(fields, 'Document Number').toUpperCase());
        setInput('PassportExpDate',         toInputDate(getPassportField(fields, 'Date of Expiry')));
        setInput('PassportDateOfIssue',     toInputDate(getPassportField(fields, 'Date of Issue')));
        setInput('PassportIssuingLocation', getPassportField(fields, 'Place of Birth'));
        setSelect('PassportIssuingCountry', toTitleCase(getPassportField(fields, 'Issuing State Name')));
        setSelect('PassportType',           mapDocClassToType(getPassportField(fields, 'Document Class Code')));

        // Portrait — only set if polling hasn't already loaded the photo
        if (result.portrait) {
            var img = document.getElementById('passportPhoto');
            if (img && !img.src) {
                img.src = 'data:image/jpeg;base64,' + result.portrait;
                img.style.display = 'block';
                var wrap = img.closest('.vpd-photo');
                if (wrap) wrap.classList.add('has-image');
                console.log('[UIBCP] Portrait set from OCR response');
            } else {
                console.log('[UIBCP] Portrait skipped — photo already set by polling');
            }
        }

        console.log('[UIBCP] populateFormFromOCR complete');
    }

    // -- OCR: call API and populate -----------------------------------------
    function showLoader(message) {
        var loader = document.getElementById('vpd-ocr-loader');
        if (!loader) return;
        var text = loader.querySelector('.vpd-loader-text');
        if (text) text.textContent = message || 'Reading passport data…';
        loader.style.display = '';
        console.log('[UIBCP] Loader shown:', message);
    }

    function hideLoader() {
        var loader = document.getElementById('vpd-ocr-loader');
        if (loader) loader.style.display = 'none';
        console.log('[UIBCP] Loader hidden');
    }

    function runPassportOCR(dataUri) {
        console.log('[UIBCP] runPassportOCR called');

        if (!dataUri) {
            console.warn('[UIBCP] runPassportOCR: no dataUri provided — aborted');
            return;
        }

        var mimeMatch = dataUri.match(/^data:([^;]+);base64,/);
        var mimeType  = mimeMatch ? mimeMatch[1] : 'unknown';
        console.log('[UIBCP] Detected mime type:', mimeType);

        if (mimeType === 'application/pdf') {
            console.warn('[UIBCP] PDF detected — confirm OCR API supports raw PDF base64');
        }

        var rawBase64 = dataUri.includes(',') ? dataUri.split(',')[1] : dataUri;
        console.log('[UIBCP] Raw base64 length:', rawBase64.length);

        showLoader('Reading passport data…');

        fetch('https://passportocr.pinpoint.web.za/Passport', {
            method:   'POST',
            headers:  { 'Content-Type': 'application/json' },
            body:     JSON.stringify({ image: rawBase64 }),
            redirect: 'follow'
        })
        .then(function (r) {
            console.log('[UIBCP] OCR API response status:', r.status);
            return r.json();
        })
        .then(function (result) {
            console.log('[UIBCP] OCR API result — overallStatus:', result.overallStatus, '| docType:', result.docType);
            hideLoader();
            if (result.error) {
                console.error('[UIBCP] OCR API returned error:', result.error);
                showLoader('Could not read passport. Please fill in manually.');
                setTimeout(hideLoader, 4000);
                return;
            }
            populateFormFromOCR(result);
        })
        .catch(function (err) {
            console.error('[UIBCP] Passport OCR fetch failed:', err);
            hideLoader();
            showLoader('OCR request failed. Please fill in manually.');
            setTimeout(hideLoader, 4000);
        });
    }

    window.runPassportOCR = runPassportOCR;
    console.log('[UIBCP] runPassportOCR registered on window');

});