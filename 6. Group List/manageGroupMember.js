$(document).ready(function () {
    $('.Submit').hide();

    /* ── Token injection ───────────────────────────────────────── */
    var url    = new URL(window.location.href);
    var token  = url.searchParams.get('token');
    var userId = url.searchParams.get('userId');
    var userPassport = url.searchParams.get('passportNumber');
    var selectedGroupId = url.searchParams.get('groupId');

    if (token) {
        setTimeout(function () {
            $('.sessionToken input').val(token).change();
            $('.personId input').val(userId).change();
            $('.passportNumber input').val(userPassport).change().attr('readonly', true);
            $('.groupId input').val(selectedGroupId).change();
            $('.groupMemberListUrl input').val('https://lf.automatenow.co.za/Forms/ListGroupMembers?token=' + encodeURIComponent(token) + '&groupId=' + encodeURIComponent(selectedGroupId));
        }, 1000);
    }

    $(document).on('click', 'button:contains("Return To List")', function () {
        window.location.href = $('.groupMemberListUrl input').val();
    });

    /* ── Upload slot config ────────────────────────────────────── */
    var uploadSlots = [
        { btnClass: '.uploadPassportBtn',     field: '.passportBase64Lookup',     imgId: '#passportImg',    label: 'Passport'      },
        { btnClass: '.uploadPhotoBtn',        field: '.photoBase64Lookup',        imgId: '#profilePicImg',  label: 'Profile Photo' },
        { btnClass: '.uploadReturnTicketBtn', field: '.returnTicketBase64Lookup', imgId: '#returnTicketImg', label: 'Return Ticket' }
    ];

    /* ── File → Base64 ─────────────────────────────────────────── */
    function convertToBase64(file, callback) {
        var reader = new FileReader();
        reader.onload = function (e) { callback(e.target.result); };
        reader.readAsDataURL(file);
    }

    /* ── Style LF upload buttons + wire file handlers ──────────── */
    function styleUploadButtons() {
        uploadSlots.forEach(function (s) {
            var $container = $(s.btnClass);
            if (!$container.length || $container.data('upload-styled')) return;
            $container.data('upload-styled', true);

            // Hide LF's native button, drop area, and label
            $container.find('.shadow-fileuploader, .file-drop-area').hide();
            $container.find('label').hide();

            // Inject styled dashed upload box
            var $box = $('<div></div>').css({
                padding: '14px 12px',
                border: '2px dashed #ccc',
                borderRadius: '8px',
                background: '#f8f9fa',
                textAlign: 'center',
                cursor: 'pointer',
                marginTop: '4px'
            }).html(
                '<div style="font-size:24px; margin-bottom:6px;">📎</div>' +
                '<div style="font-size:12px; color:#555; font-weight:600;">Upload ' + s.label + '</div>' +
                '<div style="font-size:11px; color:#aaa; margin-top:3px;">Click to browse</div>'
            );
            $container.find('.cf-field').prepend($box);

            // Click styled box → trigger LF's hidden file input
            $box.on('click', function () {
                $container.find('input[type="file"]').trigger('click');
            });

            // File selected → base64 → write into shared Lookup field → update image
            $container.find('input[type="file"]').on('change', function () {
                var file = this.files[0];
                if (!file) return;
                var $fileInput = $(this);
                var $textarea = $(s.field + ' textarea');
                convertToBase64(file, function (base64) {
                    $textarea.val(base64).trigger('change');
                    renderImgOrPdf($(s.imgId), base64);

                    // Reset LF's file tracking so the button is ready for replacement
                    setTimeout(function () {
                        $container.find('.files tbody tr').last().find('button').trigger('click');
                        $container.find('[id^="reachUploadLimit"]').hide();
                        $fileInput.val('');
                    }, 300);
                });
            });
        });
    }

    /* ── Build 3-column image/upload grid ─────────────────────── */
    var gridCols = [
        { label: 'Passport',      $img: function() { return $('#passportImg').closest('.form-q');    }, $upload: function() { return $('.uploadPassportBtn');      } },
        { label: 'Profile Photo', $img: function() { return $('#profilePicImg').closest('.form-q');   }, $upload: function() { return $('.uploadPhotoBtn');         } },
        { label: 'Return Ticket', $img: function() { return $('#returnTicketImg').closest('.form-q'); }, $upload: function() { return $('.uploadReturnTicketBtn');   } }
    ];

    function buildImageGrid() {
        if ($('#lfImageGrid').length) return;

        var cols = gridCols.map(function(c) {
            return { label: c.label, $img: c.$img(), $upload: c.$upload() };
        });

        for (var i = 0; i < cols.length; i++) {
            if (!cols[i].$img.length || !cols[i].$upload.length) return;
        }

        // Inject scoped styles
        if (!$('#lfImageGridStyles').length) {
            $('<style id="lfImageGridStyles">' +
                '#lfImageGrid { display:grid; grid-template-columns:repeat(3,1fr); gap:0 20px; padding:16px 0; }' +
                '#lfImageGrid .grid-header { font-weight:600; font-size:13px; color:#555; padding-bottom:8px; border-bottom:2px solid #e0e0e0; margin-bottom:10px; }' +
                '#lfImageGrid li.form-q { padding:4px 0 !important; border:none !important; background:none !important; list-style:none !important; margin:0 !important; }' +
                '#lfImageGrid li.form-q .cf-label { display:none !important; }' +
                '#lfImageGrid .cf-field { margin:0 !important; padding:0 !important; }' +
                '#lfImageGrid [id^="reachUploadLimit"] { display:none !important; }' +
            '</style>').appendTo('head');
        }

        var $grid = $('<div id="lfImageGrid"></div>');
        cols[0].$img.before($grid);

        // Row 1 — column headers
        cols.forEach(function(col) {
            $grid.append($('<div class="grid-header"></div>').text(col.label));
        });

        // Row 2 — images
        cols.forEach(function(col) { $grid.append(col.$img); });

        // Row 3 — upload buttons
        cols.forEach(function(col) { $grid.append(col.$upload); });
    }

    /* ── Style collection file upload buttons ─────────────────── */
    function styleCollectionUploadButtons() {
        $('ul.rpx li[attrtype="doc"]').each(function () {
            var $li = $(this);
            if ($li.data('col-upload-styled')) return;
            $li.data('col-upload-styled', true);

            $li.find('input.shadow-fileuploader, .file-drop-area').hide();
            $li.find('.cf-label').hide();

            var $box = $('<button type="button"></button>').css({
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                border: '1px solid #767676',
                borderRadius: '8px',
                background: '#fff',
                fontSize: '12px',
                color: '#444',
                cursor: 'pointer',
                fontWeight: '500',
                width: '100%',
                justifyContent: 'center'
            }).html('📎 &nbsp;Upload Document');
            $li.find('.cf-field').prepend($box);

            $box.on('click', function () {
                $li.find('input[type="file"]').trigger('click');
            });
        });
    }

    function observeCollection() {
        var target = document.querySelector('ul.rpx');
        if (!target) return;
        new MutationObserver(function () {
            styleCollectionUploadButtons();
        }).observe(target, { childList: true, subtree: true });
    }

    styleUploadButtons();
    buildImageGrid();
    styleCollectionUploadButtons();
    observeCollection();
    setTimeout(function() { styleUploadButtons(); buildImageGrid(); styleCollectionUploadButtons(); }, 500);
    setTimeout(function() { styleUploadButtons(); buildImageGrid(); styleCollectionUploadButtons(); }, 1500);
    setTimeout(function() { styleUploadButtons(); buildImageGrid(); styleCollectionUploadButtons(); }, 3000);

});// ════════════════════════════════════════════════════════════════════════════
//  Callback Functions
// ════════════════════════════════════════════════════════════════════════════

