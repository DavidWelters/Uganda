function makeEditButton() {
    let $btn = $('<button type="button" aria-label="Edit family member"></button>').css({
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        border: "1.5px solid #9e9e9e",
        padding: "4px 6px",
        margin: "0",
        borderRadius: "4px",
        cursor: "pointer",
        backgroundColor: "#fff",
        color: "#555",
        boxShadow: "none",
        transition: "border-color 0.15s ease, color 0.15s ease"
    });

    $btn.html(`<svg width="13" height="13" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11.5 1.5l3 3-9 9H2.5v-3l9-9z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M9.5 3.5l3 3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`);

    $btn.on("mouseenter", function () {
            $(this).css({ borderColor: "#c0392b", color: "#c0392b" });
        })
        .on("mouseleave", function () {
            $(this).css({ borderColor: "#9e9e9e", color: "#555" });
        })
        .on("mousedown", function () {
            $(this).css({ backgroundColor: "#fdf0f0" });
        })
        .on("mouseup", function () {
            $(this).css({ backgroundColor: "#fff" });
        });

    return $btn;
}

function editFamilyMember() {
    $('.familyMember tbody tr').each(function () {
        let $row = $(this);

        let $cell = $row.find('.editFamilyMember');
        let editCheckbox = $cell.find('input[type="checkbox"]');

        if (!editCheckbox.length) return;
        if (editCheckbox.data("btn-injected")) return;
        editCheckbox.data("btn-injected", true);

        $cell.find('fieldset, .choice').hide();
        $cell.find('.cf-field').css({ height: '0', overflow: 'hidden', margin: '0', padding: '0' });

        let $btn = makeEditButton();
        $cell.find('.cf-field').before($btn);

        $btn.on("click", function () {
            let personId     = $row.find('.personId input').val() || '';
            let sessionToken = $('.sessionToken input').val()     || '';

            if (!personId) {
                alert('Person Id Unknown.');
                return;
            }

            let redirectUrl = 'https://lf.automatenow.co.za/Forms/ManageFamily?token=' + sessionToken + '&personId=' + personId;

            let width  = 800;
            let height = 800;
            let left   = (window.innerWidth  / 2) - (width  / 2);
            let top    = (window.innerHeight / 2) - (height / 2);

            window.open(redirectUrl, 'newwindow', `width=${width},height=${height},top=${top},left=${left}`);
        });
    });
}

function makeRemoveButton() {
    let $btn = $('<button type="button" aria-label="Remove family member"></button>').css({
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        border: "1.5px solid #9e9e9e",
        padding: "4px 6px",
        margin: "0",
        borderRadius: "4px",
        cursor: "pointer",
        backgroundColor: "#fff",
        color: "#bbb",
        boxShadow: "none",
        transition: "border-color 0.15s ease, color 0.15s ease, background-color 0.15s ease"
    });

    $btn.html(`<svg width="13" height="13" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 2l12 12M14 2L2 14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`);

    $btn.on("mouseenter", function () {
            if (!$(this).data("selected")) $(this).css({ borderColor: "#c0392b", color: "#c0392b" });
        })
        .on("mouseleave", function () {
            if (!$(this).data("selected")) $(this).css({ borderColor: "#9e9e9e", color: "#bbb" });
        });

    return $btn;
}

function applyRemoveState($btn, selected) {
    $btn.data("selected", selected);
    if (selected) {
        $btn.css({ backgroundColor: "#fdf0f0", borderColor: "#c0392b", color: "#c0392b" });
    } else {
        $btn.css({ backgroundColor: "#fff", borderColor: "#9e9e9e", color: "#bbb" });
    }
}

function removeFamilyMember() {
    $('.familyMember tbody tr').each(function () {
        let $row = $(this);

        let $cell = $row.find('.removeFamilyMember');
        let $checkbox = $cell.find('input[type="checkbox"]');

        if (!$checkbox.length) return;
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


$(document).ready(function () {
  const queryString = window.location.href;
  var url = new URL(queryString);
  var token = new URLSearchParams(url.search).get('token'); 
    
    //apply token to Quote field
    setTimeout(function() { 
        if (token) {
            $('.sessionToken input').val(token);
            $('.sessionToken input').change();
        } else {
            return; // No token found, skip the rest of the setup
        }
    }, 1000);

    editFamilyMember();
    removeFamilyMember();
});

$(document).on('click', '.familyMember .cf-table-add-row', function () {
    editFamilyMember();
    removeFamilyMember();
});
