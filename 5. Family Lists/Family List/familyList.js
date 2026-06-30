// ════════════════════════════════════════════════════════════════════════════
//  FIELD ID MAP
// ════════════════════════════════════════════════════════════════════════════
const F = {
    passportNumber: '#q11',
    addButton:      '#q12',
    sessionToken:   '#q13',
    passportTrue:   '#q17',
    foundPersonId:  '#q18',
    addResult:      '#q19',
    foundFirstName: '#q20',
    foundSurname:   '#q21',
    foundDOB:       '#q24',
    foundGender:    '#q23',
};

// ─── Table column positions (0-based td index within a data row) ──────────
const COL = {
    firstName:    0,
    surname:      1,
    dob:          2,
    gender:       3,
    relationship: 4,
    docs:         5,
    // 6 = Edit   (button injected by editFamilyMember)
    // 7 = Remove (button injected by removeFamilyMember)
    personId:     8,
};

// ════════════════════════════════════════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════════════════════════════════════════

function openPopup(url) {
    let width  = 800, height = 800;
    let left   = (window.innerWidth  / 2) - (width  / 2);
    let top    = (window.innerHeight / 2) - (height / 2);
    window.open(url, 'familyWindow',
        `width=${width},height=${height},top=${top},left=${left}`);
}

function makeEditButton() {
    let $btn = $('<button type="button" aria-label="Edit family member"></button>').css({
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        border: "1.5px solid #9e9e9e", padding: "4px 6px", margin: "0",
        borderRadius: "4px", cursor: "pointer", backgroundColor: "#fff",
        color: "#555", boxShadow: "none",
        transition: "border-color 0.15s ease, color 0.15s ease"
    });
    $btn.html(`<svg width="13" height="13" viewBox="0 0 16 16" fill="none"
               xmlns="http://www.w3.org/2000/svg">
               <path d="M11.5 1.5l3 3-9 9H2.5v-3l9-9z"
                stroke="currentColor" stroke-width="1.6"
                stroke-linecap="round" stroke-linejoin="round"/>
               <path d="M9.5 3.5l3 3"
                stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
               </svg>`);
    $btn.on("mouseenter",  function () { $(this).css({ borderColor: "#c0392b", color: "#c0392b" }); })
        .on("mouseleave",  function () { $(this).css({ borderColor: "#9e9e9e", color: "#555"    }); })
        .on("mousedown",   function () { $(this).css({ backgroundColor: "#fdf0f0" }); })
        .on("mouseup",     function () { $(this).css({ backgroundColor: "#fff"    }); });
    return $btn;
}

function makeRemoveButton() {
    let $btn = $('<button type="button" aria-label="Remove family member"></button>').css({
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        border: "1.5px solid #9e9e9e", padding: "4px 6px", margin: "0",
        borderRadius: "4px", cursor: "pointer", backgroundColor: "#fff",
        color: "#bbb", boxShadow: "none",
        transition: "border-color 0.15s ease, color 0.15s ease, background-color 0.15s ease"
    });
    $btn.html(`<svg width="13" height="14" viewBox="0 0 14 16" fill="none"
               xmlns="http://www.w3.org/2000/svg">
               <path d="M1 4h12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
               <path d="M5 4V2.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5V4"
                stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
               <path d="M10 4l-.5 9H4.5L4 4"
                stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
               </svg>`);
    $btn.on("mouseenter", function () { if (!$(this).data("selected")) $(this).css({ borderColor: "#c0392b", color: "#c0392b" }); })
        .on("mouseleave", function () { if (!$(this).data("selected")) $(this).css({ borderColor: "#9e9e9e", color: "#bbb"    }); });
    return $btn;
}

function applyRemoveState($btn, selected) {
    $btn.data("selected", selected);
    $btn.css(selected
        ? { backgroundColor: "#fdf0f0", borderColor: "#c0392b", color: "#c0392b" }
        : { backgroundColor: "#fff",    borderColor: "#9e9e9e", color: "#bbb"    });
}

// ════════════════════════════════════════════════════════════════════════════
//  EDIT / REMOVE BUTTON INJECTION
// ════════════════════════════════════════════════════════════════════════════

