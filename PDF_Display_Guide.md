# PDF Display in Laserfiche Forms — Implementation Guide

## The Problem

Laserfiche Forms stores uploaded files as base64 strings in lookup/textarea fields. When those values are loaded back into a form (via lookup callbacks), the code tries to display them using `<img src="...">` tags. This works for images (JPEG, PNG), but **PDFs cannot be rendered in `<img>` tags** — the browser simply shows nothing.

Additionally, the naive fix of using `<a href="data:application/pdf;base64,...">` to open a PDF in a new tab is **blocked by Chrome's security policy** (navigating to a `data:` URL from a script is disallowed).

---

## Two Different Contexts in This System

The solution differs depending on how the image display is structured in the form.

### Context A — Custom JS-built div boxes (e.g. `principalInfo.js`)

The image display areas are `<div>` elements created entirely in JavaScript with explicit dimensions (`height: 160px`). The content of these divs is controlled by setting `div.innerHTML`.

### Context B — `<img>` tags in LF Custom HTML fields (e.g. `manageGroupMember.js`)

The image display areas are `<img>` elements defined directly in a Laserfiche Custom HTML field. They have inline styles like `width: 280px; height: auto; display: none;`. Because the parent container is `display: inline-block`, when the `<img>` is hidden its width collapses to zero.

---

## PDF Detection

Before deciding how to render, detect whether the base64 string is a PDF:

```javascript
var stripped = raw.startsWith('data:') ? (raw.split(',')[1] || '') : raw;
var isPdf = raw.startsWith('data:application/pdf') || stripped.startsWith('JVBERi0');
```

**Why `JVBERi0`?** This is the base64 encoding of `%PDF-`, which is the magic header of every PDF file. It works regardless of whether the stored value includes the `data:` prefix or is raw base64.

---

## Solution A — `renderMedia()` for JS-built div boxes

Use this pattern when the image display area is a custom `<div>` created in JavaScript with a fixed height.

```javascript
function renderMedia(box, b64, placeholder) {
  var raw = (b64 || '').trim();
  if (raw.length <= 10) { box.innerHTML = placeholder; return; }

  var stripped = raw.startsWith('data:') ? (raw.split(',')[1] || '') : raw;
  var isPdf = raw.startsWith('data:application/pdf') || stripped.startsWith('JVBERi0');

  if (!isPdf) {
    var src = raw.startsWith('data:') ? raw : 'data:image/jpeg;base64,' + raw;
    box.innerHTML = '<img src="' + src + '" style="width:100%;height:100%;object-fit:contain;" />';
    return;
  }

  var pdfBase64 = raw.startsWith('data:') ? (raw.split(',')[1] || '') : raw;
  box.innerHTML =
    '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:8px;">' +
    '<svg width="44" height="56" viewBox="0 0 44 56" xmlns="http://www.w3.org/2000/svg">' +
    '<rect x="1" y="1" width="42" height="54" rx="4" fill="#fff" stroke="#ddd" stroke-width="1.5"/>' +
    '<polyline points="28,1 28,16 43,16" fill="none" stroke="#ddd" stroke-width="1.5"/>' +
    '<rect x="4" y="28" width="36" height="16" rx="2" fill="#e53935" opacity="0.9"/>' +
    '<text x="22" y="40" font-size="10" font-family="Arial,sans-serif" fill="#fff" text-anchor="middle" font-weight="700">PDF</text></svg>' +
    '<span style="font-size:11px;color:#888;font-family:Segoe UI,Arial,sans-serif;">PDF Document</span>' +
    '<button type="button" style="font-size:11px;color:#1a6cc4;border:1px solid #1a6cc4;border-radius:10px;padding:3px 14px;background:#fff;cursor:pointer;font-weight:500;font-family:Segoe UI,Arial,sans-serif;">View PDF</button>' +
    '</div>';

  box.querySelector('button').addEventListener('click', function() {
    var bytes = atob(pdfBase64);
    var arr = new Uint8Array(bytes.length);
    for (var i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    var blob = new Blob([arr], { type: 'application/pdf' });
    var url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(function() { URL.revokeObjectURL(url); }, 10000);
  });
}
```

**Usage — replace every place that sets `imgBox.innerHTML`:**

```javascript
// BEFORE
var src = b64.startsWith('data:') ? b64 : 'data:image/jpeg;base64,' + b64;
imgBox.innerHTML = '<img src="' + src + '" style="width:100%;height:100%;object-fit:contain;" />';

// AFTER
renderMedia(imgBox, b64, placeholderSvg);
```

Also replace the file upload handler that fires immediately after a user picks a file:

```javascript
// BEFORE
var src = base64.startsWith('data:') ? base64 : 'data:image/jpeg;base64,' + base64;
s.imgBox.innerHTML = '<img src="' + src + '" ...>';

// AFTER
renderMedia(s.imgBox, base64, '');
```

---

## Solution B — `renderImgOrPdf()` for `<img>` elements in Custom HTML fields

Use this pattern when the display target is an `<img>` tag defined in a Laserfiche Custom HTML field.

### The extra complication: inline-block parent collapse

The LF Custom HTML field typically wraps the `<img>` in a `display: inline-block` container:

```html
<div style="display:inline-block; border:1px solid #ddd; overflow:hidden; ...">
    <img id="passportImg" src="" style="width:280px; height:auto; display:none;">
</div>
```

When the `<img>` is hidden (`display:none`), the `inline-block` parent **collapses to zero width** because its only child contributes nothing to layout. If the overlay uses `width: 100%`, it becomes 100% of zero — effectively invisible.

**Fix:** Read `$img[0].style.width` (the declared inline style on the `<img>`, e.g. `"280px"`) **before** hiding it, and apply that as the overlay's explicit width.

```javascript
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

    // Read declared width from inline style BEFORE hiding (outerWidth() returns 0 on hidden elements)
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
    ).css('display', 'flex');  // <-- IMPORTANT: must use .css('display','flex'), NOT .show()

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
```

**Usage — replace every place that sets `img.src`:**

```javascript
// BEFORE (in update callbacks)
var src = value.startsWith('data:') ? value : 'data:image/jpeg;base64,' + value;
$('#passportImg').attr('src', src).show();

// AFTER
renderImgOrPdf($('#passportImg'), value);
```

```javascript
// BEFORE (in file upload handler)
var src = base64.startsWith('data:') ? base64 : 'data:image/jpeg;base64,' + base64;
$(s.imgId).attr('src', src).show();

// AFTER
renderImgOrPdf($(s.imgId), base64);
```

---

## Why `blob:` URLs, not `data:` URLs

The "View PDF" button uses `URL.createObjectURL(blob)` to get a `blob:` URL. This is essential:

| Method | Result |
|--------|--------|
| `<a href="data:application/pdf;base64,...">` | Chrome blocks navigation to `data:` URLs opened via script |
| `window.open('data:application/pdf;...')` | Also blocked by Chrome |
| `URL.createObjectURL(blob)` + `window.open(blobUrl)` | **Works** — `blob:` URLs are not restricted |

The `setTimeout(...revokeObjectURL..., 10000)` releases the memory reference 10 seconds after opening, which is enough time for the browser to load the PDF before the URL is invalidated.

---

## Critical Pitfalls

### 1. jQuery `.show()` destroys `display: flex`

jQuery's `.show()` always sets `display: block`, overriding any `flex` layout:

```javascript
// WRONG — kills flexbox centering
$overlay.html(content).show();

// CORRECT
$overlay.html(content).css('display', 'flex');
```

### 2. `width: 100%` on overlay inside `inline-block` parent

If the LF Custom HTML field wrapper is `display: inline-block`, hiding the `<img>` collapses the parent to zero width. The overlay must use an **explicit pixel width**, not a percentage:

```javascript
// WRONG
$overlay.css({ width: '100%' });  // 100% of 0px = 0px

// CORRECT
var imgWidth = $img[0].style.width || '280px';  // reads from inline style
$overlay.css({ width: imgWidth });
```

### 3. Reading `<img>` width after it's hidden returns 0

`$img.width()` and `$img.outerWidth()` return 0 for `display:none` elements. Always read the declared width from `$img[0].style.width` (the inline style attribute), which persists regardless of visibility.

### 4. PDF base64 stored without `data:` prefix

Depending on how the lookup stores the value, the base64 string may be stored with or without the `data:application/pdf;base64,` prefix. The detection uses both:
- `raw.startsWith('data:application/pdf')` — catches the prefixed form
- `stripped.startsWith('JVBERi0')` — catches the raw base64 form

Always handle both cases.

---

## Checklist for New Implementations

When adding this to a new form or section:

1. **Identify the display context** — is it a JS-created `<div>` (Solution A) or an `<img>` in a Custom HTML field (Solution B)?
2. **Copy the correct helper function** (`renderMedia` or `renderImgOrPdf`)
3. **Replace all `img.src` or `innerHTML` assignments** in both the lookup callback functions and the file upload `change` handler
4. **For Solution B:** check the `<img>`'s inline style width and verify the parent container's `display` type
5. **For Solution B:** use `.css('display', 'flex')` not `.show()` when making the overlay visible
6. **Test with both** a JPEG/PNG upload and a PDF upload via lookup and via direct upload