function renderImgOrPdf($img, b64) {
    if (!b64 || b64.length <= 10) return;
    var raw = b64.trim();
    var stripped = raw.startsWith('data:') ? (raw.split(',')[1] || '') : raw;
    var isPdf = raw.startsWith('data:application/pdf') || stripped.startsWith('JVBERi0');
    var overlayId = $img.attr('id') + '-pdf-overlay';
    var $overlay = $('#' + overlayId);

    if (!isPdf) {
        var src = raw.startsWith('data:') ? raw : 'data:image/jpeg;base64,' + raw;
        $img.attr('src', src).show();
        $overlay.hide();
        return;
    }

    var imgWidth = $img[0].style.width || ($img.outerWidth() > 0 ? $img.outerWidth() + 'px' : '280px');
    $img.hide();
    if (!$overlay.length) {
        $overlay = $('<div></div>').attr('id', overlayId).css({
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', width: imgWidth, minHeight: '160px',
            gap: '8px', border: '1px solid #ddd', borderRadius: '4px',
            background: '#f8f9fa', boxSizing: 'border-box'
        });
        $img.after($overlay);
    } else {
        $overlay.css({ display: 'flex', width: imgWidth });
    }
    var pdfBase64 = raw.startsWith('data:') ? (raw.split(',')[1] || '') : raw;
    $overlay.html(
        '<svg width="44" height="56" viewBox="0 0 44 56" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="1" y="1" width="42" height="54" rx="4" fill="#fff" stroke="#ddd" stroke-width="1.5"/>' +
        '<polyline points="28,1 28,16 43,16" fill="none" stroke="#ddd" stroke-width="1.5"/>' +
        '<rect x="4" y="28" width="36" height="16" rx="2" fill="#e53935" opacity="0.9"/>' +
        '<text x="22" y="40" font-size="10" font-family="Arial,sans-serif" fill="#fff" text-anchor="middle" font-weight="700">PDF</text></svg>' +
        '<span style="font-size:11px;color:#888;font-family:Segoe UI,Arial,sans-serif;">PDF Document</span>' +
        '<button type="button" class="pdf-view-btn" style="font-size:11px;color:#1a6cc4;border:1px solid #1a6cc4;border-radius:10px;padding:3px 14px;background:#fff;cursor:pointer;font-weight:500;font-family:Segoe UI,Arial,sans-serif;">View PDF</button>'
    ).css('display', 'flex');
    $overlay.find('.pdf-view-btn').off('click').on('click', function () {
        var bytes = atob(pdfBase64);
        var arr = new Uint8Array(bytes.length);
        for (var i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
        var blob = new Blob([arr], { type: 'application/pdf' });
        var url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
    });
}

function updatePassportImage() {
    var value = ($('.passportBase64Lookup textarea').val() || '').trim();
    if (!value) return;
    renderImgOrPdf($('#passportImg'), value);
}

function updateReturnTicketImage() {
    var value = ($('.returnTicketBase64Lookup textarea').val() || '').trim();
    if (!value) return;
    renderImgOrPdf($('#returnTicketImg'), value);
}

function updateProfilePicImage() {
    var value = ($('.photoBase64Lookup textarea').val() || '').trim();
    if (!value) return;
    renderImgOrPdf($('#profilePicImg'), value);
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
  var baseUrl = 'https://lf.automatenow.co.za/Forms/ListGroupMembers';
  var previousUrl = baseUrl + '?token=' + encodeURIComponent(token) + '&groupId=' + encodeURIComponent(groupId);



  if (token) {
    setTimeout(function () {
        $('.sessionToken input').val(token).change();
        $('.groupId input').val(groupId).change();
        $('.passportNumber input').val(passportNumber).change();
        $('.groupListUrl input').val(previousUrl);
    }, 1000);
  }
  /**
   * The Add Group Member form has a field where you can paste a base64 string of the passport image, 
   * and it will render it on the page. This is to allow copying the image data from the List Group Members page 
   * (which has the base64 string in a hidden field) to the Add Group Member page without having to download 
   * and re-upload the image.
   */
    updatePassportImage();
    updateReturnTicketImage();
    updateProfilePicImage();

    var lastPassport   = '';
    var lastReturn     = '';
    var lastProfilePic = '';
    setInterval(function () {
        var passport = $('.passportBase64Lookup textarea').val()     || '';
        var returnTicket = $('.returnTicketBase64Lookup textarea').val() || '';
        var profilePic = $('.photoBase64Lookup textarea').val()       || '';

        if (passport !== lastPassport)   { lastPassport   = passport;  updatePassportImage();     }
        if (returnTicket !== lastReturn)     { lastReturn     = returnTicket;  updateReturnTicketImage(); }
        if (profilePic !== lastProfilePic) { lastProfilePic = profilePic; updateProfilePicImage();   }
    }, 500);
});

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

