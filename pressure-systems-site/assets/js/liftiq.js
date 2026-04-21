(function () {
  "use strict";

  var body = document.body;
  var navToggle = document.querySelector("[data-lq-nav-toggle]");
  var navLinks = document.querySelector("[data-lq-nav-links]");

  if (navToggle && navLinks) {
    navToggle.addEventListener("click", function () {
      var isOpen = navLinks.classList.toggle("is-open");
      body.classList.toggle("menu-open", isOpen);
      navToggle.setAttribute("aria-expanded", String(isOpen));
    });

    navLinks.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        navLinks.classList.remove("is-open");
        body.classList.remove("menu-open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  var currentPath = window.location.pathname.replace(/\/$/, "") || "/";
  document.querySelectorAll("[data-lq-nav-link]").forEach(function (link) {
    var href = link.getAttribute("href");
    if (!href) {
      return;
    }
    var path = href.replace(/\/$/, "") || "/";
    if (path === currentPath) {
      link.classList.add("is-active");
      link.setAttribute("aria-current", "page");
    }
  });

  document.querySelectorAll(".liftiq-lead-form").forEach(function (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();

      var submitButton = form.querySelector("[type='submit']");
      var shell = form.closest(".lq-form-shell");
      var successPanel = shell ? shell.querySelector(".lq-success") : null;
      var status = form.querySelector(".lq-form-status");
      var originalLabel = submitButton ? submitButton.textContent : "";

      if (status) {
        status.textContent = "";
        status.classList.remove("error");
      }

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = form.dataset.loadingText || "Sending...";
      }

      var formData = new FormData(form);
      fetch(form.action, {
        method: "POST",
        body: formData,
        headers: { Accept: "application/json" }
      })
        .then(function (response) {
          if (!response.ok) {
            throw new Error("Submission failed");
          }

          if (shell) {
            shell.classList.add("is-submitted");
          }

          if (successPanel) {
            successPanel.classList.add("is-visible");
            successPanel.setAttribute("tabindex", "-1");
            successPanel.focus();
          }
        })
        .catch(function () {
          if (status) {
            status.textContent = form.dataset.errorText || "We could not send that request. Please try again or email sales@pressuresystems.au.";
            status.classList.add("error");
          }
          if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = originalLabel;
          }
        });
    });
  });
})();
