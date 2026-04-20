(function () {
  const siteConfig = window.PRESSURE_SYSTEMS_SITE || {};
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
    const subject = `Pressure Systems Audit enquiry - ${business}`;
    const body = [
      `Name: ${formData.get("name") || ""}`,
      `Business: ${business}`,
      `Email: ${formData.get("email") || ""}`,
      `Website: ${formData.get("website") || ""}`,
      "",
      "What feels wrong:",
      `${formData.get("issue") || ""}`,
      "",
      "Desired outcome:",
      `${formData.get("goal") || ""}`
    ].join("\n");

    return `mailto:${encodeURIComponent(enquiryEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
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
        setStatus("Your email draft should be open now. If not, email sales@pressuresystems.au directly.", "info");
      }
    } catch (error) {
      setStatus("Submission failed. Please retry or email sales@pressuresystems.au directly and include your site link.", "error");
    } finally {
      submitButton.disabled = false;
    }
  });
}());