function editFamilyMember() {
    $('.familyMember tbody tr').each(function () {
        let $row  = $(this);
        let $cell = $row.find('.editFamilyMember');
        let editCheckbox = $cell.find('input[type="checkbox"]');

        if (!editCheckbox.length)              return;
        if (editCheckbox.data("btn-injected")) return;
        editCheckbox.data("btn-injected", true);

        $cell.find('fieldset, .choice').hide();
        $cell.find('.cf-field').css({ height: '0', overflow: 'hidden', margin: '0', padding: '0' });

        let $btn = makeEditButton();
        $cell.find('.cf-field').before($btn);

        $btn.on("click", function () {
            let personId     = $row.find('.personId input').val() || '';
            let sessionToken = $(F.sessionToken + ' input').val() || '';

            if (!personId) { alert('Person ID unknown.'); return; }

            window.location.href = 'https://pinpoint.web.za/Forms/ManageFamily'
                + '?token='    + encodeURIComponent(sessionToken)
                + '&personId=' + encodeURIComponent(personId);
        });
    });
}

function removeFamilyMember() {
    $('.familyMember tbody tr').each(function () {
        let $row      = $(this);
        let $cell     = $row.find('.removeFamilyMember');
        let $checkbox = $cell.find('input[type="checkbox"]');

        if (!$checkbox.length)              return;
        if ($checkbox.data("btn-injected")) return;
        $checkbox.data("btn-injected", true);

        $cell.find('fieldset, .choice').hide();
        $cell.find('.cf-field').css({ height: '0', overflow: 'hidden', margin: '0', padding: '0' });

        let $btn = makeRemoveButton();
        $cell.find('.cf-field').before($btn);
        applyRemoveState($btn, $checkbox.is(':checked'));

        $btn.on("click", function () {
            let nowSelected = !$btn.data("selected");
            $checkbox.prop("checked", nowSelected).trigger("change");
            applyRemoveState($btn, nowSelected);
        });
    });
}

// ════════════════════════════════════════════════════════════════════════════
//  HIDE LASERFICHE'S BUILT-IN ADD ROW + ROW DELETE BUTTONS
// ════════════════════════════════════════════════════════════════════════════

function hideNativeControls() {
    $('.familyMember .cf-table-add-row').hide();          // bottom Add button
    $('.familyMember .cf-table-delete').hide();           // per-row × buttons
}

// ════════════════════════════════════════════════════════════════════════════
//  TABLE ROW STYLING — badges, merged name/DOB display, docs count
// ════════════════════════════════════════════════════════════════════════════

function styleTableRows() {
    $('.familyMember tbody tr').each(function () {
        let $row   = $(this);
        let $cells = $row.find('td');

        if ($cells.length < 6) return;

        let firstName    = $cells.eq(COL.firstName)   .find('input:not([type="checkbox"])').val() || '';
        let surname      = $cells.eq(COL.surname)     .find('input:not([type="checkbox"])').val() || '';
        let dob          = $cells.eq(COL.dob)         .find('input:not([type="checkbox"])').val() || '';
        let gender       = $cells.eq(COL.gender)      .find('input:not([type="checkbox"])').val() || '';
        let relationship = $cells.eq(COL.relationship).find('input:not([type="checkbox"])').val() || '';
        let docs         = $cells.eq(COL.docs)        .find('input:not([type="checkbox"])').val() || '0';

        if (!firstName && !surname) return; // skip blank placeholder rows

        // ── 1. Member cell: combined name + DOB ────────────────────────
        /*let $firstCell = $cells.eq(COL.firstName);
        $firstCell.find('.cf-field').hide();
        if (!$firstCell.find('.member-display').length) {
            $firstCell.append(
                '<div class="member-display">' +
                  '<div class="member-name"></div>' +
                  '<div class="member-dob"></div>' +
                '</div>'
            );
        }
        $firstCell.find('.member-name').text((firstName + ' ' + surname).trim());
        $firstCell.find('.member-dob').text(dob ? 'Date of birth: ' + dob : 'Date of birth: –');*/

        // ── 2. Gender badge ─────────────────────────────────────────────
        let $gCell    = $cells.eq(COL.gender);
        $gCell.find('.cf-field').hide();
        let gMap = { female: 'badge-female', male: 'badge-male' };
        let gc   = gMap[gender.toLowerCase()] || 'badge-neutral';
        if (!$gCell.find('.gender-badge').length) {
            $gCell.append('<span class="badge-pill gender-badge"></span>');
        }
        $gCell.find('.gender-badge')
            .attr('class', 'badge-pill gender-badge ' + gc)
            .text(gender || '–');

        // ── 3. Relationship badge ────────────────────────────────────────
        let $rCell = $cells.eq(COL.relationship);
        $rCell.find('.cf-field').hide();
        let rMap = { spouse: 'badge-spouse', child: 'badge-child', parent: 'badge-parent', sibling: 'badge-sibling' };
        let rc   = rMap[relationship.toLowerCase()] || 'badge-other';
        if (!$rCell.find('.rel-badge').length) {
            $rCell.append('<span class="badge-pill rel-badge"></span>');
        }
        $rCell.find('.rel-badge')
            .attr('class', 'badge-pill rel-badge ' + rc)
            .text(relationship || '–');

        // ── 4. Docs count ────────────────────────────────────────────────
        let $dCell = $cells.eq(COL.docs);
        $dCell.find('.cf-field').hide();
        if (!$dCell.find('.docs-count').length) {
            $dCell.append('<span class="docs-count"></span>');
        }
        $dCell.find('.docs-count').text(docs);
    });
}

