// ForgeQE docs: search (press /), copy buttons on code, and the sidebar and index following the reading position.
;(() => {
  // The header turns to glass once the page scrolls; on small screens its links are in a menu.
  const nav = document.querySelector(".nav")
  if (nav) {
    const onScroll = () => nav.classList.toggle("is-scrolled", scrollY > 16)
    addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    const toggle = nav.querySelector(".nav__menu")
    const menu = document.getElementById("menu")
    const open = (on) => { menu.hidden = !on; toggle.setAttribute("aria-expanded", String(on)) }
    toggle?.addEventListener("click", () => open(menu.hidden))
    addEventListener("keydown", (e) => { if (e.key === "Escape" && menu && !menu.hidden) { open(false); toggle.focus() } })
  }

  // Copy a code block.
  document.querySelectorAll(".copy-code").forEach((b) => b.addEventListener("click", async () => {
    const code = b.closest(".code").querySelector("code").textContent
    try {
      await navigator.clipboard.writeText(code)
      b.textContent = "Copied"
      b.classList.add("done")
    } catch {
      b.textContent = "Select it"
    }
    setTimeout(() => { b.textContent = "Copy"; b.classList.remove("done") }, 1600)
  }))

  // On a doc's page: the heading being read is marked in its index.
  const links = [...document.querySelectorAll(".docs-toc a")]
  const heads = links.map((a) => document.getElementById(decodeURIComponent(a.hash.slice(1)))).filter(Boolean)
  if (heads.length) {
    const mark = () => {
      let i = 0
      heads.forEach((h, j) => { if (h.getBoundingClientRect().top < 140) i = j })
      links.forEach((a, j) => a.classList.toggle("on", j === i))
    }
    addEventListener("scroll", mark, { passive: true })
    mark()
  }

  // In the user guide: the chapter being read is marked in the sidebar, and the right column lists its sections.
  const chapters = [...document.querySelectorAll(".guide .chapter")]
  const tocList = document.querySelector(".toc-list")
  if (chapters.length && tocList) {
    const side = [...document.querySelectorAll(".docs-side [data-chapter]")]
    let current = null
    const sections = (ch) => [...ch.querySelectorAll(":scope > .doc[id], :scope > .feat[id]")]
      .map((el) => ({ id: el.id, text: (el.querySelector(":scope > h3, :scope > h4, :scope > .hd h3")?.textContent || "").trim() }))
      .filter((x) => x.text)
    const show = (ch) => {
      if (ch === current) return
      current = ch
      side.forEach((a) => a.classList.toggle("on", a.dataset.chapter === ch.id))
      tocList.replaceChildren(...sections(ch).map((x) => {
        const li = document.createElement("li")
        const a = document.createElement("a")
        a.href = `#${x.id}`
        a.textContent = x.text
        li.append(a)
        return li
      }))
      const head = tocList.previousElementSibling
      if (head) head.textContent = ch.querySelector(".chead h2")?.textContent || "In this chapter"
      // Keep the chapter's link in view in a long sidebar, without moving the page.
      const on = side.find((a) => a.dataset.chapter === ch.id)
      const box = on?.closest(".docs-side")
      if (on && box && box.scrollHeight > box.clientHeight) box.scrollTop = on.offsetTop - box.clientHeight / 2
    }
    const pick = () => {
      let ch = chapters[0]
      chapters.forEach((c) => { if (c.getBoundingClientRect().top < 200) ch = c })
      show(ch)
      const items = [...tocList.querySelectorAll("a")]
      let i = -1
      items.forEach((a, j) => { const el = document.getElementById(a.hash.slice(1)); if (el && el.getBoundingClientRect().top < 200) i = j })
      items.forEach((a, j) => a.classList.toggle("on", j === i))
    }
    addEventListener("scroll", pick, { passive: true })
    pick()
  } else {
    // On a doc's page: its own link stays in view in the sidebar, without moving the page.
    const on = document.querySelector('.docs-side [aria-current="page"]')
    const box = on?.closest(".docs-side")
    if (on && box && box.scrollHeight > box.clientHeight) box.scrollTop = on.offsetTop - box.clientHeight / 2
  }

  // Search: titles, headings and text of every page, from search.json.
  const dlg = document.createElement("dialog")
  dlg.className = "search"
  dlg.setAttribute("aria-label", "Search the docs")
  const field = document.createElement("div")
  field.className = "search-field"
  const svg = document.querySelector(".search-open .icon")?.cloneNode(true)
  const input = document.createElement("input")
  Object.assign(input, { type: "search", placeholder: "Search the docs", autocomplete: "off", spellcheck: false })
  input.setAttribute("aria-label", "Search the docs")
  input.setAttribute("aria-controls", "search-results")
  const esc = document.createElement("kbd")
  esc.textContent = "Esc"
  field.append(...[svg, input, esc].filter(Boolean))
  const list = document.createElement("ul")
  list.className = "search-results"
  list.id = "search-results"
  list.setAttribute("role", "listbox")
  dlg.append(field, list)
  dlg.addEventListener("click", (e) => e.target === dlg && dlg.close())
  document.body.append(dlg)

  let index = null
  let selected = 0
  const load = async () => {
    if (index) return index
    const r = await fetch("/docs/search.json")
    index = (await r.json()).map((p) => ({ ...p, lt: p.t.toLowerCase(), lx: p.x.toLowerCase() }))
    return index
  }
  const open = async () => {
    if (!dlg.open) dlg.showModal()
    input.focus()
    input.select()
    await load()
    show()
  }
  document.querySelectorAll(".search-open").forEach((b) => b.addEventListener("click", open))
  addEventListener("keydown", (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable
    if ((e.key === "/" && !typing) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")) {
      e.preventDefault()
      open()
    }
  })

  // Text, with the query's words marked. Built from text nodes, so nothing in the index is read as HTML.
  const marked = (text, words) => {
    const frag = document.createDocumentFragment()
    if (!words.length) { frag.append(text); return frag }
    const re = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi")
    text.split(re).forEach((part, i) => {
      if (i % 2) { const m = document.createElement("mark"); m.textContent = part; frag.append(m) } else frag.append(part)
    })
    return frag
  }
  const results = (q) => {
    if (!index) return []
    const words = q.toLowerCase().split(/\s+/).filter(Boolean)
    if (!words.length) return index.slice(0, 8).map((p) => ({ p, url: p.u, title: p.t, where: p.g, text: p.x.slice(0, 140) }))
    const out = []
    for (const p of index) {
      for (const [h, id] of p.h) {
        const lh = h.toLowerCase()
        if (words.every((w) => lh.includes(w))) out.push({ score: 3, url: `${p.u}#${id}`, title: h, where: `${p.g} · ${p.t}`, text: "" })
      }
      const inTitle = words.every((w) => p.lt.includes(w))
      if (inTitle || words.every((w) => p.lx.includes(w))) {
        const at = p.lx.indexOf(words[0])
        const from = Math.max(0, at - 50)
        out.push({ score: inTitle ? 4 : 1, url: p.u, title: p.t, where: p.g, text: `${from ? "…" : ""}${p.x.slice(from, from + 160)}…` })
      }
    }
    return out.sort((a, b) => b.score - a.score).slice(0, 30)
  }
  const show = () => {
    const words = input.value.toLowerCase().split(/\s+/).filter(Boolean)
    const found = results(input.value)
    selected = 0
    list.replaceChildren()
    if (!found.length) {
      const li = document.createElement("li")
      li.className = "search-empty"
      li.textContent = "Nothing matches. Try a command, a setting or a tool name."
      list.append(li)
      return
    }
    found.forEach((r, i) => {
      const li = document.createElement("li")
      const a = document.createElement("a")
      a.href = r.url
      a.setAttribute("role", "option")
      a.setAttribute("aria-selected", String(i === 0))
      const where = document.createElement("span"); where.className = "r-where"; where.textContent = r.where
      const title = document.createElement("span"); title.className = "r-title"; title.append(marked(r.title, words))
      a.append(where, title)
      if (r.text) { const t = document.createElement("span"); t.className = "r-text"; t.append(marked(r.text, words)); a.append(t) }
      a.addEventListener("click", () => dlg.close())
      li.append(a)
      list.append(li)
    })
  }
  input.addEventListener("input", show)
  input.addEventListener("keydown", (e) => {
    const items = [...list.querySelectorAll("a")]
    if (!items.length) return
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault()
      selected = (selected + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length
      items.forEach((a, i) => a.setAttribute("aria-selected", String(i === selected)))
      items[selected].scrollIntoView({ block: "nearest" })
    } else if (e.key === "Enter") {
      e.preventDefault()
      items[selected].click()
      location.href = items[selected].href
    }
  })
})()
