/* Landing page enquiry form: validates in the browser, then posts to
   /api/submit-landing-lead (api/submit-landing-lead.js). Server validates again. */
(function () {
  "use strict";

  // Absolute paths, so they work from any URL the landing page is served on.
  var API_URL = "/api/submit-landing-lead";
  var THANK_YOU_URL = "/development/thank-you.html";

  var form = document.getElementById("enquiryForm");
  if (form) {
    var status = document.getElementById("formStatus");
    var btn = document.getElementById("submitBtn");
    var btnText = btn.textContent;

    var show = function (type, msg) {
      status.className = "alert alert-" + type;
      status.textContent = msg;
      status.classList.remove("d-none");
      status.focus();
    };

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      status.classList.add("d-none");

      form.classList.add("was-validated");
      if (!form.checkValidity()) {
        var bad = form.querySelector(":invalid");
        if (bad) bad.focus();
        return;
      }

      // Honeypot: a bot filled the hidden field, so quietly pretend success.
      if (form.elements["website"].value) {
        window.location.href = THANK_YOU_URL;
        return;
      }

      var payload = {
        name: form.elements["name"].value.trim(),
        email: form.elements["email"].value.trim(),
        phone: form.elements["phone"].value.trim(),
        projectType: form.elements["project_type"].value,
        budget: form.elements["budget"].value,
        message: form.elements["requirements"].value.trim(),
        pageSource: "Landing Page - Web Development",
        website: form.elements["website"].value,
      };

      btn.disabled = true;
      btn.textContent = "Sending…";

      try {
        var res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        var data = await res.json().catch(function () {
          return {};
        });

        if (res.ok && data.success) {
          if (typeof gtag === "function") {
            gtag("event", "generate_lead", { form_name: "landing_enquiry" });
          }
          window.location.href = THANK_YOU_URL;
          return;
        }
        show("danger", data.message || "Something went wrong. Please try again.");
      } catch (err) {
        show(
          "danger",
          "Network error. Please try again or contact us on WhatsApp.",
        );
      }

      btn.disabled = false;
      btn.textContent = btnText;
    });
  }

  // Back-to-top button
  if (window.jQuery) {
    var $ = window.jQuery;
    $(window).on("scroll", function () {
      if ($(this).scrollTop() > 300) {
        $("#backToTop").fadeIn();
      } else {
        $("#backToTop").fadeOut();
      }
    });
    $("#backToTop").on("click", function () {
      $("html, body").animate({ scrollTop: 0 }, 600);
    });
  }
})();
