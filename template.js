/* ============================================================
   M-PESA receipt template - edit / update / download A4 PDF
   Several sheets in one page (EEU, School Payment and Airtime C2B, merchant
   and customer copies), picked from the toolbar dropdown. Standalone: no build step, no network needed.
   ============================================================ */
(function () {
  'use strict';

  var VARIANT_KEY = 'mpesa-receipt-variant-v1';
  var A4_W = 793.7;   // 210mm @ 96dpi
  var A4_H = 1122.5;  // 297mm @ 96dpi

  var toast    = document.getElementById('toast');
  var picker   = document.getElementById('receipt-type');
  var btnEdit  = document.getElementById('btn-edit');
  var btnUpd   = document.getElementById('btn-update');
  var btnPrint = document.getElementById('btn-print');
  var btnDl    = document.getElementById('btn-download');
  var btnReset = document.getElementById('btn-reset');

  var editing = false;

  /* ---------- 1. use the inlined (base64) assets when available ----------
     Browsers refuse to read local images into a canvas when the page is
     opened straight from disk (file://), which would break the PDF export.
     assets/assets-inline.js carries base64 copies of everything in ./assets. */
  function inlineAssets() {
    var map = window.RECEIPT_ASSETS;
    if (!map) return;
    [].forEach.call(document.querySelectorAll('.page img[src]'), function (img) {
      var key = img.getAttribute('src');
      if (map[key]) img.src = map[key];
    });
  }

  /* ---------- 2. one receipt sheet ----------
     Each sheet owns its own fields, its own pristine snapshot and its own
     localStorage entry, so switching variants never mixes the two up. */
  function Receipt(el) {
    var r = {
      el: el,
      variant: el.getAttribute('data-variant'),
      title: el.getAttribute('data-title') || el.getAttribute('data-variant'),
      storeKey: el.getAttribute('data-store'),
      defaults: {},     // pristine template markup, per field
      sampleText: {}    // pristine text, used to spot fields nobody filled in
    };

    r.fields = [].slice.call(el.querySelectorAll('[data-editable]'));

    // Unlocked blocks: the merchant sheet exposes only its yellow-highlighted
    // data-required values; the customer sheet exposes every transaction value
    // (data-value). Labels, headings, table headers and the company block stay
    // locked on both.
    r.editable = r.fields.filter(function (f) {
      return f.hasAttribute('data-required') || f.hasAttribute('data-value');
    });
    // A required field warns while it still holds the sample value it shipped with.
    r.required = r.fields.filter(function (f) { return f.hasAttribute('data-required'); });

    r.key = function (elm, i) { return elm.getAttribute('data-field') || ('f' + i); };

    r.snapshotDefaults = function () {
      r.fields.forEach(function (elm, i) {
        r.defaults[r.key(elm, i)] = elm.innerHTML;
        r.sampleText[r.key(elm, i)] = text(elm);
      });
    };

    r.save = function () {
      var data = {};
      r.fields.forEach(function (elm, i) { data[r.key(elm, i)] = elm.innerHTML; });
      try {
        localStorage.setItem(r.storeKey, JSON.stringify(data));
        return true;
      } catch (e) {
        return false; // private mode / storage disabled - editing still works
      }
    };

    r.load = function () {
      var raw;
      try { raw = localStorage.getItem(r.storeKey); } catch (e) { return; }
      if (!raw) return;
      var data;
      try { data = JSON.parse(raw); } catch (e) { return; }
      r.fields.forEach(function (elm, i) {
        var k = r.key(elm, i);
        if (typeof data[k] === 'string') elm.innerHTML = data[k];
      });
    };

    r.pending = function () {
      return r.required.filter(function (elm) {
        var i = r.fields.indexOf(elm);
        var now = text(elm);
        return now === '' || now === r.sampleText[r.key(elm, i)];
      });
    };

    r.markPending = function () {
      var bad = r.pending();
      r.fields.forEach(function (elm) { elm.classList.remove('needs-data'); });
      bad.forEach(function (elm) { elm.classList.add('needs-data'); });
      return bad;
    };

    r.reset = function () {
      r.fields.forEach(function (elm, i) { elm.innerHTML = r.defaults[r.key(elm, i)]; });
      try { localStorage.removeItem(r.storeKey); } catch (e) {}
    };

    return r;
  }

  function text(elm) { return elm.textContent.replace(/\s+/g, ' ').trim(); }

  var receipts = {};
  [].forEach.call(document.querySelectorAll('.page[data-variant]'), function (el) {
    receipts[el.getAttribute('data-variant')] = Receipt(el);
  });
  var active = null;

  /* ---------- 3. edit mode ---------- */
  function setEditing(on) {
    editing = on;
    document.body.classList.toggle('editing', on);
    active.editable.forEach(function (el) {
      if (on) el.setAttribute('contenteditable', 'true');
      else el.removeAttribute('contenteditable');
    });
    btnEdit.textContent = on ? 'Editing…' : 'Edit';
    btnEdit.disabled = on;
    btnUpd.disabled = !on;
    if (on) {
      var first = active.editable[0];
      if (first) first.focus();
    }
  }

  // Per-sheet wiring: click-through on the gaps, plain-text paste, single-line fields.
  Object.keys(receipts).forEach(function (name) {
    var r = receipts[name];

    // Clicking the padding/gaps of a block (e.g. between a label and its value)
    // should still start editing the nearest field instead of doing nothing.
    r.el.addEventListener('mousedown', function (e) {
      if (!editing) return;
      if (e.target.closest('.field-edit')) return;   // already on an unlocked block
      var host = e.target.closest('.info-row, .info-group, .title-box, .section-header, td, th');
      if (!host) return;
      var target = host.classList.contains('field-edit') ? host : host.querySelector('.field-edit');
      if (!target) return;
      e.preventDefault();
      target.focus();
    });

    r.editable.forEach(function (el) {
      el.classList.add('field-edit');   // what the edit-mode CSS keys off

      // keep pasted content as plain text and keep fields single-line
      el.addEventListener('paste', function (e) {
        e.preventDefault();
        var t = (e.clipboardData || window.clipboardData).getData('text/plain');
        document.execCommand('insertText', false, t.replace(/\s*\n\s*/g, ' '));
      });
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); el.blur(); }
      });
      // clear a field's warning as soon as it is actually changed
      el.addEventListener('input', function () {
        if (el.classList.contains('needs-data')) r.markPending();
      });
    });
  });

  /* ---------- 4. toast ---------- */
  var toastTimer;
  function say(msg, isError) {
    toast.textContent = msg;
    toast.classList.toggle('error', !!isError);
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 2600);
  }

  /* ---------- 5. variant switching ---------- */
  function setVariant(name) {
    if (!receipts[name]) name = picker.options[0].value;
    if (editing) setEditing(false);

    active = receipts[name];
    Object.keys(receipts).forEach(function (k) {
      receipts[k].el.classList.toggle('is-hidden', k !== name);
    });
    if (picker.value !== name) picker.value = name;

    document.title = 'M-PESA Receipt Template - ' + active.title;
    try { localStorage.setItem(VARIANT_KEY, name); } catch (e) {}

    active.markPending();
  }

  /* ---------- 6. PDF export ---------- */
  function fileName() {
    var idEl = active.el.querySelector('[data-field="transaction-id"]');
    var id = (idEl ? idEl.textContent : '').trim().replace(/[^\w.-]+/g, '-');
    return 'M-PESA-Receipt-' + active.variant + (id ? '-' + id : '') + '.pdf';
  }

  // The layout is tuned to fill exactly one A4 sheet. If someone types enough
  // text to push it past that, everything is scaled down uniformly (never
  // stretched) so the result is still a single page.
  function a4Scale() {
    var h = active.el.scrollHeight;
    return h > A4_H + 1 ? A4_H / h : 1;
  }

  function downloadPdf() {
    if (editing) setEditing(false);          // never capture the edit outlines

    if (typeof html2pdf === 'undefined') {   // library missing -> print dialog
      say('PDF library not found - opening the print dialog instead', true);
      setTimeout(function () { window.print(); }, 400);
      return;
    }

    var label = btnDl.textContent;
    btnDl.disabled = true;
    btnDl.textContent = 'Generating…';

    var leftover = active.markPending().length;
    document.body.classList.add('exporting');   // keeps warning marks out of the PDF
    var sheet = active;
    var restore = fitToOnePage();               // pin to exact A4 pixels
    var name = fileName();

    var done = function (err) {
      restore();
      document.body.classList.remove('exporting');
      btnDl.disabled = false;
      btnDl.textContent = label;
      if (err) { console.error(err); say('Could not generate the PDF - see the console', true); }
      else if (leftover) {
        say('Downloaded ' + name + ' - warning: ' + leftover +
          (leftover === 1 ? ' field still holds' : ' fields still hold') + ' sample data', true);
      } else { say('Downloaded ' + name); }
      sheet.markPending();   // re-mark once the export styles are off
    };

    // The receipt is captured as it stands - no CSS transform, which html2canvas
    // renders shifted and clipped.
    html2pdf().set({
      margin: 0,
      filename: name,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 3, useCORS: true, backgroundColor: '#FFFFFF', scrollX: 0, scrollY: 0,
        // html2canvas lays the clone out in a scrollbar-less window. Left at its
        // default, the sheet lands half a scrollbar off-centre and the footer bar
        // stops ~8px short of the left edge, so hand it the real content width.
        windowWidth: document.documentElement.clientWidth
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      // No page-break processing: html2pdf's avoid/legacy modes pad elements that
      // sit on the page boundary, which shoves the footer bar off the sheet.
      pagebreak: { mode: [], before: [], after: [], avoid: [] }
    }).from(sheet.el).toPdf().get('pdf').then(function (pdf) {
      // The sheet is a rounded pixel or two over 297mm, which jsPDF spills onto
      // a second, all but empty page. The receipt itself always fits page one.
      while (pdf.internal.getNumberOfPages() > 1) {
        pdf.deletePage(pdf.internal.getNumberOfPages());
      }
      pdf.save(name);
      done();
    }).catch(function (err) { done(err); });
  }

  // Pins the active receipt to exactly one A4 sheet and returns an undo function.
  // Normally that is just the natural size; if edits have made the content
  // taller, `zoom` re-lays it out smaller (a real layout scale, so html2canvas
  // and the printer both see it) while the sheet keeps its A4 proportions.
  function fitToOnePage() {
    var el = active.el;
    var prev = {
      w: el.style.width, h: el.style.height,
      mh: el.style.minHeight, of: el.style.overflow, z: el.style.zoom
    };
    var k = a4Scale();                       // measured before the box is clamped

    el.style.width = (A4_W / k) + 'px';
    el.style.height = (A4_H / k) + 'px';
    el.style.minHeight = '0';
    el.style.overflow = 'hidden';            // absorbs sub-pixel rounding only
    if (k < 1) el.style.zoom = k;

    return function () {
      el.style.width = prev.w;
      el.style.height = prev.h;
      el.style.minHeight = prev.mh;
      el.style.overflow = prev.of;
      el.style.zoom = prev.z;
    };
  }

  /* ---------- 6b. print: one A4 page as well ---------- */
  var undoPrintFit = null;
  window.addEventListener('beforeprint', function () {
    if (editing) setEditing(false);
    if (!undoPrintFit) undoPrintFit = fitToOnePage();
  });
  window.addEventListener('afterprint', function () {
    if (undoPrintFit) { undoPrintFit(); undoPrintFit = null; }
  });

  /* ---------- 7. wire up ---------- */
  picker.addEventListener('change', function () { setVariant(picker.value); });

  btnEdit.addEventListener('click', function () { setEditing(true); });

  btnUpd.addEventListener('click', function () {
    setEditing(false);
    var stored = active.save();
    var bad = active.markPending();

    if (bad.length) {
      say('Updated - but ' + bad.length + (bad.length === 1 ? ' highlighted field' : ' highlighted fields') +
        ' still need real data', true);
    } else {
      say(stored ? 'Updated' : 'Updated (not saved - browser storage is unavailable)');
    }
  });

  btnPrint.addEventListener('click', function () {
    if (editing) setEditing(false);
    window.print();
  });

  btnDl.addEventListener('click', downloadPdf);

  btnReset.addEventListener('click', function () {
    if (!window.confirm('Restore the original ' + active.title + ' template values? Your edits will be lost.')) return;
    active.reset();
    setEditing(false);
    active.markPending();
    say('Template reset');
  });

  /* ---------- 8. go ---------- */
  inlineAssets();
  Object.keys(receipts).forEach(function (k) {
    receipts[k].snapshotDefaults();
    receipts[k].load();
  });

  var saved;
  try { saved = localStorage.getItem(VARIANT_KEY); } catch (e) {}
  setVariant(saved || picker.options[0].value);
})();
