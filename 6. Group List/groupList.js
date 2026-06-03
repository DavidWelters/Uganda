// ════════════════════════════════════════════════════════════════════════════
//  FIELD ID MAP
// ════════════════════════════════════════════════════════════════════════════
const F = {
    sessionToken: '#q15',   // ← confirm this is your session token field ID
    addButton:    '#q10',   // ← confirm this is your Add Group button field ID
};

// ─── Table column positions (0-based td index within a data row) ──────────
const COL = {
    groupName:     0,
    type:          1,
    status:        2,
    contactPerson: 3,
    memberType:    4,
    // 5 = Edit   (button injected by editGroup)
    // 6 = Remove (button injected by removeGroup)
    groupId:       7,
};

// ════════════════════════════════════════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════════════════════════════════════════

function makeEditButton() {
    let $btn = $('<button type="button" aria-label="Edit group"></button>').css({
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
    let $btn = $('<button type="button" aria-label="Remove group"></button>').css({
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        border: "1.5px solid #9e9e9e", padding: "4px 6px", margin: "0",
        borderRadius: "4px", cursor: "pointer", backgroundColor: "#fff",
        color: "#bbb", boxShadow: "none",
        transition: "border-color 0.15s ease, color 0.15s ease, background-color 0.15s ease"
    });
    $btn.html(`<svg width="13" height="13" viewBox="0 0 16 16" fill="none"
               xmlns="http://www.w3.org/2000/svg">
               <path d="M2 2l12 12M14 2L2 14"
                stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
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

function editGroup() {
    $('#q4 tbody tr').each(function () {
        let $row  = $(this);
        let $cell = $row.find('.editGroup');
        let editCheckbox = $cell.find('input[type="checkbox"]');

        if (!editCheckbox.length)              return;
        if (editCheckbox.data("btn-injected")) return;
        editCheckbox.data("btn-injected", true);

        $cell.find('fieldset, .choice').hide();
        $cell.find('.cf-field').css({ height: '0', overflow: 'hidden', margin: '0', padding: '0' });

        let $btn = makeEditButton();
        $cell.find('.cf-field').before($btn);

        $btn.on("click", function () {
            let sessionToken = $(F.sessionToken + ' input').val() || '';
            let groupId      = $row.find('.groupId input').val() || '';

            if (!groupId) { alert('Group ID unknown.'); return; }

            window.location.href = 'https://lf.automatenow.co.za/Forms/ManageGroup'
                + '?token='   + encodeURIComponent(sessionToken)
                + '&groupId=' + encodeURIComponent(groupId);
        });
    });
}

function removeGroup() {
    $('#q4 tbody tr').each(function () {
        let $row      = $(this);
        let $cell     = $row.find('.removeGroup');
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
    $('#q4 .cf-table-add-row').hide();
    $('#q4 .cf-table-delete').hide();
}

// ════════════════════════════════════════════════════════════════════════════
//  MUTATION OBSERVER  ── re-inject buttons whenever LF re-renders rows
// ════════════════════════════════════════════════════════════════════════════

let _reinjectTimer = null;

function scheduleReinject() {
    clearTimeout(_reinjectTimer);
    _reinjectTimer = setTimeout(function () {
        editGroup();
        removeGroup();
        hideNativeControls();
    }, 150);
}

function observeGroupTable() {
    let attempts     = 0;
    let waitForTable = setInterval(function () {
        let target = document.querySelector('#q4 tbody');
        attempts++;

        if (target) {
            clearInterval(waitForTable);
            new MutationObserver(scheduleReinject)
                .observe(target, { childList: true, subtree: true, attributes: true });
        } else if (attempts > 40) {
            clearInterval(waitForTable);
            console.warn('[groupList] Could not find #q4 tbody to observe.');
        }
    }, 100);
}

function waitForLookupComplete(callback) {
    var counter = 0;
    var maxWait = 15000;
    var fallbackTimer = null;

    function done() {
        clearTimeout(fallbackTimer);
        $(document).off('lookupstarted.wflc lookupcomplete.wflc');
        callback();
    }

    $(document).on('lookupstarted.wflc', function () { counter++; });
    $(document).on('lookupcomplete.wflc', function () {
        if (counter > 0) counter--;
        if (counter === 0) done();
    });

    fallbackTimer = setTimeout(function () {
        console.warn('Lookup wait timed out, proceeding anyway');
        done();
    }, maxWait);
}

function saveAndClose(e) {
    e.preventDefault();
    e.stopPropagation();

    var $btn = $(e.target);
    $btn.prop('disabled', true).text('Saving...');

    $('.Submit').trigger('click');
    setTimeout(function () { window.close(); }, 2000);
    return false;
}

// ════════════════════════════════════════════════════════════════════════════
//  ADD GROUP BUTTON CLICK
// ════════════════════════════════════════════════════════════════════════════

$(document).on('click', '.addgroupbutton button, ' + F.addButton + ' button', function () {

    if ($(this).attr('onclick')) return;

    let sessionToken = $(F.sessionToken + ' input').val().trim();

    window.location.href = 'https://lf.automatenow.co.za/Forms/ManageGroup'
        + '?token=' + encodeURIComponent(sessionToken);
});

// ════════════════════════════════════════════════════════════════════════════
//  DOCUMENT READY
// ════════════════════════════════════════════════════════════════════════════

$(document).ready(function () {
  $('.Submit').hide(); 
    const url   = new URL(window.location.href);
    const token = url.searchParams.get('token');

    setTimeout(function () {
        if (token) {
             $(F.sessionToken + ' input').val(token).change();
        }
    }, 1000);

    editGroup();
    removeGroup();
    hideNativeControls();
    observeGroupTable();
});
