var groupMemberList = '';
var GroupList = '';
var previousUrl = '';

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

    GroupList = 'https://pinpoint.web.za/Forms/GroupsList'
        + '?session='     + encodeURIComponent(sessionToken)
        + '&type='        + encodeURIComponent(type)
        + '&category='    + encodeURIComponent(category)      
        + '&subcategory=' + encodeURIComponent(subcategory)
        + '&purpose='     + encodeURIComponent(purpose)       
        + '&family='      + encodeURIComponent(family || '')
        + '&group='       + encodeURIComponent(group || '')
        + '&passport='    + encodeURIComponent(passportNumber || '');

    $('.Submit').trigger('click');

    waitForLookupComplete(function () {
        window.location.href = GroupList;
    });
    return false;
}

function returnToList() {
    window.location.href = previousUrl;
}

function setField(selector, value) {
    if (!value) return;
    var $el = $(selector + ' input');
    if (!$el.length) {
        console.warn('[manageGroup] field not found in DOM:', selector);
        return;
    }
    $el.val(value).trigger('change');
}

$(document).ready(function () {
    $('.Submit').hide();
    $('button:contains("Leave Group")').hide();

    /* ── Page Url Extraction ───────────────────────────────────────── */
    let url            = new URL(window.location.href);
    let sessionToken   = url.searchParams.get('session')     || '';
    let type           = url.searchParams.get('type')        || '';
    let category       = url.searchParams.get('category')    || '';
    let subcategory    = url.searchParams.get('subcategory') || '';
    let purpose        = url.searchParams.get('purpose')     || '';
    let family         = url.searchParams.get('family')      || '';
    let group          = url.searchParams.get('group')       || '';
    let groupId        = url.searchParams.get('groupId')     || '';
    let passportNumber = url.searchParams.get('passport')    || '';

    previousUrl = 'https://pinpoint.web.za/Forms/GroupsList'
        + '?session='     + encodeURIComponent(sessionToken)
        + '&type='        + encodeURIComponent(type)
        + '&category='    + encodeURIComponent(category)
        + '&subcategory=' + encodeURIComponent(subcategory)
        + '&purpose='     + encodeURIComponent(purpose)
        + '&family='      + encodeURIComponent(family)
        + '&group='       + encodeURIComponent(group)
        + '&passport='    + encodeURIComponent(passportNumber);

    groupMemberList = 'https://pinpoint.web.za/Forms/ListGroupMembers'
        + '?session='     + encodeURIComponent(sessionToken)
        + '&type='        + encodeURIComponent(type)
        + '&category='    + encodeURIComponent(category)
        + '&subcategory=' + encodeURIComponent(subcategory)
        + '&purpose='     + encodeURIComponent(purpose)
        + '&family='      + encodeURIComponent(family)
        + '&group='       + encodeURIComponent(group)
        + '&passport='    + encodeURIComponent(passportNumber)
        + '&groupId='     + encodeURIComponent(groupId);

    setTimeout(function () {
        setField('.session',     sessionToken);
        setField('.previousUrl', previousUrl);
        setField('.type',        type);
        setField('.category',    category);
        setField('.subcategory', subcategory);
        setField('.purpose',     purpose);
        setField('.family',      family);
        setField('.group',       group);
        setField('.groupId',     groupId);
    }, 1000);

    $(document).on('click', 'button:contains("Return To List")', function () {
        window.location.href = previousUrl;
    });

    $(document).on('click', 'button:contains("Members")', function () {
        window.location.href = groupMemberList;
    });
});

$(document).on('change', '.countryPhoneCodeLookup input', function () {
    var phoneCode = $(this).val().trim();
    var $select = $('.countryOfPhoneCode select');
    if (phoneCode && $select.find('option[value="' + phoneCode + '"]').length === 0) {
        $select.append($('<option>', { value: phoneCode, text: phoneCode }));
    }
    $select.val(phoneCode).trigger('change');
});

$(document).on('change', '.groupTypeLookup input', function () {
    var groupType = $(this).val().trim();
    var $select = $('.groupType select');
    if (groupType && $select.find('option[value="' + groupType + '"]').length === 0) {
        $select.append($('<option>', { value: groupType, text: groupType }));
    }
    $select.val(groupType).trigger('change');
});

$(document).on('change', '.principalToken input', function () {
    var principalToken = $(this).val().trim();
    var sessionToken   = $('.session input').val().trim();
    if (principalToken && principalToken !== sessionToken) {
        $('button:contains("Leave Group")').show();
    } else {
        $('button:contains("Leave Group")').hide();
    }
});

$(document).on('change', '.statusLookUp input', function () {
    var groupStatus = $(this).val().trim();
    $('.groupStatus input[type="radio"]')
        .filter(function () { return $(this).val() === groupStatus; })
        .prop('checked', true)
        .trigger('change');
});
