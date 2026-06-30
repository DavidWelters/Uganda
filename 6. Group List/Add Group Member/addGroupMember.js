var groupListMembersUrl = '';
var groupsListUrl = '';

// ════════════════════════════════════════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════════════════════════════════════════

function setField(selector, value) {
    if (!value) return;
    var $el = $(selector + ' input');
    if (!$el.length) {
        console.warn('[addGroupMember] field not found in DOM:', selector);
        return;
    }
    $el.val(value).trigger('change');
}

function waitForLookupComplete(callback) {
    var counter      = 0;
    var fallbackTimer;

    function done() {
        clearTimeout(fallbackTimer);
        $(document).off('lookupstarted.agm lookupcomplete.agm');
        callback();
    }

    $(document).on('lookupstarted.agm',  function () { counter++; });
    $(document).on('lookupcomplete.agm', function () {
        if (counter > 0) counter--;
        if (counter === 0) done();
    });

    fallbackTimer = setTimeout(function () {
        console.warn('[addGroupMember] lookup wait timed out — proceeding');
        done();
    }, 5000);
}

// ════════════════════════════════════════════════════════════════════════════
//  Callback Functions
// ════════════════════════════════════════════════════════════════════════════

function updatePassportImage() {
    var value = ($('.passportBase64 textarea').val() || '').trim();
    if (!value) return;

    var src = value.startsWith('data:') ? value : 'data:image/jpeg;base64,' + value;
    $('#passport').attr('src', src).show();
}

function saveAndClose(e) {
    e.preventDefault();
    e.stopPropagation();

    var $btn = $(e.target);
    $btn.prop('disabled', true).text('Saving...');

    $('.Submit').trigger('click');

    waitForLookupComplete(function () {
        window.location.href = groupListMembersUrl;
    });
    return false;
}

// ════════════════════════════════════════════════════════════════════════════
//  DOCUMENT READY
// ═════════════════════════════════════════════════════════════════════════════

$(document).ready(function () {
  $('.Submit').hide(); 
  $('#lookup1609').hide(); //add group memebr Lookup Autofill field

   /* ── Page Url Extraction ───────────────────────────────────────── */
    var url            = new URL(window.location.href);
    var sessionToken   = url.searchParams.get('session')     || '';
    var type           = url.searchParams.get('type')        || '';
    var category       = url.searchParams.get('category')    || '';
    var subcategory    = url.searchParams.get('subcategory') || '';
    var purpose        = url.searchParams.get('purpose')     || '';
    var family         = url.searchParams.get('family')      || '';
    var group          = url.searchParams.get('group')       || '';
    var groupId        = url.searchParams.get('groupId')     || '';
    var passportNumber = url.searchParams.get('passport')    || '';

    groupListMembersUrl = 'https://pinpoint.web.za/Forms/ListGroupMembers'
        + '?session='     + encodeURIComponent(sessionToken)
        + '&type='        + encodeURIComponent(type)
        + '&category='    + encodeURIComponent(category)
        + '&subcategory=' + encodeURIComponent(subcategory)
        + '&purpose='     + encodeURIComponent(purpose)
        + '&family='      + encodeURIComponent(family)
        + '&group='       + encodeURIComponent(group)
        + '&passport='    + encodeURIComponent(passportNumber)
        + '&groupId='     + encodeURIComponent(groupId);

    groupsListUrl = 'https://pinpoint.web.za/Forms/GroupsList'
        + '?session='     + encodeURIComponent(sessionToken)
        + '&type='        + encodeURIComponent(type)
        + '&category='    + encodeURIComponent(category)
        + '&subcategory=' + encodeURIComponent(subcategory)
        + '&purpose='     + encodeURIComponent(purpose)
        + '&family='      + encodeURIComponent(family)
        + '&group='       + encodeURIComponent(group)
        + '&passport='    + encodeURIComponent(passportNumber);

    setTimeout(function () {
        setField('.session',        sessionToken);
        setField('.groupListUrl',   groupListMembersUrl);
        setField('.type',           type);
        setField('.category',       category);
        setField('.subcategory',    subcategory);
        setField('.purpose',        purpose);
        setField('.family',         family);
        setField('.group',          group);
        setField('.groupId',        groupId);
        setField('.passportNumber', passportNumber);
    }, 1000);

  /**
   * The Add Group Member form has a field where you can paste a base64 string of the passport image, 
   * and it will render it on the page. This is to allow copying the image data from the List Group Members page 
   * (which has the base64 string in a hidden field) to the Add Group Member page without having to download 
   * and re-upload the image.
   */
    updatePassportImage();

    var lastBase64 = '';
    setInterval(function () {
        var current = $('.passportBase64 textarea').val() || '';
        if (current !== lastBase64) {
            lastBase64 = current;
            updatePassportImage();
        }
    }, 500);
});

