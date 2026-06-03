function triggerSubmit(){
    $('.Submit').trigger('click');    
};

$(document).ready(function () {

    /* ── Relationship radio → field sync ────────────────────── */
    $(document).on('change', '.relationship input[type="radio"]', function () {
        $('.relationshipValue input').val($(this).val()).change();
    });

    /* ── Token injection ─────────────────────────────────────── */
    var url      = new URL(window.location.href);
    var token    = url.searchParams.get('token');
    var personId = url.searchParams.get('personId');
    if (token) {
        setTimeout(function () {
            $('.sessionToken input').val(token).change();
            $('.userId input').val(personId).change();
            $('.familyListUrl input').val('https://lf.automatenow.co.za/Forms/FamilyMembers?token=' + encodeURIComponent(token)).change();
        }, 1000);
    }

    /* ── Back button ─────────────────────────────────────────── */
    $(document).on('click', 'button:contains("Back")', function () {
        window.location.href = 'https://lf.automatenow.co.za/Forms/FamilyMembers'
            + '?token=' + encodeURIComponent(token || '');
    });

    /* ── Base64 Passport Image Renderer ─────────────────────── */
    function renderBase64Image() {
        var base64Value = '';

        // Strategy 1: Find by label text "HTMLBase64Passport"
        $('.lf-form-item label, .field-label').each(function () {
            if ($(this).text().trim() === 'HTMLBase64Passport') {
                var container = $(this).closest('.lf-form-item, .field-container');
                base64Value = container.find('textarea, input[type="text"]').val();
            }
        });

        // Strategy 2: Grab ANY textarea containing base64 image data
        if (!base64Value) {
            $('textarea').each(function () {
                var val = $(this).val();
                if (val && val.indexOf('data:image') === 0) {
                    base64Value = val;
                }
            });
        }

        if (!base64Value || base64Value.trim() === '') return;

        var imgSrc = base64Value.trim();
        if (!imgSrc.startsWith('data:')) {
            imgSrc = 'data:image/png;base64,' + imgSrc;
        }

        $('.base64image').html(
            '<div style="display:inline-block; border:1px solid #ddd; border-radius:8px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.15); margin-top:5px;">' +
                '<img src="' + imgSrc + '" style="width:280px; height:auto; display:block;" />' +
            '</div>'
        );
    }

    // Run once on load
    renderBase64Image();

    // Watch for any textarea change
    $(document).on('change input', 'textarea', function () {
        renderBase64Image();
    });

    // Retry after short delays in case form fields load late
    setTimeout(renderBase64Image, 1500);
    setTimeout(renderBase64Image, 3000);

});