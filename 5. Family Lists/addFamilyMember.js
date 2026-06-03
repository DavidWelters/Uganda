$(document).ready(function () {
  $('.Submit').hide(); 
  $('#lookup1609').hide(); //add family memebr Lookup Autofill field

  /* ── Token injection ─────────────────────────────────────── */
  var url      = new URL(window.location.href);
  var token    = url.searchParams.get('token');
  var passport = url.searchParams.get('passport');

  if (token) {
    setTimeout(function () {
      $('.sessionToken input').val(token).change();
      if (passport) {
        $('.passport input').val(passport).change();
      }
    }, 1000);
  }

  /* ── Relationship radio → field sync ────────────────────── */
  $(document).on('change', '.relationship input[type="radio"]', function () {
    $('.relationshipValue input').val($(this).val()).change();
  });

  /* ── File upload ─────────────────────────────────────────── */
  var ALLOWED_EXTS  = ['.jpeg', '.jpg', '.png', '.bmp', '.pdf'];
  var ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/bmp', 'application/pdf'];
  var MIN_BYTES     = 5 * 1024;
  var MAX_BYTES     = 1 * 1024 * 1024;

  var dropZone  = $('#pfDropZone');
  var fileInput = $('#pfFileInput');
  var preview   = $('#pfPreview');
  var thumb     = $('#pfThumb');
  var nameEl    = $('#pfFileName');
  var sizeEl    = $('#pfFileSize');
  var removeBtn = $('#pfRemoveBtn');
  var errorEl   = $('#pfError');
  var successEl = $('#pfSuccess');

  // ✅ Guard flag — prevents trigger('change') from re-entering processFile
  var isProcessing = false;

  dropZone[0].addEventListener('dragover', function (e) {
    e.preventDefault();
    dropZone.addClass('dragover');
  });
  dropZone[0].addEventListener('dragleave', function () {
    dropZone.removeClass('dragover');
  });
  dropZone[0].addEventListener('drop', function (e) {
    e.preventDefault();
    dropZone.removeClass('dragover');
    if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]);
  });

  fileInput.on('change', function () {
    if (this.files[0]) processFile(this.files[0]);
  });

  removeBtn.on('click', function () { resetUpload(); });

  function processFile(file) {
    // ✅ Block re-entry if already handling a file
    if (isProcessing) return;
    isProcessing = true;

    hideMessages();

    var ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXTS.includes(ext) && !ALLOWED_TYPES.includes(file.type)) {
      isProcessing = false;
      return showError('Invalid file type. Allowed: JPEG, JPG, PNG, BMP, PDF.');
    }
    if (file.size < MIN_BYTES) {
      isProcessing = false;
      return showError('File is too small (minimum 5 KB).');
    }
    if (file.size > MAX_BYTES) {
      isProcessing = false;
      return showError('File is too large (maximum 1 MB).');
    }

    var reader = new FileReader();

    reader.onload = function (e) {
      var dataUrl    = e.target.result;
      var base64Pure = dataUrl.split(',')[1];

      // ✅ trigger('change') fires here — guard above stops any re-entry
      $('#q46 input').val(ext).trigger('change');
      $('#q35 textarea').val(base64Pure).trigger('change');

      showPreview(file, ext, dataUrl);
      showSuccess('File Uploaded.');

      isProcessing = false; // ✅ Release the lock only after everything is done
    };

    reader.onerror = function () {
      showError('Could not read file. Please try again.');
      isProcessing = false; // ✅ Always release on error too
    };

    reader.readAsDataURL(file);
  }

  function showPreview(file, ext, dataUrl) {
    nameEl.text(file.name);
    sizeEl.text(formatBytes(file.size));
    var imgExts = ['.jpeg', '.jpg', '.png', '.bmp'];
    thumb.html(imgExts.includes(ext)
      ? '<img src="' + dataUrl + '" alt="preview" />'
      : '&#128196;'
    );
    dropZone.hide();
    preview.addClass('show');
  }

  function resetUpload() {
    isProcessing = false; // ✅ Also reset on manual remove
    fileInput.val('');
    $('#q46 input').val('').trigger('change');
    $('#q35 textarea').val('').trigger('change');
    preview.removeClass('show');
    dropZone.show();
    thumb.html('&#128196;');
    nameEl.text('');
    sizeEl.text('');
    hideMessages();
  }

  function formatBytes(b) {
    if (b < 1024) return b + ' B';
    if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
    return (b / (1024 * 1024)).toFixed(2) + ' MB';
  }

  function showError(msg)   { errorEl.text(msg).addClass('show'); }
  function showSuccess(msg) { successEl.text(msg).addClass('show'); }
  function hideMessages()   { errorEl.removeClass('show'); successEl.removeClass('show'); }

});