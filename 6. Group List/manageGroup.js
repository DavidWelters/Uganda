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

    var token = new URL(window.location.href).searchParams.get('token') || '';

    $('.Submit').trigger('click');

    waitForLookupComplete(function () {
        window.location.href = 'https://lf.automatenow.co.za/Forms/GroupList'
            + '?token=' + encodeURIComponent(token);
    });
    return false;
}

$(document).ready(function () {
    $('.Submit').hide();
    $('button:contains("Leave Group")').hide();
    const url   = new URL(window.location.href);
    const token = url.searchParams.get('token');
    const groupId = url.searchParams.get('groupId');

    setTimeout(function () {
        if (token) {
            $('.sessionToken input').val(token).change();
            $('.previousUrl input').val('https://lf.automatenow.co.za/Forms/GroupList?token=' + encodeURIComponent(token)).change();
        }
        if (groupId) {
            $('.groupId input').val(groupId).change();
        }
    }, 1000);

    $(document).on('click', 'button:contains("Return To List")', function () {
        window.location.href = 'https://lf.automatenow.co.za/Forms/GroupList'
            + '?token=' + encodeURIComponent(token || '')
    });

    $(document).on('click', 'button:contains("Members")', function () {
        window.location.href = 'https://lf.automatenow.co.za/Forms/ListGroupMembers'
            + '?token='    + encodeURIComponent(token   || '')
            + '&groupId=' + encodeURIComponent(groupId || '')
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
    var sessionToken   = $('.sessionToken input').val().trim();
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
