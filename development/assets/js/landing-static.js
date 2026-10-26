/* Static-HTML version: validates in the browser and posts to the existing /api/submit-lead endpoint. */
(function () {
  'use strict';
  var form = document.getElementById('enquiryForm');
  if (!form) return;
  var status = document.getElementById('formStatus');
  var btn = document.getElementById('submitBtn');

  function show(type, msg) {
    status.className = 'alert alert-' + type;
    status.textContent = msg;
    status.classList.remove('d-none');
    status.focus();
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    form.classList.add('was-validated');
    if (!form.checkValidity()) { var bad = form.querySelector(':invalid'); if (bad) bad.focus(); return; }
    if (form.website.value) return; // honeypot

    var typeSel = form.project_type, budgetSel = form.budget;
    var typeText = typeSel.options[typeSel.selectedIndex].text;
    var budgetText = budgetSel.value ? budgetSel.options[budgetSel.selectedIndex].text : 'Not specified';

    var payload = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      phone: form.phone.value.trim() || 'Not provided',
      message: 'Project type: ' + typeText + '\nBudget: ' + budgetText + '\n\n' + form.requirements.value.trim(),
      pageSource: 'Landing Page'
    };

    btn.disabled = true; btn.textContent = 'Sending…';
    try {
      var res = await fetch('/api/submit-lead', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      var data = await res.json();
      if (data.success) { window.location.href = 'thank-you.html'; return; }
      show('danger', data.message || 'Something went wrong. Please try again.');
    } catch (err) {
      show('danger', 'Network error. Please try again or contact us on WhatsApp.');
    }
    btn.disabled = false; btn.textContent = 'Send Enquiry';
  });

  
})();