$(document).on('change', '.passportTypeLookup input', function (){
    let passportType = $(this).val().trim();
    if (passportType === '') return;
    groupsListUrl = 'https://pinpoint.web.za/Forms/GroupsList'
        + '?session='     + encodeURIComponent(sessionToken)
        + '&type='        + encodeURIComponent(type)
        + '&category='    + encodeURIComponent(category)
        + '&subcategory=' + encodeURIComponent(subcategory)
        + '&purpose='     + encodeURIComponent(purpose)
        + '&family='      + encodeURIComponent(family)
        + '&group='       + encodeURIComponent(group)
        + '&passport='    + encodeURIComponent(passportNumber);

    setTimeout(function () {
        $('.passportType select').val(passportType).trigger('change');
    },3000);
});

$(document).on('change', '.genderLookup input', function (){
    let gender = $(this).val().trim();
    if (gender === '') return;
    groupsListUrl = 'https://pinpoint.web.za/Forms/GroupsList'
        + '?session='     + encodeURIComponent(sessionToken)
        + '&type='        + encodeURIComponent(type)
        + '&category='    + encodeURIComponent(category)
        + '&subcategory=' + encodeURIComponent(subcategory)
        + '&purpose='     + encodeURIComponent(purpose)
        + '&family='      + encodeURIComponent(family)
        + '&group='       + encodeURIComponent(group)
        + '&passport='    + encodeURIComponent(passportNumber);

    setTimeout(function () {
        $('.gender select').val(gender).trigger('change');
    },1000);
});

$(document).on('change', '.PassportIssueLookup input', function (){
    let passportIssue = $(this).val().trim();
    if (passportIssue === '') return;
    groupsListUrl = 'https://pinpoint.web.za/Forms/GroupsList'
        + '?session='     + encodeURIComponent(sessionToken)
        + '&type='        + encodeURIComponent(type)
        + '&category='    + encodeURIComponent(category)
        + '&subcategory=' + encodeURIComponent(subcategory)
        + '&purpose='     + encodeURIComponent(purpose)
        + '&family='      + encodeURIComponent(family)
        + '&group='       + encodeURIComponent(group)
        + '&passport='    + encodeURIComponent(passportNumber);

    setTimeout(function () {
        $('.passportIssue select').val(passportIssue).trigger('change');
    },1000);
});

$(document).on('change', '.nationalityLookup input', function (){
    let nationality = $(this).val().trim();
    if (nationality === '') return;
    groupsListUrl = 'https://pinpoint.web.za/Forms/GroupsList'
        + '?session='     + encodeURIComponent(sessionToken)
        + '&type='        + encodeURIComponent(type)
        + '&category='    + encodeURIComponent(category)
        + '&subcategory=' + encodeURIComponent(subcategory)
        + '&purpose='     + encodeURIComponent(purpose)
        + '&family='      + encodeURIComponent(family)
        + '&group='       + encodeURIComponent(group)
        + '&passport='    + encodeURIComponent(passportNumber);

    setTimeout(function () {
        $('.nationality select').val(nationality).trigger('change');
    },1000);
});

$(document).on('change', '.countryBirthLookup input', function (){
    let countryBirth = $(this).val().trim();
    if (countryBirth === '') return;
    groupsListUrl = 'https://pinpoint.web.za/Forms/GroupsList'
        + '?session='     + encodeURIComponent(sessionToken)
        + '&type='        + encodeURIComponent(type)
        + '&category='    + encodeURIComponent(category)
        + '&subcategory=' + encodeURIComponent(subcategory)
        + '&purpose='     + encodeURIComponent(purpose)
        + '&family='      + encodeURIComponent(family)
        + '&group='       + encodeURIComponent(group)
        + '&passport='    + encodeURIComponent(passportNumber);

    setTimeout(function () {
        $('.countryBirth select').val(countryBirth).trigger('change');
    },1000);
});

$(document).on('change', '.maritalStatusLookup input', function (){
    let maritalStatus = $(this).val().trim();
    if (maritalStatus === '') return;
    groupsListUrl = 'https://pinpoint.web.za/Forms/GroupsList'
        + '?session='     + encodeURIComponent(sessionToken)
        + '&type='        + encodeURIComponent(type)
        + '&category='    + encodeURIComponent(category)
        + '&subcategory=' + encodeURIComponent(subcategory)
        + '&purpose='     + encodeURIComponent(purpose)
        + '&family='      + encodeURIComponent(family)
        + '&group='       + encodeURIComponent(group)
        + '&passport='    + encodeURIComponent(passportNumber);

    setTimeout(function () {
        $('.maritalStatus select').val(maritalStatus).trigger('change');
    },1000);
});

