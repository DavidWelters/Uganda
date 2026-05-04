document.addEventListener("DOMContentLoaded", function () {
    console.log("DOM fully loaded - script running");

    const hiddenFileExt = document.getElementById("hdn_FileExt");
    const fileExtField  = document.getElementById("FileExt");

    const hiddenBase64  = document.getElementById("hdn_Base64");
    const base64Field   = document.getElementById("Base64");

    // -- FileExt Listener -----------------------------
    if (hiddenFileExt && fileExtField) {
        console.log("FileExt elements found");

        hiddenFileExt.addEventListener("input", function () {
            console.log("hdn_FileExt changed");

            fileExtField.value = this.value;

            console.log("hdn_FileExt:", this.value);
            console.log("FileExt:", fileExtField.value);
        });
    }

    // -- Base64 Listener ------------------------------
    if (hiddenBase64 && base64Field) {
        console.log("Base64 elements found");

        hiddenBase64.addEventListener("input", function () {
            console.log("hdn_Base64 changed");

            base64Field.value = this.value;

            console.log("hdn_Base64 length:", this.value.length);
            console.log("Base64 populated");
        });
    }
});