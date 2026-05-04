$(document).ready(function(){

    // Phone number formatting - strip spaces and invalid characters
    $(".Phone input").on('input', function(){
        var pos = this.selectionStart;
        var cleaned = $(this).val()
            .replace(/\s/g, '')           // remove all spaces
            .replace(/[^0-9()\-]/g, ''); // remove anything not numeric, (, ), or -
        $(this).val(cleaned);
        this.setSelectionRange(pos, pos);
    });

});


$(document).ready(function(){
    var todaysDate = new Date();

    // Subtract 1 day to get yesterday
    todaysDate.setDate(todaysDate.getDate() - 1);

    var year  = todaysDate.getFullYear();
    var month = ("0" + (todaysDate.getMonth() + 1)).slice(-2);
    var day   = ("0" + todaysDate.getDate()).slice(-2);

    var dtYesterday = (year + "-" + month + "-" + day);

    // Max is yesterday — today and future dates are disabled
    $(".Past input").attr('max', dtYesterday);
});

$(document).ready(function(){

    // Auto-uppercase passport field on every keystroke
    $(".Passport input").on('input', function(){
    var pos = this.selectionStart;
    var cleaned = $(this).val()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, ''); // remove anything that isn't A-Z or 0-9
    $(this).val(cleaned);
    this.setSelectionRange(pos, pos);
    });

});

$(document).ready(function(){

    // Get today's date in yyyy-mm-dd for comparison
    var todaysDate = new Date();
    var year  = todaysDate.getFullYear();
    var month = ("0" + (todaysDate.getMonth() + 1)).slice(-2);
    var day   = ("0" + todaysDate.getDate()).slice(-2);
    var dtToday = (year + "-" + month + "-" + day);

    // Check expiry date and highlight if expired
    $(".PassportExpiry input").on('input change', function(){
        var expiryDate = $(this).val();

        if(expiryDate && expiryDate < dtToday){
            $(this).addClass('expired');
        } else {
            $(this).removeClass('expired');
        }
    });

});

$(document).ready(function () {
  var $fileInput   = $('#q58 input[type="file"]');
  var $dropZone    = $('#customDropZone');
  var $instructions = $('.lf-upload-instructions'); 
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
    }, 2000);

  // Click drop zone or Browse → open file picker
  $dropZone.on('click', function () {
    $fileInput.click();
  });

  // Check if LF has rendered a file entry (the filename link it adds after upload)
  function checkFileState() {
    // LF renders an <a> tag with the filename after a successful upload
    var hasFile = $('#q58 a').length > 0;
    if (hasFile) {
      $dropZone.hide();
      $instructions.hide();
    } else {
      $dropZone.show();
      $instructions.show();
    }
  }

  // Watch the entire #q1 subtree for DOM changes (LF adding/removing the file entry)
  var observer = new MutationObserver(function () {
    checkFileState();
  });

  observer.observe($('#q1')[0], { childList: true, subtree: true });

  // Also poll every 500ms as a fallback
  setInterval(checkFileState, 500);

  // Drag-over feedback
  $dropZone.on('dragover', function (e) {
    e.preventDefault();
    $(this).css('border-color', '#1a73e8');
  }).on('dragleave drop', function () {
    $(this).css('border-color', '#9e9e9e');
  });

  // Rename button
  $('#q1 button[type="button"], #q58 .lf-btn').first().text('Upload Passport');
});



$(document).ready(function () {
 
    // Initial attempt on load
    updatePassportImage();
 
    // Poll every 500ms to catch lookup-populated values
    // (Laserfiche sets textarea values programmatically — change events don't always fire)
    let lastBase64 = '';
    setInterval(function () {
        const current = $('.HTMLMulti textarea').val() || '';
        if (current !== lastBase64) {
            lastBase64 = current;
            updatePassportImage();
        }
    }, 500);
 
});
 
function updatePassportImage() {
    const value = ($('.HTMLMulti textarea').val() || '').trim();
    if (!value) return;
 
    const src = value.startsWith('data:') ? value : 'data:image/jpeg;base64,' + value;
    $('#passport').attr('src', src);
}