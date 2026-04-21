(function () {
  const siteConfig = window.PRESSURE_SYSTEMS_SITE || {};
  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const progressBar = document.querySelector("[data-scroll-progress]");
  const revealItems = Array.from(document.querySelectorAll("[data-reveal]"));
  const parallaxItems = Array.from(document.querySelectorAll("[data-parallax]"));

  function revealImmediately() {
    revealItems.forEach(function (item) {
      item.classList.add("is-visible");
    });
  }

  function initRevealSystem() {
    if (!revealItems.length) {
      return;
    }

    if (reducedMotionQuery.matches || !("IntersectionObserver" in window)) {
      revealImmediately();
      return;
    }

    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, {
      threshold: 0.12,
      rootMargin: "0px 0px -8% 0px"
    });

    revealItems.forEach(function (item, index) {
      item.style.transitionDelay = (index % 4) * 50 + "ms";
      observer.observe(item);
    });
  }

  function updateScrollProgress() {
    if (!progressBar) {
      return;
    }

    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = scrollable > 0 ? Math.min(window.scrollY / scrollable, 1) : 0;
    progressBar.style.width = ratio * 100 + "%";
  }

  function updateParallax() {
    if (!parallaxItems.length || reducedMotionQuery.matches) {
      return;
    }

    const viewportHeight = window.innerHeight || 1;

    parallaxItems.forEach(function (item) {
      const strength = Number(item.getAttribute("data-parallax")) || 0;
      const rect = item.getBoundingClientRect();
      const offset = ((rect.top + rect.height / 2) - viewportHeight / 2) / viewportHeight;
      item.style.transform = "translateY(" + (offset * strength * -1).toFixed(2) + "px)";
    });
  }

  function onScroll() {
    updateScrollProgress();
    updateParallax();
  }

  initRevealSystem();
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);

  reducedMotionQuery.addEventListener("change", function () {
    if (reducedMotionQuery.matches) {
      revealImmediately();
      parallaxItems.forEach(function (item) {
        item.style.transform = "";
      });
    } else {
      updateParallax();
    }
  });

  const form = document.getElementById("auditForm");
  const status = document.getElementById("formStatus");

  if (!form || !status) {
    return;
  }

  const endpoint = (siteConfig.formEndpoint || "").trim();
  const enquiryEmail = siteConfig.enquiryEmail || "sales@pressuresystems.au";

  function setStatus(message, kind) {
    status.textContent = message;
    status.dataset.state = kind;
  }

  function buildMailto(formData) {
    const business = formData.get("business") || "Pressure Systems Audit enquiry";
    const subject = "Pressure Systems Audit enquiry - " + business;
    const body = [
      "Name: " + (formData.get("name") || ""),
      "Business: " + business,
      "Email: " + (formData.get("email") || ""),
      "Website: " + (formData.get("website") || ""),
      "",
      "What feels wrong:",
      "" + (formData.get("issue") || ""),
      "",
      "Desired outcome:",
      "" + (formData.get("goal") || "")
    ].join("\n");

    return "mailto:" + encodeURIComponent(enquiryEmail) +
      "?subject=" + encodeURIComponent(subject) +
      "&body=" + encodeURIComponent(body);
  }

  async function submitToEndpoint(formData) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json"
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error("Form submission failed");
    }
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (!form.reportValidity()) {
      setStatus("Please complete the required fields before submitting.", "error");
      return;
    }

    const formData = new FormData(form);

    if (formData.get("_gotcha")) {
      setStatus("Submission blocked.", "error");
      return;
    }

    const submitButton = form.querySelector("button[type='submit']");
    submitButton.disabled = true;

    try {
      if (endpoint) {
        await submitToEndpoint(formData);
        form.reset();
        setStatus("Thanks. Your audit request has been sent.", "success");
      } else {
        window.location.href = buildMailto(formData);
        setStatus("Your email draft should be open now. If not, use the direct contact line in this section.", "info");
      }
    } catch (error) {
      setStatus("Submission failed. Please retry or use the direct contact line in this section.", "error");
    } finally {
      submitButton.disabled = false;
    }
  });
}());
