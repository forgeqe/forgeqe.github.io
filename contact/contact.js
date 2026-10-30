// Contact us: the form becomes an email in the visitor's own email app, to the team's address build.sh put in. Nothing is
// sent from the page and nothing is kept: the site's policy allows no form posts (form-action 'none').
;(() => {
  const form = document.getElementById("contact-form")
  const error = document.getElementById("contact-error")
  if (!form) return
  // The team's address, kept out of the page's text and from address harvesters: base64 of it reversed (build.sh).
  let to = ""
  try {
    to = [...atob(form.dataset.to || "")].reverse().join("")
  } catch {}
  const field = (name) => (form.elements.namedItem(name)?.value || "").trim()
  form.addEventListener("submit", (e) => {
    e.preventDefault()
    const name = field("name")
    const email = field("email")
    const valid = (a) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a)
    const problem = !name ? "Please add your name." : !valid(email) ? "Please add your work email." : !valid(to) ? "This form is not set up yet. Please try again later." : ""
    error.hidden = !problem
    error.textContent = problem
    if (problem) {
      if (!name) form.elements.namedItem("name").focus()
      else if (!valid(email)) form.elements.namedItem("email").focus()
      return
    }
    const company = field("company")
    const subject = `ForgeQE: ${field("topic")}${company ? ` (${company})` : ""}`
    const body = [`Name: ${name}`, `Email: ${email}`, company ? `Company: ${company}` : "", `Topic: ${field("topic")}`, "", field("message")].filter((l, i) => l || i > 3).join("\n")
    // Every part is encoded, so nothing typed can add a header or another address.
    location.href = `mailto:${encodeURIComponent(to).replace("%40", "@")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  })
})()