function styleTableHeaders() {
    let $th = $('.familyMember thead th');
    if (!$th.length) return;
    $th.eq(COL.firstName)   .text('Member');
    $th.eq(COL.gender)      .text('Gender');
    $th.eq(COL.relationship).text('Relationship');
    $th.eq(COL.docs)        .text('Linked Docs');
    $th.eq(6)               .text('');
    $th.eq(7)               .text('Actions');
}

// ════════════════════════════════════════════════════════════════════════════
//  MUTATION OBSERVER  ── re-inject buttons whenever LF re-renders rows
// ════════════════════════════════════════════════════════════════════════════

let _reinjectTimer = null;

function scheduleReinject() {
    clearTimeout(_reinjectTimer);
    _reinjectTimer = setTimeout(function () {
        editFamilyMember();
        removeFamilyMember();
        hideNativeControls();
        styleTableRows();
        styleTableHeaders();
    }, 150);
}

function observeFamilyTable() {
    let attempts     = 0;
    let waitForTable = setInterval(function () {
        let target = document.querySelector('.familyMember tbody');
        attempts++;

        if (target) {
            clearInterval(waitForTable);
            new MutationObserver(scheduleReinject)
                .observe(target, { childList: true, subtree: true, attributes: true });
            console.log('[familyList] MutationObserver attached to .familyMember tbody');
        } else if (attempts > 40) {
            clearInterval(waitForTable);
            console.warn('[familyList] Could not find .familyMember tbody to observe.');
        }
    }, 100);
}

// ════════════════════════════════════════════════════════════════════════════
//  ADD ROW TO LASERFICHE TABLE
// ════════════════════════════════════════════════════════════════════════════

function addRowToFamilyTable(firstName, surname, dob, gender, personId) {

    // ── 1. Click Laserfiche's own Add-row button (even though it's hidden) ─
    $('.familyMember .cf-table-add-row button').first().click();

    // ── 2. Wait for the new row to render ──────────────────────────────────
    setTimeout(function () {

        let $rows   = $('.familyMember tbody tr');
        let $newRow = $rows.last();

        if (!$newRow.length) {
            console.warn('[familyList] addRowToFamilyTable: no row found after Add click.');
            return;
        }

        let $cells = $newRow.find('td');

        function setField(colIndex, value) {
            if (!value) return;
            let $td    = $cells.eq(colIndex);
            let $input = $td.find('input').not('[type="checkbox"]');
            if ($input.length) {
                $input.val(value).trigger('change');
            }
        }

        setField(COL.firstName,    firstName);
        setField(COL.surname,      surname);
        setField(COL.dob,          dob);
        setField(COL.gender,       gender);
        setField(COL.relationship, '');
        setField(COL.docs,         '0');
        setField(COL.personId,     personId);

        // Observer will re-inject buttons automatically;
        // call directly as well for instant feedback
        editFamilyMember();
        removeFamilyMember();
        hideNativeControls();
        styleTableRows();
        styleTableHeaders();

        console.log('[familyList] Row added for personId=' + personId);

    }, 400);
}

// ════════════════════════════════════════════════════════════════════════════
//  TRIGGER SUBMIT
// ════════════════════════════════════════════════════════════════════════════

//Triggers the submit function when the submit CSS button is clicked
function triggerSubmit(){
    //applicantUrl = 'https://pinpoint.web.za/Forms/SingleApplication?session=';  
    let sessionToken = $('.session input').val() || '';
    let type  = $('.type input').val() || '';
    let category = $('.category input').val() || '';
    let subcategory = $('.subcategory input').val() || '';
    let purpose = $('.purpose input').val() || '';
    let family = $('.family input').val() || '';
    let group = $('.group input').val() || '';

    let applicantUrl = 'https://pinpoint.web.za/Forms/NewVisaApplicationSingle'
        + '?session='     + encodeURIComponent(sessionToken)
        + '&type='        + encodeURIComponent(type)
        + '&category='    + encodeURIComponent(category)      
        + '&subcategory=' + encodeURIComponent(subcategory)
        + '&purpose='     + encodeURIComponent(purpose)       
        + '&family='      + encodeURIComponent(family || '')
        + '&group='       + encodeURIComponent(group || '')

    $('.applicantUrl input').val(applicantUrl).change();
    $('.Submit').trigger('click');    
};