$(document).on('change', '.countryOfBirthLookup input', function () {
    let countryOfBirth = $(this).val().trim();
    setTimeout(function () {
        $('.countryOfBirth select').val(countryOfBirth).trigger('change');
    }, 1000);
});

$(document).on('change', '.maritalStatusLookup input', function () {
    let maritalStatus = $(this).val().trim();
    setTimeout(function () {
        $('.maritalStatus select').val(maritalStatus).trigger('change');
    }, 1000);
});

$(document).on('change', '.countryOfResidenceLookup input', function () {
    let countryOfResidence = $(this).val().trim();
    setTimeout(function () {
        $('.countryOfResidence select').val(countryOfResidence).trigger('change');
    }, 1000);
});

$(document).on('change', '.countryOfPhoneNumberLookup input', function () {
    let countryOfPhoneNumber = $(this).val().trim();
    setTimeout(function () {
        $('.countryOfPhoneNumber select').val(countryOfPhoneNumber).trigger('change');
    }, 1000);
});

$(document).on('change', '.passportTypeLookup input', function () {
    let passportType = $(this).val().trim();
    setTimeout(function () {
        $('.passportType select').val(passportType).trigger('change');
    }, 1000);
});

$(document).on('change', '.passportIssueCountryLookup input', function () {
    let passportIssueCountry = $(this).val().trim();
    setTimeout(function () {
        $('.passportIssueCountry select').val(passportIssueCountry).trigger('change');
    }, 1000);
});

$(document).on('change', '.immigrationStatusLookup input', function () {
    let immigrationStatus = $(this).val().trim();
    setTimeout(function () {
        $('.immigrationStatus select').val(immigrationStatus).trigger('change');
    }, 1000);
});

$(document).on('change', '.memberTypeLookup input', function () {
    let memberTypeRadio = $(this).val().trim();
    setTimeout(function () {
        $('.memberType input[value="' + memberTypeRadio + '"]').prop('checked', true).trigger('change');
    }, 1000);
});

$(document).on('change', '.GuardianRelationshipToMinorLookup input', function () {
    let guardianRelationship = $(this).val().trim();
    setTimeout(function () {
        let select = $('.GuardianRelationshipToMinor select');
        select.find('option').filter(function() {
            return $(this).val().toLowerCase() === guardianRelationship.toLowerCase();
        }).prop('selected', true);
        select.trigger('change');
    }, 1000);
});

$(document).on('change', '.GuardianCountryOfPhoneNumberLookup input', function () {
    let guardianCountryOfPhoneNumber = $(this).val().trim();
    setTimeout(function () {
        $('.GuardianCountryOfPhoneNumber select').val(guardianCountryOfPhoneNumber).trigger('change');
    }, 1000);
});