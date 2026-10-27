// ForgeQE home page: reveals, the icons' cube-by-cube build, the explainer in the hero, the recording, the report's
// tabs, counters, copy buttons and the menu. Without this script the page shows everything at once and reads the same.
;(() => {
  const root = document.documentElement
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches
  root.classList.add("js")

  const seen = (els, fn, opts = { threshold: 0.18 }) => {
    if (!("IntersectionObserver" in window)) return els.forEach((el) => fn(el, true))
    const io = new IntersectionObserver((entries) => entries.forEach((e) => fn(e.target, e.isIntersecting, io)), opts)
    els.forEach((el) => io.observe(el))
  }

  // Smooth scrolling.
  if (!reduce && window.Lenis) {
    const lenis = (window.lenis = new Lenis({ lerp: 0.1, anchors: { offset: -100 } }))
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf) }
    requestAnimationFrame(raf)
  }

  // Blocks rise in once, as they come into view.
  seen([...document.querySelectorAll("[data-reveal]")], (el, on, io) => {
    if (!on) return
    el.classList.add("seen")
    io?.unobserve(el)
  })

  // Icons: each cube drops into place, in drawing order. The CSP allows no style attribute, so the delays are set here.
  const icons = [...document.querySelectorAll("svg.ic")]
  icons.forEach((svg) => svg.querySelectorAll("g").forEach((g, i) => (g.style.animationDelay = `${Math.min(i * 16, 900)}ms`)))
  if (reduce) icons.forEach((svg) => svg.classList.add("built"))
  else seen(icons, (svg, on, io) => { if (on) { svg.classList.add("built"); io?.unobserve(svg) } }, { threshold: 0.5 })

  // Counters count up when seen.
  seen([...document.querySelectorAll("[data-num]")], (el, on, io) => {
    if (!on) return
    io?.unobserve(el)
    if (reduce) return
    const to = parseFloat(el.dataset.num)
    const dp = parseInt(el.dataset.dp || "0", 10)
    const start = performance.now()
    const tick = (now) => {
      const k = Math.min(1, (now - start) / 1100)
      el.textContent = (to * (1 - Math.pow(1 - k, 3))).toFixed(dp)
      if (k < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })

  // The recorded run plays, muted, only while on screen.
  seen([...document.querySelectorAll("video[data-rec]")], (v, on) => {
    if (reduce) return
    if (on) { v.preload = "auto"; v.play().catch(() => {}) } else v.pause()
  }, { threshold: 0.3 })

  // The explainer: its first 30 seconds loop muted while on screen (media/preview.mp4, 0.75 MB); "Play with sound"
  // loads the whole film (media/main.mp4, about 20 MB) and plays it from the start with sound and its own controls,
  // so the page never downloads the full film unless someone asks for it.
  const film = document.getElementById("film")
  const sound = document.querySelector(".player__sound")
  if (film && sound) {
    let loud = false
    seen([film], (v, on) => {
      if (on && !reduce && !loud) v.play().catch(() => {})
      else if (!on) v.pause()
    }, { threshold: 0.4 })
    const label = sound.querySelector("span")
    sound.addEventListener("click", () => {
      if (!loud) {
        loud = true
        film.muted = false
        film.loop = false
        film.controls = true
        if (film.dataset.full) film.src = film.dataset.full
        film.play().catch(() => {})
        sound.dataset.state = "sound"
        label.textContent = "Mute"
      } else {
        film.muted = !film.muted
        sound.dataset.state = film.muted ? "muted" : "sound"
        label.textContent = film.muted ? "Unmute" : "Mute"
      }
    })
  }

  // The gap chart: "Today" or "With ForgeQE". Once it has drawn itself, switching back brings the gap's contents in
  // without the first time's wait.
  const gapviz = document.querySelector(".gapviz")
  if (gapviz) {
    const btns = [...gapviz.querySelectorAll("[data-gap]")]
    btns.forEach((b) => b.addEventListener("click", () => {
      btns.forEach((x) => x.setAttribute("aria-pressed", String(x === b)))
      gapviz.classList.toggle("is-forge", b.dataset.gap === "forge")
      gapviz.classList.add("played")
    }))
  }

  // The model rows loop the same way.
  if (!reduce) document.querySelectorAll(".models__row").forEach((row) => [...row.children].forEach((li) => { const c = li.cloneNode(true); c.setAttribute("aria-hidden", "true"); row.append(c) }))

  // The report's pages: tabs, with arrow keys between them.
  const tabs = [...document.querySelectorAll(".report__tabs [role=tab]")]
  const show = (tab) => tabs.forEach((t) => {
    const on = t === tab
    t.setAttribute("aria-selected", String(on))
    t.tabIndex = on ? 0 : -1
    document.getElementById(t.getAttribute("aria-controls")).hidden = !on
  })
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => show(t))
    t.addEventListener("keydown", (e) => {
      const d = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0
      if (!d) return
      e.preventDefault()
      const next = tabs[(i + d + tabs.length) % tabs.length]
      show(next)
      next.focus()
    })
  })

  // Copy buttons.
  document.querySelectorAll("[data-cmd]").forEach((btn) => btn.addEventListener("click", () => {
    const label = btn.querySelector(".cmd__copy")
    const done = (text) => { label.textContent = text; btn.toggleAttribute("data-copied", text === "Copied"); setTimeout(() => { label.textContent = "Copy"; btn.removeAttribute("data-copied") }, 1600) }
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(btn.dataset.cmd).then(() => done("Copied"), () => done("Select it"))
    else done("Select it")
  }))

  // npm or pip.
  const installCmd = document.getElementById("install-cmd")
  document.querySelectorAll("[data-pm]").forEach((tab, _, all) => tab.addEventListener("click", () => {
    all.forEach((t) => t.setAttribute("aria-pressed", String(t === tab)))
    installCmd.dataset.cmd = tab.dataset.pm
    installCmd.querySelector(".cmd__text").textContent = tab.dataset.pm
  }))

  // The header turns to glass once the page scrolls, hides while scrolling down and returns on the way up.
  const bar = document.querySelector(".nav")
  let last = scrollY
  const onScroll = () => {
    const y = scrollY
    bar.classList.toggle("is-scrolled", y > 24)
    if (y > 200 && y > last + 4) bar.setAttribute("data-hidden", "")
    else if (y < last - 4 || y < 80) bar.removeAttribute("data-hidden")
    last = y
  }
  addEventListener("scroll", onScroll, { passive: true })
  onScroll()
  bar.addEventListener("focusin", () => bar.removeAttribute("data-hidden"))
  const toggle = document.querySelector(".nav__menu")
  const menu = document.getElementById("menu")
  const open = (on) => { menu.hidden = !on; toggle.setAttribute("aria-expanded", String(on)) }
  toggle.addEventListener("click", () => open(menu.hidden))
  menu.addEventListener("click", (e) => { if (e.target.closest("a")) open(false) })
  addEventListener("keydown", (e) => { if (e.key === "Escape" && !menu.hidden) { open(false); toggle.focus() } })
})()