// ════════════════════════════════════════════════════════════════════════════
//  ADD FAMILY MEMBER BUTTON CLICK
// ════════════════════════════════════════════════════════════════════════════

$(document).on('click', '.addfamilybutton button, ' + F.addButton + ' button', function () {

    if ($(this).attr('onclick')) return;

    let sessionToken = $('.session input').val() || '';
    let type  = $('.type input').val() || '';
    let category = $('.category input').val() || '';
    let subcategory = $('.subcategory input').val() || '';
    let purpose = $('.purpose input').val() || '';
    let family = $('.family input').val() || '';
    let group = $('.group input').val() || '';
    let passportNumber = ($('.passportNumber input').val() || '').trim();
    let passportTrue   = ($('.passportTrue input').val() || '').trim();
    let foundPersonId  = ($('.foundPersonId input').val() || '').trim();
    console.log('Add Family Member clicked:', { sessionToken, type, category, subcategory, purpose, family, group, passportNumber, passportTrue, foundPersonId });

    let addFamilyMemberUrl = 'https://pinpoint.web.za/Forms/AddManageFamily'
        + '?session='     + encodeURIComponent(sessionToken)
        + '&type='        + encodeURIComponent(type)
        + '&category='    + encodeURIComponent(category)      
        + '&subcategory=' + encodeURIComponent(subcategory)
        + '&purpose='     + encodeURIComponent(purpose)       
        + '&family='      + encodeURIComponent(family || '')
        + '&group='       + encodeURIComponent(group || '')
        + '&passport='    + encodeURIComponent(passportNumber || '');

    if (!passportNumber) {
        alert('Please enter a passport number first.');
        return;
    }

    if (passportTrue === '1' && foundPersonId) {

        // ── Person EXISTS in DB → call sp_AddExistingPersonToFamily ────────
        let checkCount = 0;
        let maxChecks  = 30;

        $('.addResult input').val('').change();
        $('.foundPersonId input').change();

        let poll = setInterval(function () {
            checkCount++;
            let result = $('.addResult input').val().trim();

            if (result === 'SUCCESS' || result === 'EXISTS') {
                clearInterval(poll);

                if (result === 'SUCCESS') {
                    let firstName = $('.foundFirstName input').val().trim();
                    let surname   = $('.foundSurname   input').val().trim();
                    let dob       = $('.foundDOB       input').val().trim();
                    let gender    = $('.foundGender    input').val().trim();

                    addRowToFamilyTable(firstName, surname, dob, gender, foundPersonId);
                }

                $('.passportNumber input').val('').change();
                $('.passportTrue   input').val('').change();
                $('.foundPersonId  input').val('').change();
                $('.addResult      input').val('').change();
                $('.foundFirstName input').val('').change();
                $('.foundSurname   input').val('').change();
                $('.foundDOB       input').val('').change();
                $('.foundGender    input').val('').change();

                if (result === 'EXISTS') {
                    alert('This person is already in your family list.');
                }

            } else if (result === 'FAILED' || checkCount >= maxChecks) {
                clearInterval(poll);
                alert(result === 'FAILED'
                    ? 'Could not add family member. Please try again.'
                    : 'Request timed out. Please try again.');
            }
        }, 100);

    } else {

        // ── Person NOT in DB → navigate to AddManageFamily ────────────────
        window.location.href = addFamilyMemberUrl;
    }
});

// ════════════════════════════════════════════════════════════════════════════
//  DOCUMENT READY
// ════════════════════════════════════════════════════════════════════════════

$(document).ready(function(){
    /* ── Passport Number injection ───────────────────────────────────────── */
    var url    = new URL(window.location.href);
    console.log('Current URL:', url.href);   
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
            $('.session input').val(sessionToken).change();
        }, 1000);
    }
       
    if (type) {
        setTimeout(function () {
            $('.type input').val(type).change();
        }, 1000);
    }

    if (category) {
        setTimeout(function () {
            $('.category input').val(category).change();
        }, 1000);
    }

    if (subcategory) {
        setTimeout(function () {
            $('.subcategory input').val(subcategory).change();
        }, 1000);
    }
    
    if (purpose) {
        setTimeout(function () {
            $('.purpose input').val(purpose).change();
        }, 1000);
    }
    
    if (family) {
        setTimeout(function () {
            $('.family input').val(family).change();
        }, 1000);
    }
    
    if (group) {
        setTimeout(function () {
            $('.group input').val(group).change();
        }, 1000);
    }

    editFamilyMember();
    removeFamilyMember();
    hideNativeControls();
    styleTableRows();
    styleTableHeaders();
    observeFamilyTable();
});