$(document).on('change', '.countryResidenceLookup input', function (){
    let countryResidence = $(this).val().trim();
    if (countryResidence === '') return;
    groupsListUrl = 'https://pinpoint.web.za/Forms/GroupsList'
        + '?session='     + encodeURIComponent(sessionToken)
        + '&type='        + encodeURIComponent(type)
        + '&category='    + encodeURIComponent(category)
        + '&subcategory=' + encodeURIComponent(subcategory)
        + '&purpose='     + encodeURIComponent(purpose)
        + '&family='      + encodeURIComponent(family)
        + '&group='       + encodeURIComponent(group)
        + '&passport='    + encodeURIComponent(passportNumber);

    setTimeout(function () {
        $('.countryResidence select').val(countryResidence).trigger('change');
    },1000);
});

$(document).on('change', '.countryPhoneNumberLookup input', function (){
    let countryPhoneNumber = $(this).val().trim();
    if (countryPhoneNumber === '') return;
    groupsListUrl = 'https://pinpoint.web.za/Forms/GroupsList'
        + '?session='     + encodeURIComponent(sessionToken)
        + '&type='        + encodeURIComponent(type)
        + '&category='    + encodeURIComponent(category)
        + '&subcategory=' + encodeURIComponent(subcategory)
        + '&purpose='     + encodeURIComponent(purpose)
        + '&family='      + encodeURIComponent(family)
        + '&group='       + encodeURIComponent(group)
        + '&passport='    + encodeURIComponent(passportNumber);

    setTimeout(function () {
        $('.countryPhoneNumber select').val(countryPhoneNumber).trigger('change');
    },1000);
});

$(document).on('change', '.relationshipToMinorLookup input', function (){
    let relationshipToMinor = $(this).val().trim();
    if (relationshipToMinor === '') return;
    groupsListUrl = 'https://pinpoint.web.za/Forms/GroupsList'
        + '?session='     + encodeURIComponent(sessionToken)
        + '&type='        + encodeURIComponent(type)
        + '&category='    + encodeURIComponent(category)
        + '&subcategory=' + encodeURIComponent(subcategory)
        + '&purpose='     + encodeURIComponent(purpose)
        + '&family='      + encodeURIComponent(family)
        + '&group='       + encodeURIComponent(group)
        + '&passport='    + encodeURIComponent(passportNumber);

    setTimeout(function () {
        $('.relationshipToMinor select').val(relationshipToMinor).trigger('change');
    },1000);
});

$(document).on('change', '.countryOfPhoneCodeGuardianLookup input', function (){
    let countryOfPhoneCodeGuardian = $(this).val().trim();
    if (countryOfPhoneCodeGuardian === '') return;
    groupsListUrl = 'https://pinpoint.web.za/Forms/GroupsList'
        + '?session='     + encodeURIComponent(sessionToken)
        + '&type='        + encodeURIComponent(type)
        + '&category='    + encodeURIComponent(category)
        + '&subcategory=' + encodeURIComponent(subcategory)
        + '&purpose='     + encodeURIComponent(purpose)
        + '&family='      + encodeURIComponent(family)
        + '&group='       + encodeURIComponent(group)
        + '&passport='    + encodeURIComponent(passportNumber);

    setTimeout(function () {
        $('.countryOfPhoneCodeGuardian select').val(countryOfPhoneCodeGuardian).trigger('change');
    },1000);
});

$(document).on('change', '.immigrationStatusLookup input', function (){
    let immigrationStatus = $(this).val().trim();
    if (immigrationStatus === '') return;
    groupsListUrl = 'https://pinpoint.web.za/Forms/GroupsList'
        + '?session='     + encodeURIComponent(sessionToken)
        + '&type='        + encodeURIComponent(type)
        + '&category='    + encodeURIComponent(category)
        + '&subcategory=' + encodeURIComponent(subcategory)
        + '&purpose='     + encodeURIComponent(purpose)
        + '&family='      + encodeURIComponent(family)
        + '&group='       + encodeURIComponent(group)
        + '&passport='    + encodeURIComponent(passportNumber);

    setTimeout(function () {
        $('.immigrationStatus select').val(immigrationStatus).trigger('change');
    },1000);
});

function returnToMemberList() {
    window.location.href = groupListMembersUrl;
}

function returnToGroups() {
    window.location.href = groupsListUrl;
}