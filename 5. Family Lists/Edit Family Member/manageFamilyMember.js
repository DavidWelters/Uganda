function triggerSubmit(){
    $('.Submit').trigger('click');    
};

$(document).ready(function () {

    /* ── Relationship radio → field sync ────────────────────── */
    $(document).on('change', '.relationship input[type="radio"]', function () {
        $('.relationshipValue input').val($(this).val()).change();
    });

    /* ── Token injection ─────────────────────────────────────── */
    let url      = new URL(window.location.href);
    let session    = url.searchParams.get('session');
    let personId = url.searchParams.get('personId');
    let type  = url.searchParams.get('type');
    let category = url.searchParams.get('category');
    let subcategory = url.searchParams.get('subcategory');
    let purpose = url.searchParams.get('purpose');
    let family = url.searchParams.get('family');
    let group = url.searchParams.get('group');

      
    let familyListUrl = 'https://pinpoint.web.za/Forms/FamilyMembers'
        + '?session='     + encodeURIComponent(session)
        + '&type='        + encodeURIComponent(type)
        + '&category='    + encodeURIComponent(category)      
        + '&subcategory=' + encodeURIComponent(subcategory)
        + '&purpose='     + encodeURIComponent(purpose)       
        + '&family='      + encodeURIComponent(family || '')
        + '&group='       + encodeURIComponent(group || '');

    if (session && personId) {
        setTimeout(function () {
            $('.session input').val(session).change();
            $('.userId input, .personid input').val(personId).change();
            $('.familyListUrl input').val(familyListUrl).change(); 
            
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
        }, 1000);
    }

    /* ── Back button ─────────────────────────────────────────── */
    $(document).on('click', 'button:contains("Back")', function () {
        window.location.href = familyListUrl;
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