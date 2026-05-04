document.addEventListener("DOMContentLoaded", function () {
    var passportPhoto = document.getElementById("passportPhoto");
    if (!passportPhoto) return;

    var attempts = 0;
    var poll = setInterval(function () {
        attempts++;
        var table = document.getElementById("101");
        if (table) {
            var cells = table.querySelectorAll("tbody tr:first-child td");
            var base64Cell = cells[1];   // Base64Converted — full data URI
            if (base64Cell && base64Cell.textContent.trim()) {
                clearInterval(poll);
                passportPhoto.src = base64Cell.textContent.trim();
                passportPhoto.style.display = '';
                var photoWrap = passportPhoto.closest('.vpd-photo');
                if (photoWrap) photoWrap.classList.add('has-image');
            }
        }
        if (attempts >= 100) clearInterval(poll);
    }, 100);
});
