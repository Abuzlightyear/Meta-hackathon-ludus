// Living Classroom controller — mounts the 2D world (SVG + keyboard mirror) into the learn flow.
// Professor D welcomes in the academy, then the scene transitions to the topic world.
// All rendering is procedural SVG from validated scene specs; no external images.
import { renderSceneToSVG } from "/src/world-renderer.js";
import { academyScene, sceneForTopic, genericTopicScene, castleSceneAfterChange, testCastleDesign, fractionsScene, cloudsScene, fractionFromScene, cloudsSceneAfterChange, compareAnimals, testDesign } from "/src/simulations.js";
import { validateSceneSpec } from "/src/scene-spec.js";
import { gestureForEvent } from "/src/professor.js";
import { createWorldState, applyInteraction } from "/src/world/engine.js";
import { nextFocusId } from "/src/world/render-svg.js";

const reduced = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function paint(host, scene, { highlightId = null } = {}) {
  let wstate = createWorldState(scene, { reducedMotion: reduced() }).state || null;
  const check = validateSceneSpec(scene);
  host.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "world-wrap";
  if (!check.valid) {
    wrap.innerHTML = `<div class="notice" role="alert"><strong>World unavailable.</strong> ${check.errors[0]?.message || "Invalid scene."}</div>`;
    host.append(wrap);
    return;
  }
  wrap.innerHTML = renderSceneToSVG(scene, { highlightId, reducedMotion: reduced(), hideProfessor: true });
  // Keyboard mirror: every interactive object is a real button.
  const bar = document.createElement("div");
  bar.className = "world-controls";
  bar.setAttribute("role", "group");
  bar.setAttribute("aria-label", `Interactive objects in ${scene.title}`);
  for (const o of scene.objects.filter((x) => x.interactive)) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "ghost world-obj-btn";
    b.textContent = o.label;
    b.dataset.objectId = o.id;
    b.setAttribute("aria-describedby", "world-purpose");
    b.addEventListener("click", () => {
      if (wstate) { const r = applyInteraction(wstate, { kind: "select", objectId: o.id }); if (r.ok) { wstate = r.state; scene = wstate.scene; } }
      host.querySelectorAll(".world-obj-btn").forEach((x) => x.removeAttribute("aria-current"));
      b.setAttribute("aria-current", "true");
      const p = host.querySelector("#world-purpose");
      if (p) p.textContent = `${o.label} — ${o.purpose} Try: ${(scene.interactions[0]?.prompt || "Observe it closely.")}`;
      paint(host, scene, { highlightId: o.id });
      host.querySelector(`[data-object-id="${o.id}"]`)?.focus();
    });
    bar.append(b);
  }
  bar.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const nid = nextFocusId(scene, document.activeElement?.dataset?.objectId, e.key === "ArrowRight" ? 1 : -1);
    if (nid) host.querySelector(`[data-object-id="${nid}"]`)?.focus();
  });
  wrap.append(bar);
  // Live computed readout (fraction + equivalence / weather / classify / test).
  const readout = document.createElement("p");
  readout.className = "world-readout"; readout.setAttribute("aria-live", "polite");
  const fracNow = fractionFromScene(scene);
  if (fracNow) readout.textContent = `Now: ${fracNow.display} = ${fracNow.decimal}. Equivalent: ${fracNow.equivalents.map((e) => `${e.numerator}/${e.denominator}`).join(" = ")}. Simplified: ${fracNow.simplified.numerator}/${fracNow.simplified.denominator}.`;
  else if (scene.weather) readout.textContent = `Now: ${scene.weather.stage} — ${scene.weather.cloudType}. ${scene.weather.description}`;
  else if (scene.id === "animals-habitats") { const spp = scene.objects.filter((o) => o.type === "animal").map((o) => o.props.species); if (spp.length >= 2) readout.textContent = `Compare: ${compareAnimals(spp[0], spp[1]).summary}`; }
  else if (scene.id === "engineering-wall") { const wall = scene.objects.find((o) => o.type === "wall"); const beam = scene.objects.find((o) => o.type === "beam"); if (wall && beam) { const t = testDesign({ wallRows: wall.props.rows, beamOffset: beam.x - wall.x }); readout.textContent = `Design test: ${t.holds ? "HOLDS" : "FAILS"} — ${t.reason}`; } }
  else if (scene.id === "volcano-eruption") readout.textContent = `Honest limit: diagram only — eruption physics is not simulated. ${scene.workedExample || ""}`;
  else if (scene.id === "castle-wall" && scene.castle) { const t = testCastleDesign(scene.castle); readout.textContent = `Castle test: ${t.holds ? "HOLDS" : "FALLS"} — ${t.reason}`; }
  else if (scene.id === "generic-topic") readout.textContent = `Composed diagram for this topic — not a bespoke simulation. Unsupported: ${(scene.unsupportedParts || []).join("; ")}.`;
  if (readout.textContent) wrap.append(readout);
  // Student controls through the engine/composer (no separate pages).
  const frac = scene.objects.find((o) => o.props && "denominator" in o.props);
  if (frac && wstate) {
    const row = document.createElement("label"); row.className = "world-slider";
    row.textContent = "Equal parts (divide): ";
    const input = document.createElement("input"); input.type = "range";
    input.min = "2"; input.max = "8"; input.step = "1"; input.value = String(frac.props.denominator);
    input.setAttribute("aria-label", "Equal parts");
    input.addEventListener("input", () => {
      const r = applyInteraction(wstate, { kind: "slider", objectId: frac.id, prop: "denominator", value: Number(input.value), min: 1, max: 24 });
      if (r.ok) { wstate = r.state; paint(host, wstate.scene, { highlightId: frac.id }); host.querySelector(".world-slider input")?.focus(); }
    });
    row.append(input); wrap.append(row);
  }
  if (scene.weather) {
    const mk = (labelText, key, min, max, val) => {
      const row = document.createElement("label"); row.className = "world-slider";
      row.textContent = labelText;
      const input = document.createElement("input"); input.type = "range";
      input.min = String(min); input.max = String(max); input.step = "1"; input.value = String(val);
      input.setAttribute("aria-label", labelText.trim());
      input.addEventListener("input", () => {
        const next = cloudsSceneAfterChange(scene, { [key]: Number(input.value) });
        paint(host, next, { highlightId: "weather-controls" });
      });
      row.append(input); return row;
    };
    wrap.append(mk("Temperature °C: ", "temperature", -5, 35, scene.weather.temperature));
    wrap.append(mk("Moisture (humidity %): ", "humidity", 0, 100, scene.weather.humidity));
  }
  if (scene.id === "castle-wall" && scene.castle) {
    const row = document.createElement("label"); row.className = "world-slider";
    row.textContent = "Wall thickness (depth): ";
    const input = document.createElement("input"); input.type = "range";
    input.min = "1"; input.max = "6"; input.step = "1"; input.value = String(scene.castle.thickness);
    input.setAttribute("aria-label", "Wall thickness");
    input.addEventListener("input", () => { paint(host, castleSceneAfterChange(scene, { thickness: Number(input.value) }), { highlightId: "castle-depth" }); });
    row.append(input); wrap.append(row);
  }
  // Pointer drag for drag/place objects (mouse/touch); keyboard path above remains primary accessible route
  wrap.querySelectorAll("[data-obj]").forEach((g) => {
    const obj = scene.objects.find((o) => o.id === g.getAttribute("data-obj"));
    if (!obj || !(obj.actions?.includes("drag") || obj.actions?.includes("place"))) return;
    g.style.cursor = "grab"; g.setAttribute("tabindex", "0");
    g.addEventListener("pointerdown", (e) => {
      const svg = wrap.querySelector("svg"); if (!svg) return;
      const rect = svg.getBoundingClientRect(); const vb = scene.viewport || { w: 800, h: 450 };
      const move = (ev) => { const x = ((ev.clientX - rect.left) / rect.width) * vb.w; const y = ((ev.clientY - rect.top) / rect.height) * vb.h; if (wstate) { const r = applyInteraction(wstate, { kind: "drag", objectId: obj.id, x, y }); if (r.ok) wstate = r.state; } };
      const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); if (wstate) paint(host, wstate.scene, { highlightId: obj.id }); };
      window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); e.preventDefault();
    });
  });
  const purpose = document.createElement("p");
  purpose.id = "world-purpose";
  purpose.className = "muted world-purpose";
  purpose.setAttribute("aria-live", "polite");
  purpose.textContent = scene.interactions[0]?.prompt || scene.title;
  wrap.append(purpose);
  host.append(wrap);
}

export function mountAcademy(host) {
  if (!host) return null;
  const scene = academyScene();
  scene.professor.gesture = gestureForEvent("welcome");
  paint(host, scene);
  return scene;
}

export function mountTopicWorld(host, topic) {
  if (!host) return null;
  let scene = sceneForTopic(topic);
  if (!scene) scene = genericTopicScene(topic);
  // Fractions start manipulable: 4 parts, 1 selected. Clouds start at gentle humidity.
  if (/fraction/i.test(topic)) scene = fractionsScene({ denominator: 4, selected: 1 });
  if (/cloud/i.test(topic)) scene = cloudsScene({ temperature: 24, humidity: 55 });
  paint(host, scene);
  return scene;
}

export function professorTo(host, scene, event) {
  if (!host || !scene) return;
  scene.professor.gesture = gestureForEvent(event);
  paint(host, scene);
}
