// ════════════════════════════════════════════════════════════════════════════
//  Functions
// ════════════════════════════════════════════════════════════════════════════

function makeEditButton() {
    let $btn = $('<button type="button" aria-label="Edit group member"></button>').css({
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
    let $btn = $('<button type="button" aria-label="Remove group member"></button>').css({
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

function editGroupMember() {
    $('.listOfMembers tbody tr').each(function () {
        let $row  = $(this);
        let $cell = $row.find('.editGroupMember');
        let $checkbox = $cell.find('input[type="checkbox"]');

        if (!$checkbox.length)              return;
        if ($checkbox.data("btn-injected")) return;
        $checkbox.data("btn-injected", true);

        $cell.find('fieldset, .choice').hide();
        $cell.find('.cf-field').css({ height: '0', overflow: 'hidden', margin: '0', padding: '0' });

        let $btn = makeEditButton();
        $cell.find('.cf-field').before($btn);

        $btn.on("click", function () {

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
            let groupId = ($('.groupId input').val() || '').trim();
            let selectedGroupId = $('.selectedGroupId input').val().trim();
            let passPortNumber = $('.passportNumber input').val().trim();  
            let userId       = $row.find('.userId input').val() || '';
            let userPassport   = $row.find('.userPassportNumber input').val() || '';

            let editGroupMember = 'https://pinpoint.web.za/Forms/ManageGroupMember'
                + '?session='     + encodeURIComponent(sessionToken)
                + '&type='        + encodeURIComponent(type)
                + '&category='    + encodeURIComponent(category)      
                + '&subcategory=' + encodeURIComponent(subcategory)
                + '&purpose='     + encodeURIComponent(purpose)       
                + '&family='      + encodeURIComponent(family || '')
                + '&group='       + encodeURIComponent(group || '')
                + '&passport='    + encodeURIComponent(passportNumber || '')
                + '&groupId='     + encodeURIComponent(groupId || '')
                + '&selectedGroupId=' + encodeURIComponent(selectedGroupId || '')
                + '&userId='      + encodeURIComponent(userId || '')
                + '&userPassport=' + encodeURIComponent(userPassport || '')
                + '&passportNumber=' + encodeURIComponent(passportNumber || '');

            if (!userId) { alert('User ID unknown.'); return; }

            window.location.href = editGroupMember;
        });
    });
}

function removeGroupMember() {
    $('.listOfMembers tbody tr').each(function () {
        let $row      = $(this);
        let $cell     = $row.find('.removeGroupMember');
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
    $('.listOfMembers .cf-table-add-row').hide();
    $('.listOfMembers .cf-table-delete').hide();
}

// ════════════════════════════════════════════════════════════════════════════
//  MUTATION OBSERVER  ── re-inject buttons whenever LF re-renders rows
// ════════════════════════════════════════════════════════════════════════════

let _reinjectTimer = null;

function scheduleReinject() {
    clearTimeout(_reinjectTimer);
    _reinjectTimer = setTimeout(function () {
        editGroupMember();
        removeGroupMember();
        hideNativeControls();
    }, 150);
}

function observeMemberTable() {
    let attempts     = 0;
    let waitForTable = setInterval(function () {
        let target = document.querySelector('.listOfMembers tbody');
        attempts++;

        if (target) {
            clearInterval(waitForTable);
            new MutationObserver(scheduleReinject)
                .observe(target, { childList: true, subtree: true, attributes: true });
        } else if (attempts > 40) {
            clearInterval(waitForTable);
            console.warn('[groupMemberList] Could not find .listOfMembers tbody to observe.');
        }
    }, 100);
}

// ════════════════════════════════════════════════════════════════════════════
//  Callback Functions
// ════════════════════════════════════════════════════════════════════════════


function addGroupMember(){
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
    let groupId = ($('.groupId input').val() || '').trim();
    let selectedGroupId = $('.selectedGroupId input').val().trim();
    let passPortNumber = $('.passportNumber input').val().trim();  

    if(!passPortNumber || !selectedGroupId) {
        alert('Passport number and Group ID are required to add a member.');
        return;
    }

    let addGroupMember = 'https://pinpoint.web.za/Forms/AddGroupMember'
        + '?session='     + encodeURIComponent(sessionToken)
        + '&type='        + encodeURIComponent(type)
        + '&category='    + encodeURIComponent(category)      
        + '&subcategory=' + encodeURIComponent(subcategory)
        + '&purpose='     + encodeURIComponent(purpose)       
        + '&family='      + encodeURIComponent(family || '')
        + '&group='       + encodeURIComponent(group || '')
        + '&passport='    + encodeURIComponent(passportNumber || '')
        + '&groupId='     + encodeURIComponent(groupId || '')
        + '&selectedGroupId=' + encodeURIComponent(selectedGroupId || '');
    
    window.location.href = addGroupMember;
}

function returnToGroups() {
    window.location.href = groupsListUrl;
}

// ════════════════════════════════════════════════════════════════════════════
//  DOCUMENT READY
// ════════════════════════════════════════════════════════════════════════════

$(document).ready(function () {
    $('.Submit').hide();
     /* ── Page Url Extraction ───────────────────────────────────────── */
    let url             = new URL(window.location.href);
    let sessionToken    = url.searchParams.get('session')     || '';
    let type            = url.searchParams.get('type')        || '';
    let category        = url.searchParams.get('category')    || '';
    let subcategory     = url.searchParams.get('subcategory') || '';
    let purpose         = url.searchParams.get('purpose')     || '';
    let family          = url.searchParams.get('family')      || '';
    let group           = url.searchParams.get('group')       || '';
    let groupId         = url.searchParams.get('groupId')     || '';

    groupsListUrl = 'https://pinpoint.web.za/Forms/GroupsList'
        + '?session='     + encodeURIComponent(sessionToken)
        + '&type='        + encodeURIComponent(type)
        + '&category='    + encodeURIComponent(category)
        + '&subcategory=' + encodeURIComponent(subcategory)
        + '&purpose='     + encodeURIComponent(purpose)
        + '&family='      + encodeURIComponent(family)
        + '&group='       + encodeURIComponent(group);

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
    
    if (groupId) {
        setTimeout(function () {
            $('.groupId input').val(groupId).change();
        }, 1000);
    }

    editGroupMember();
    removeGroupMember();
    hideNativeControls();
    observeMemberTable();
});

$(document).on('change', '.groupNameToken input', function (){
    let groupName = $(this).val().trim();
    setTimeout(function () {
        $('.groupName select').val(groupName).trigger('change');
    },2000);
});

