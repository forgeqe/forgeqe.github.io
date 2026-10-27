// The architecture page's hub fits one screen: on a desktop it is drawn at a fixed size (arch.css) and scaled to fit
// the window's width and the height left below the header, so the whole system is in view at once. Its wires are SVG
// drawn from one card's edge to the other's, each from sender to receiver, so its arrowhead and the motion of its
// dashes agree; tasks and results take the deck's elbow round the memory core. Below 1180px the hub stacks into one
// column with its CSS wires, and this script leaves it alone. Styles are set through the CSSOM, which the CSP allows.
const fit = document.querySelector(".fit")
const hub = fit && fit.querySelector(".hub")
const NS = "http://www.w3.org/2000/svg"
let svg = null

function el(name, attrs, parent) {
  const node = document.createElementNS(NS, name)
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v))
  if (parent) parent.appendChild(node)
  return node
}

function marker(defs, colour) {
  const m = el("marker", { id: `arch-${colour}`, viewBox: "0 0 8 8", refX: 7, refY: 4, markerWidth: 8, markerHeight: 8, markerUnits: "userSpaceOnUse", orient: "auto" }, defs)
  el("path", { d: "M0 0 L8 4 L0 8 Z", class: `m-${colour}` }, m)
}

// A path through the points with rounded corners.
function rounded(points, r = 10) {
  let d = `M${points[0][0]} ${points[0][1]}`
  for (let i = 1; i < points.length - 1; i++) {
    const [px, py] = points[i - 1], [x, y] = points[i], [nx, ny] = points[i + 1]
    const a = Math.min(r, Math.hypot(x - px, y - py) / 2), b = Math.min(r, Math.hypot(nx - x, ny - y) / 2)
    const ax = x - Math.sign(x - px) * a, ay = y - Math.sign(y - py) * a
    const bx = x + Math.sign(nx - x) * b, by = y + Math.sign(ny - y) * b
    d += ` L${ax} ${ay} Q${x} ${y} ${bx} ${by}`
  }
  const [lx, ly] = points[points.length - 1]
  return `${d} L${lx} ${ly}`
}

function draw(scale) {
  if (!svg) {
    svg = el("svg", { class: "hub__svg", "aria-hidden": "true" })
    hub.appendChild(svg)
  }
  svg.replaceChildren()
  const w = hub.offsetWidth, h = hub.offsetHeight
  for (const [k, v] of Object.entries({ width: w, height: h, viewBox: `0 0 ${w} ${h}` })) svg.setAttribute(k, String(v))
  const defs = el("defs", {}, svg)
  for (const c of ["blue", "violet", "green"]) marker(defs, c)

  const H = hub.getBoundingClientRect()
  const box = (node) => {
    const r = node.getBoundingClientRect()
    const l = (r.left - H.left) / scale, t = (r.top - H.top) / scale
    return { l, t, r: l + r.width / scale, b: t + r.height / scale, cx: l + r.width / scale / 2, cy: t + r.height / scale / 2 }
  }
  const q = (s) => hub.querySelector(s)
  const flows = (s) => [...hub.querySelectorAll(`${s} .flow`)].map(box)
  const line = (d, colour) => el("path", { d, class: `w-${colour}`, "marker-end": `url(#arch-${colour})` }, svg)

  const you = box(q(".node--you")), agent = box(q(".node--agent")), model = box(q(".node--model"))
  const core = box(q(".core")), team = box(q(".node--agents")), integ = box(q(".node--integ"))
  const eng = box(q(".node--engines")), outs = box(q(".outcol"))

  // Side by side: [left card, right card, direction of each of the cell's two lines] ("r": left to right).
  const across = [[".wire--1", you, agent, ["r", "l"]], [".wire--2", agent, model, ["r", "l"]],
    [".wire--5", integ, team, ["l", "r"]], [".wire--6", team, eng, ["r", "l"]]]
  for (const [cell, a, b, dirs] of across) {
    flows(cell).forEach((f, i) => {
      const y = f.cy
      line(dirs[i] === "r" ? `M${a.r} ${y} L${b.l} ${y}` : `M${b.l} ${y} L${a.r} ${y}`, "blue")
    })
  }
  // Stacked: [upper card, lower card, directions] ("d": downwards). Memory's wires are violet.
  const down = [[".wire--3", agent, core, ["d", "u"]], [".wire--4", core, team, ["d", "u"]]]
  for (const [cell, a, b, dirs] of down) {
    flows(cell).forEach((f, i) => {
      const x = f.cx
      line(dirs[i] === "d" ? `M${x} ${a.b} L${x} ${b.t}` : `M${x} ${b.t} L${x} ${a.b}`, "violet")
    })
  }
  // Tasks go down the left of the core, results come back up its right: elbows like the deck's.
  const lx = box(q(".lane--tasks")).l + 8, rx = box(q(".lane--results")).r - 8
  const gapTop = (agent.b + core.t) / 2, gapLow = (core.b + team.t) / 2
  line(rounded([[agent.l + 30, agent.b], [agent.l + 30, gapTop], [lx, gapTop], [lx, gapLow], [team.l + 30, gapLow], [team.l + 30, team.t]]), "blue")
  line(rounded([[team.r - 30, team.t], [team.r - 30, gapLow], [rx, gapLow], [rx, gapTop], [agent.r - 30, gapTop], [agent.r - 30, agent.b]]), "blue")
  // Every run ends in what it leaves.
  const y7 = flows(".wire--7")[0].cy
  line(`M${eng.r} ${y7} L${outs.l} ${y7}`, "green")
}

function size() {
  if (!hub) return
  if (window.innerWidth < 1180) {
    hub.style.removeProperty("transform")
    hub.style.removeProperty("left")
    fit.style.removeProperty("height")
    fit.classList.remove("fit--on")
    if (svg) svg.replaceChildren()
    return
  }
  fit.classList.add("fit--on")
  const w = hub.offsetWidth
  const h = hub.offsetHeight
  const header = document.querySelector(".site-nav")
  const bar = header ? header.offsetHeight : 0
  const top = fit.getBoundingClientRect().top + window.scrollY
  // Fit below the title while the text stays readable (or it costs little); otherwise fill the screen under the
  // header, and the title scrolls away.
  const byWidth = Math.min(fit.clientWidth / w, 1.2)
  const belowTitle = Math.min(byWidth, (window.innerHeight - top - 16) / h)
  const fullScreen = Math.min(byWidth, (window.innerHeight - bar - 20) / h)
  const scale = belowTitle >= 0.85 || belowTitle >= 0.92 * fullScreen ? belowTitle : fullScreen
  hub.style.setProperty("transform", `scale(${scale})`)
  hub.style.setProperty("left", `${Math.max(0, (fit.clientWidth - w * scale) / 2)}px`)
  fit.style.setProperty("height", `${Math.ceil(h * scale)}px`)
  draw(scale)
}

size()
window.addEventListener("resize", size)
if (document.fonts) document.fonts.ready.then(size)
