document.addEventListener("DOMContentLoaded", function () {
    const hiddenFileExt = document.getElementById("hdn_FileExt");
    const fileExtField  = document.getElementById("FileExt");
    const hiddenBase64  = document.getElementById("hdn_Base64");
    const base64Field   = document.getElementById("Base64");
    const submitBtn     = document.getElementById("submitBtn");

    if (hiddenFileExt && fileExtField) {
        hiddenFileExt.addEventListener("input", function () {
            fileExtField.value = this.value;
        });
    }

    if (hiddenBase64 && base64Field) {
        hiddenBase64.addEventListener("input", function () {
            base64Field.value = this.value;
            // Show submit button only when base64 has content
            if (submitBtn) {
                submitBtn.style.display = this.value ? "inline-block" : "none";
            }
        });
    }
});