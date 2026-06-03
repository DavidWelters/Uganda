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

    var token = new URL(window.location.href).searchParams.get('token') || '';

    $('.Submit').trigger('click');

    waitForLookupComplete(function () {
        window.location.href = 'https://lf.automatenow.co.za/Forms/GroupList'
            + '?token=' + encodeURIComponent(token);
    });
    return false;
}

// ════════════════════════════════════════════════════════════════════════════
//  DOCUMENT READY
// ═════════════════════════════════════════════════════════════════════════════

$(document).ready(function () {
  $('.Submit').hide(); 
  $('#lookup1609').hide(); //add group memebr Lookup Autofill field

  /* ── Token injection ─────────────────────────────────────── */
  var url      = new URL(window.location.href);
  var token    = url.searchParams.get('token');
  var groupId = url.searchParams.get('groupId');
  var passportNumber = url.searchParams.get('passportNumber');

  if (token) {
    setTimeout(function () {
        $('.sessionToken input').val(token).change();
        $('.groupId input').val(groupId).change();
        $('.passportNumber input').val(passportNumber).change();
    }, 1000);
  }
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
    setTimeout(function () {
        $('.passportType select').val(passportType).trigger('change');
    },3000);
});

$(document).on('change', '.genderLookup input', function (){
    let gender = $(this).val().trim();
    setTimeout(function () {
        $('.gender select').val(gender).trigger('change');
    },1000);
});

$(document).on('change', '.PassportIssueLookup input', function (){
    let passportIssue = $(this).val().trim();
    setTimeout(function () {
        $('.passportIssue select').val(passportIssue).trigger('change');
    },1000);
});

$(document).on('change', '.nationalityLookup input', function (){
    let nationality = $(this).val().trim();
    setTimeout(function () {
        $('.nationality select').val(nationality).trigger('change');
    },1000);
});

$(document).on('change', '.countryBirthLookup input', function (){
    let countryBirth = $(this).val().trim();
    setTimeout(function () {
        $('.countryBirth select').val(countryBirth).trigger('change');
    },1000);
});

$(document).on('change', '.maritalStatusLookup input', function (){
    let maritalStatus = $(this).val().trim();
    setTimeout(function () {
        $('.maritalStatus select').val(maritalStatus).trigger('change');
    },1000);
});

$(document).on('change', '.countryResidenceLookup input', function (){
    let countryResidence = $(this).val().trim();
    setTimeout(function () {
        $('.countryResidence select').val(countryResidence).trigger('change');
    },1000);
});

$(document).on('change', '.countryPhoneNumberLookup input', function (){
    let countryPhoneNumber = $(this).val().trim();
    setTimeout(function () {
        $('.countryPhoneNumber select').val(countryPhoneNumber).trigger('change');
    },1000);
});

$(document).on('change', '.relationshipToMinorLookup input', function (){
    let relationshipToMinor = $(this).val().trim();
    setTimeout(function () {
        $('.relationshipToMinor select').val(relationshipToMinor).trigger('change');
    },1000);
});

$(document).on('change', '.countryOfPhoneCodeGuardianLookup input', function (){
    let countryOfPhoneCodeGuardian = $(this).val().trim();
    setTimeout(function () {
        $('.countryOfPhoneCodeGuardian select').val(countryOfPhoneCodeGuardian).trigger('change');
    },1000);
});

$(document).on('change', '.immigrationStatusLookup input', function (){
    let immigrationStatus = $(this).val().trim();
    setTimeout(function () {
        $('.immigrationStatus select').val(immigrationStatus).trigger('change');
    },1000);
});

$(document).on('click', 'button:contains("Return To List")', function () {
    window.location.href = 'https://lf.automatenow.co.za/Forms/GroupList'
        + '?token=' + encodeURIComponent(token || '')
});