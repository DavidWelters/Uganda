$(document).ready(function () {
  $('.Submit').hide(); 
    const url   = new URL(window.location.href);
    const reference = url.searchParams.get('applicationReference');
    const passportNumber = url.searchParams.get('passportNumber');

    setTimeout(function () {
        if (reference) {
            $('.applicationReference input').val(reference).change();
            $('.passportNumber input').val(passportNumber).change();
        }
    }, 1000);
});