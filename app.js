// ─── Bachillerato · Escuelas Salesianas María Auxiliadora (Nervión) ──────────
// Una sola web para alumnado y profesorado:
//  · Cualquiera ve el calendario de exámenes, se suscribe a los calendarios y abre los enlaces de la PEvAU.
//  · El profesorado inicia sesión con Microsoft 365 (Supabase común) para añadir, editar o eliminar exámenes.
//    El Apps Script comprueba esa sesión antes de aceptar cualquier cambio.
(() => {
  const CFG = window.APP_CONFIG || {};
  const DOMINIOS = [CFG.dominio, ...(CFG.dominiosExtra || [])].filter(Boolean);
  const SUPABASE_JS = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js";
  const CLASES = Object.keys(CLASS_ITINERARIES);
  const CACHE_KEY = "bachillerato-examenes-v1";
  const FILTROS_KEY = "bachillerato-filtros-v1";
  const VOLVER_KEY = "bachillerato-volver";
  const VISTAS = ["calendario", "suscripcion", "pevau", "acceso"];
  const ICONO_MS = `<svg viewBox="0 0 21 21" aria-hidden="true"><rect x="1" y="1" width="9" height="9" fill="#f25022"/><rect x="11" y="1" width="9" height="9" fill="#7fba00"/><rect x="1" y="11" width="9" height="9" fill="#00a4ef"/><rect x="11" y="11" width="9" height="9" fill="#ffb900"/></svg>`;
  const COLOR_CLASE = { "1º Bach A": "#b4be00", "1º Bach B": "#8a9400", "2º Bach A": "#009abb", "2º Bach B": "#007791" };

  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pad = (n) => String(n).padStart(2, "0");
  const isoDia = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
  const hoyIso = () => { const n = new Date(); return isoDia(n.getFullYear(), n.getMonth(), n.getDate()); };
  const normFecha = (v) => { const s = String(v || "").trim(); return s.includes("T") ? s.split("T")[0] : s.slice(0, 10); };
  const sinTildes = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

  // Cada docente tiene un tono fijo (por orden alfabético), en claro y en oscuro
  const DOCENTES = Object.keys(TEACHER_DATA).sort((a, b) => a.localeCompare(b, "es"));
  const tono = (profe) => { const i = DOCENTES.indexOf(profe); return i < 0 ? 200 : Math.round((i * 137.5 + 20) % 360); };

  let examenes = [];
  let cargados = false;
  let filtroClase = "ALL", filtroItin = "ALL";
  let impClase = "ALL", impItin = "ALL";
  const hoy = new Date();
  let mes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  let sb = null, yo = null;

  // ── Avisos ────────────────────────────────────────────────────────────────
  function toast(msg, tipo = "ok", ms = 4500) {
    const el = document.createElement("div");
    el.className = "toast" + (tipo === "error" ? " error" : "");
    el.textContent = msg;
    $("toasts").appendChild(el);
    setTimeout(() => el.remove(), ms);
  }

  // ── Vistas y menú ─────────────────────────────────────────────────────────
  function vistaActual() {
    const h = location.hash.replace("#", "");
    return VISTAS.includes(h) ? h : "calendario";
  }
  function mostrarVista() {
    if (/access_token=|error_description=/.test(location.hash)) return; // vuelta del inicio de sesión: lo trata Supabase
    const v = vistaActual();
    document.querySelectorAll("dialog[open]").forEach((d) => d.close());
    VISTAS.forEach((n) => { $("v-" + n).hidden = n !== v; });
    document.querySelectorAll("#menu [data-v]").forEach((b) => b.classList.toggle("activo", b.dataset.v === v));
    document.querySelector('#menu [data-menu="examenes"]').classList.toggle("activa", v === "calendario" || v === "suscripcion");
    document.querySelector('#menu > [data-v="pevau"]').classList.toggle("activa", v === "pevau");
    if (v === "acceso") pintarAcceso();
  }
  function ir(v) {
    document.querySelectorAll(".menu-g.abierto").forEach((g) => g.classList.remove("abierto"));
    if (location.hash === "#" + v) mostrarVista(); else location.hash = v;
    const nav = $("menu");
    if (nav.getBoundingClientRect().top < 0) nav.scrollIntoView({ block: "start" });
  }
  $("menu").addEventListener("click", (ev) => {
    const b = ev.target.closest("button");
    if (!b) return;
    if (b.dataset.menu) { b.parentElement.classList.toggle("abierto"); return; }
    if (b.dataset.v) ir(b.dataset.v);
  });
  document.addEventListener("click", (ev) => {
    if (!ev.target.closest(".menu-g")) document.querySelectorAll(".menu-g.abierto").forEach((g) => g.classList.remove("abierto"));
    const cerrar = ev.target.closest("[data-cerrar]");
    if (cerrar) cerrar.closest("dialog").close();
  });
  document.querySelectorAll("dialog").forEach((d) => d.addEventListener("click", (ev) => { if (ev.target === d) d.close(); }));
  addEventListener("hashchange", mostrarVista);

  // ── Datos: exámenes desde el Apps Script (con copia en el dispositivo) ────
  function leerCache() {
    try { const c = JSON.parse(localStorage.getItem(CACHE_KEY) || "null"); return c && Array.isArray(c.examenes) ? c : null; } catch { return null; }
  }
  function guardarCache() {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), examenes })); } catch {}
  }
  function avisoSinConexion() {
    const c = leerCache();
    $("offline").textContent = c
      ? `Sin conexión: se muestran los últimos exámenes guardados en este dispositivo (${new Date(c.ts).toLocaleString("es", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}).`
      : "Sin conexión: no se pueden cargar los exámenes todavía.";
    $("offline").hidden = false;
  }

  async function cargarExamenes(avisar = false) {
    try {
      const res = await fetch(CFG.apiUrl, { cache: "no-store" });
      const datos = await res.json();
      const lista = Array.isArray(datos) ? datos : (datos.data || datos.exams || []);
      examenes = lista.map((e) => ({
        id: String(e.id), subject: e.subject || "", teacher: e.teacher || "", className: e.className || "",
        itinerary: e.itinerary || "", date: normFecha(e.date), content: e.content || "",
      }));
      cargados = true;
      guardarCache();
      $("offline").hidden = true;
      if (avisar) toast("Exámenes actualizados.");
    } catch (e) {
      cargados = true;
      if (leerCache()) avisoSinConexion(); else toast("No se pudo conectar con el servidor. Comprueba la conexión.", "error");
    }
    pintarCalendario();
  }

  // Envía un cambio al Apps Script con el token de la sesión de Microsoft 365.
  // «text/plain» evita la petición previa de CORS que Apps Script no admite.
  async function enviar(cuerpo) {
    const token = await tokenActual();
    if (!token) throw new Error("La sesión ha caducado. Vuelve a iniciar sesión.");
    const res = await fetch(CFG.apiUrl, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ ...cuerpo, token }) });
    const r = await res.json();
    if (r.status !== "success") throw new Error(r.message || "El servidor rechazó el cambio.");
    return r;
  }

  // ── Filtros ───────────────────────────────────────────────────────────────
  function chips(cont, opciones, actual, verde, alElegir) {
    cont.innerHTML = opciones.map(([v, t]) => `<button type="button" class="chip-btn${verde ? " verde" : ""}${v === actual ? " activa" : ""}" data-val="${esc(v)}">${esc(t)}</button>`).join("");
    cont.onclick = (ev) => { const b = ev.target.closest("[data-val]"); if (b) alElegir(b.dataset.val); };
  }
  const opcClases = () => [["ALL", "Todas las clases"], ...CLASES.map((c) => [c, c])];
  const opcItin = (clase) => [["ALL", "Todos los itinerarios"], ...(CLASS_ITINERARIES[clase] || []).map((i) => [i, i])];

  function pintarFiltros() {
    chips($("filtro-clase"), opcClases(), filtroClase, false, (v) => { filtroClase = v; filtroItin = "ALL"; guardarFiltros(); pintarFiltros(); pintarCalendario(); });
    const hayItin = filtroClase !== "ALL";
    $("filtro-itin-caja").hidden = !hayItin;
    if (hayItin) chips($("filtro-itin"), opcItin(filtroClase), filtroItin, true, (v) => { filtroItin = v; guardarFiltros(); pintarFiltros(); pintarCalendario(); });
  }
  function guardarFiltros() { try { localStorage.setItem(FILTROS_KEY, JSON.stringify({ c: filtroClase, i: filtroItin })); } catch {} }
  function leerFiltros() {
    try {
      const f = JSON.parse(localStorage.getItem(FILTROS_KEY) || "null");
      if (f && (f.c === "ALL" || CLASES.includes(f.c))) { filtroClase = f.c; filtroItin = (CLASS_ITINERARIES[f.c] || []).includes(f.i) ? f.i : "ALL"; }
    } catch {}
  }
  const etiquetaFiltro = (c, i) => (c === "ALL" ? "Todas las clases" : c) + (i !== "ALL" ? ` — ${i}` : "");

  function examenesDelDia(iso, c = filtroClase, i = filtroItin) {
    return examenes.filter((e) => e.date === iso && (c === "ALL" || e.className === c) && (i === "ALL" || e.itinerary === i))
      .sort((a, b) => a.className.localeCompare(b.className) || a.subject.localeCompare(b.subject, "es"));
  }

  // ── Calendario (rejilla en escritorio, agenda en móvil) ───────────────────
  function tarjeta(e, larga) {
    const meta = `${e.className}${e.itinerary ? " · " + e.itinerary : ""}`;
    return `<button type="button" class="ex" style="--h:${tono(e.teacher)}" data-id="${esc(e.id)}" title="${esc(e.subject + " — " + meta)}">
      <b>${esc(e.subject)}</b><small>${esc(meta)}</small><small>${esc(e.teacher)}</small>
      ${larga && e.content ? `<small class="cont">${esc(e.content)}</small>` : ""}</button>`;
  }

  function pintarCalendario() {
    const y = mes.getFullYear(), m = mes.getMonth();
    $("mes").textContent = mes.toLocaleString("es", { month: "long", year: "numeric" }).replace(" de ", " ");
    const hoyS = hoyIso();
    let hueco = new Date(y, m, 1).getDay() - 1; if (hueco < 0) hueco = 6;
    const dias = new Date(y, m + 1, 0).getDate();
    let html = "";
    for (let i = 0; i < hueco; i++) html += `<div class="dia fuera"></div>`;
    for (let d = 1; d <= dias; d++) {
      const iso = isoDia(y, m, d), sem = (hueco + d - 1) % 7;
      const cls = ["dia", sem >= 5 ? "finde" : "", iso === hoyS ? "hoy" : "", yo ? "puede" : ""].filter(Boolean).join(" ");
      html += `<div class="${cls}" data-dia="${iso}"><div class="dia-num"><span>${d}</span></div>${examenesDelDia(iso).map((e) => tarjeta(e)).join("")}</div>`;
    }
    const resto = (hueco + dias) % 7;
    if (resto) for (let i = resto; i < 7; i++) html += `<div class="dia fuera"></div>`;
    $("celdas").innerHTML = html;

    const diasSem = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
    let ag = "";
    for (let d = 1; d <= dias; d++) {
      const iso = isoDia(y, m, d), lista = examenesDelDia(iso);
      if (!lista.length) continue;
      ag += `<div class="agenda-dia${iso === hoyS ? " hoy" : ""}"><div class="agenda-fecha"><small>${diasSem[new Date(y, m, d).getDay()]}</small><b>${d}</b></div>
        <div class="agenda-lista">${lista.map((e) => tarjeta(e, true)).join("")}</div></div>`;
    }
    $("agenda").innerHTML = ag || `<p class="vacio">${cargados ? "No hay exámenes este mes" + (filtroClase === "ALL" ? "." : " con el filtro elegido.") : "Cargando exámenes…"}</p>`;
  }

  function alPulsarCalendario(ev) {
    const t = ev.target.closest(".ex");
    if (t) { abrirDetalle(t.dataset.id); return; }
    const dia = ev.target.closest(".dia[data-dia]");
    if (dia && yo) abrirFormulario(null, dia.dataset.dia);
  }
  $("celdas").addEventListener("click", alPulsarCalendario);
  $("agenda").addEventListener("click", alPulsarCalendario);
  $("mesAnt").onclick = () => { mes.setMonth(mes.getMonth() - 1); pintarCalendario(); };
  $("mesSig").onclick = () => { mes.setMonth(mes.getMonth() + 1); pintarCalendario(); };
  $("btnHoy").onclick = () => { mes = new Date(hoy.getFullYear(), hoy.getMonth(), 1); pintarCalendario(); };
  $("btnActualizar").onclick = () => cargarExamenes(true);

  // ── Detalle de un examen ──────────────────────────────────────────────────
  let detalleId = null;
  function abrirDetalle(id) {
    const e = examenes.find((x) => x.id === id);
    if (!e) return;
    detalleId = id;
    const fecha = new Date(e.date + "T12:00:00").toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    $("det-titulo").textContent = e.subject;
    $("det-cuerpo").innerHTML = `<div class="franja-ex" style="--h:${tono(e.teacher)}"></div>
      <dt>Fecha</dt><dd>${esc(fecha.charAt(0).toUpperCase() + fecha.slice(1))}</dd>
      <dt>Clase</dt><dd>${esc(e.className)}${e.itinerary ? " · " + esc(e.itinerary) : ""}</dd>
      <dt>Profesor/a</dt><dd>${esc(e.teacher)}</dd>
      <dt>Contenido</dt><dd>${esc(e.content || "Sin especificar")}</dd>`;
    $("det-editar").hidden = $("det-borrar").hidden = !yo;
    $("dlg-detalle").showModal();
  }
  $("det-editar").onclick = () => { $("dlg-detalle").close(); abrirFormulario(detalleId); };
  $("det-borrar").onclick = () => { $("dlg-detalle").close(); eliminar(detalleId); };

  // ── Formulario: nuevo examen / editar (solo con sesión) ───────────────────
  function rellenar(sel, opciones, vacio, valor) {
    sel.innerHTML = `<option value="">${esc(vacio)}</option>` + opciones.map((o) => `<option${o === valor ? " selected" : ""}>${esc(o)}</option>`).join("");
    sel.disabled = !opciones.length;
    if (opciones.length === 1) sel.value = opciones[0];
  }
  function alCambiarProfe(asig = "", clase = "", itin = "") {
    const p = TEACHER_DATA[$("ex-profe").value];
    rellenar($("ex-asig"), p ? Object.keys(p.subjects) : [], p ? "Elige asignatura…" : "Primero elige profesor/a…", asig);
    alCambiarAsig(clase, itin);
  }
  function alCambiarAsig(clase = "", itin = "") {
    const s = TEACHER_DATA[$("ex-profe").value]?.subjects[$("ex-asig").value];
    rellenar($("ex-clase"), s ? Object.keys(s) : [], s ? "Elige clase…" : "Elige asignatura…", clase);
    alCambiarClase(itin);
  }
  function alCambiarClase(itin = "") {
    const l = TEACHER_DATA[$("ex-profe").value]?.subjects[$("ex-asig").value]?.[$("ex-clase").value];
    rellenar($("ex-itin"), l || [], l ? "Elige itinerario…" : "Elige clase…", itin);
  }
  $("ex-profe").onchange = () => alCambiarProfe();
  $("ex-asig").onchange = () => alCambiarAsig();
  $("ex-clase").onchange = () => alCambiarClase();

  // Busca a quien ha iniciado sesión en la lista del profesorado (por nombre y apellidos)
  function docenteDeLaSesion() {
    if (!yo) return "";
    const mios = new Set(sinTildes(yo.nombre + " " + yo.email.split("@")[0].replace(/[._]/g, " ")).split(/\s+/));
    let mejor = "", puntos = 1;
    for (const d of DOCENTES) {
      const p = sinTildes(d).split(/\s+/).filter((w) => w.length > 2 && mios.has(w)).length;
      if (p > puntos) { mejor = d; puntos = p; }
    }
    return mejor;
  }

  function abrirFormulario(id, fecha = "") {
    if (!yo) { ir("acceso"); return; }
    const e = id ? examenes.find((x) => x.id === id) : null;
    $("ex-titulo").textContent = e ? "Editar examen" : "Nuevo examen";
    $("ex-id").value = e ? e.id : "";
    $("ex-profe").innerHTML = `<option value="">Elige profesor/a…</option>` + DOCENTES.map((d) => `<option>${esc(d)}</option>`).join("");
    $("ex-profe").value = e ? e.teacher : docenteDeLaSesion();
    alCambiarProfe(e?.subject, e?.className, e?.itinerary);
    $("ex-fecha").value = e ? e.date : fecha;
    $("ex-cont").value = e ? e.content : "";
    $("ex-quien").textContent = `Se guardará a nombre de tu cuenta (${yo.email}) y se añadirá al calendario de la clase.`;
    $("dlg-examen").showModal();
  }
  $("btnNuevo").onclick = () => abrirFormulario(null);

  $("form-examen").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    if (!navigator.onLine) { toast("Sin conexión: conéctate a internet para guardar el examen.", "error"); return; }
    const editar = Boolean($("ex-id").value);
    const ex = {
      id: $("ex-id").value || Date.now().toString(),
      teacher: $("ex-profe").value, subject: $("ex-asig").value, className: $("ex-clase").value,
      itinerary: $("ex-itin").value, date: normFecha($("ex-fecha").value), content: $("ex-cont").value.trim(),
    };
    const btn = $("ex-guardar");
    btn.disabled = true; btn.textContent = "Guardando…";
    const antes = examenes.slice();
    examenes = editar ? examenes.map((x) => (x.id === ex.id ? ex : x)) : [...examenes, ex];
    const [y, m] = ex.date.split("-").map(Number);
    mes = new Date(y, m - 1, 1);
    pintarCalendario();
    $("dlg-examen").close();
    try {
      await enviar({ action: editar ? "update" : "create", exam: ex });
      toast(editar ? "Examen actualizado." : "Examen añadido al calendario.");
      guardarCache();
    } catch (e) {
      examenes = antes; pintarCalendario();
      toast("No se pudo guardar: " + e.message, "error", 7000);
      if (/sesi[oó]n/i.test(e.message)) await comprobarSesion().catch(() => {});
    } finally {
      btn.disabled = false; btn.textContent = "Guardar";
    }
  });

  async function eliminar(id) {
    const e = examenes.find((x) => x.id === id);
    if (!e || !confirm(`¿Eliminar el examen de ${e.subject} (${e.className}) del ${e.date.split("-").reverse().join("/")}?`)) return;
    if (!navigator.onLine) { toast("Sin conexión: conéctate a internet para eliminar el examen.", "error"); return; }
    const antes = examenes.slice();
    examenes = examenes.filter((x) => x.id !== id);
    pintarCalendario();
    try {
      await enviar({ action: "delete", id });
      toast("Examen eliminado.");
      guardarCache();
    } catch (err) {
      examenes = antes; pintarCalendario();
      toast("No se pudo eliminar: " + err.message, "error", 7000);
    }
  }

  // ── Suscripción a los calendarios de Google de cada clase ─────────────────
  function pintarSuscripcion() {
    $("subs").innerHTML = CLASES.map((c) => {
      const id = CALENDAR_IDS[c];
      if (!id) return "";
      const google = `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(id)}`;
      const ical = `webcal://calendar.google.com/calendar/ical/${encodeURIComponent(id)}/public/basic.ics`;
      return `<div class="sub-clase"><b><i style="--c:${COLOR_CLASE[c] || "#009abb"}"></i>${esc(c.replace("Bach", "Bachillerato"))}</b>
        <div class="acciones"><a class="btn" href="${google}" target="_blank" rel="noopener noreferrer" title="Añadir a Google Calendar">Google</a>
        <a class="btn" href="${ical}" title="Suscribirse desde iPhone, iPad, Mac u Outlook">iPhone / Outlook</a></div></div>`;
    }).join("");
  }

  // ── Impresión: A4 apaisado con logo, mes y filtro ─────────────────────────
  function pintarFiltrosImp() {
    chips($("imp-clase"), opcClases(), impClase, false, (v) => { impClase = v; impItin = "ALL"; pintarFiltrosImp(); });
    $("imp-itin-caja").hidden = impClase === "ALL";
    if (impClase !== "ALL") chips($("imp-itin"), opcItin(impClase), impItin, true, (v) => { impItin = v; pintarFiltrosImp(); });
  }
  $("btnImprimir").onclick = () => { impClase = filtroClase; impItin = filtroItin; pintarFiltrosImp(); $("dlg-imprimir").showModal(); };
  $("imp-ok").onclick = async () => {
    $("dlg-imprimir").close();
    const y = mes.getFullYear(), m = mes.getMonth();
    let hueco = new Date(y, m, 1).getDay() - 1; if (hueco < 0) hueco = 6;
    const dias = new Date(y, m + 1, 0).getDate();
    const celdas = [...Array(hueco).fill(null), ...Array.from({ length: dias }, (_, i) => i + 1)];
    while (celdas.length % 7) celdas.push(null);
    const semanas = [];
    for (let i = 0; i < celdas.length; i += 7) semanas.push(celdas.slice(i, i + 7));
    const max = semanas.length <= 4 ? 5 : semanas.length === 5 ? 4 : 3;
    const dia = (d, col) => {
      if (!d) return `<div class="print-day"></div>`;
      const lista = examenesDelDia(isoDia(y, m, d), impClase, impItin);
      const extra = lista.length - max;
      return `<div class="print-day${col >= 5 ? " finde" : ""}"><div class="print-num">${d}</div>${lista.slice(0, max).map((e) =>
        `<div class="ex" style="--h:${tono(e.teacher)}"><b>${esc(e.subject)}</b><small>${esc(e.className)}${e.itinerary ? " (" + esc(e.itinerary) + ")" : ""} · ${esc(e.teacher)}</small></div>`).join("")}
        ${extra > 0 ? `<div class="print-more">+${extra} más</div>` : ""}</div>`;
    };
    $("print-view").innerHTML = `<div class="print-page">
      <div class="print-header"><img src="logo.svg" alt="Salesianas Nervión">
        <div><div class="print-header-school">Bachillerato — Escuelas Salesianas María Auxiliadora</div>
        <div class="print-header-title">Calendario de exámenes — ${esc(mes.toLocaleString("es", { month: "long", year: "numeric" }).replace(" de ", " "))}</div></div>
        <div class="print-header-filter">${esc(etiquetaFiltro(impClase, impItin))}</div></div>
      <div class="print-weekdays">${["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => `<div>${d}</div>`).join("")}</div>
      <div class="print-weeks">${semanas.map((s) => `<div class="print-week">${s.map(dia).join("")}</div>`).join("")}</div></div>`;
    await Promise.all([...document.querySelectorAll("#print-view img")].map((i) => i.decode().catch(() => {})));
    print();
  };

  // ── Inicio de sesión del profesorado (Microsoft 365 por el Supabase común) ─
  // La librería de Supabase solo se descarga al pulsar «Acceso profesorado» o si ya hay una sesión guardada.
  function cargarLibreria() {
    if (window.supabase) return Promise.resolve();
    return new Promise((ok, mal) => {
      const s = document.createElement("script");
      s.src = SUPABASE_JS; s.onload = ok;
      s.onerror = () => mal(new Error("No se pudo cargar el inicio de sesión. Comprueba la conexión."));
      document.head.appendChild(s);
    });
  }
  async function cliente() {
    if (!sb) { await cargarLibreria(); sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey); }
    return sb;
  }
  const haySesionGuardada = () => { try { return Object.keys(localStorage).some((k) => /^sb-.*-auth-token$/.test(k)); } catch { return false; } };
  const vieneDelLogin = () => /access_token=|[?&]code=|error_description=/.test(location.hash + location.search);

  async function tokenActual() {
    const c = await cliente();
    const { data: { session } } = await c.auth.getSession();
    return session?.access_token || "";
  }

  async function comprobarSesion() {
    const c = await cliente();
    let { data: { session } } = await c.auth.getSession();
    // Abierta desde la app de Teams: entra sola con la cuenta de Teams
    if (!session && await window.TeamsSSO?.entrar(c)) ({ data: { session } } = await c.auth.getSession());
    if (!session) { yo = null; pintarSesion(); return null; }
    const u = session.user, email = (u.email || "").toLowerCase();
    if (!DOMINIOS.some((d) => email.endsWith("@" + d))) {
      await c.auth.signOut();
      yo = null; pintarSesion();
      throw new Error(`Solo puede entrar el profesorado con cuentas @${CFG.dominio}.`);
    }
    yo = { email, nombre: u.user_metadata?.full_name || u.user_metadata?.name || email.split("@")[0] };
    pintarSesion();
    return yo;
  }

  async function entrar() {
    $("loginError").textContent = "";
    try {
      const c = await cliente();
      if (await window.TeamsSSO?.entrar(c)) { await comprobarSesion(); location.hash = "#calendario"; return; }
      try { sessionStorage.setItem(VOLVER_KEY, "1"); } catch {}
      const { error } = await c.auth.signInWithOAuth({ provider: "azure", options: { scopes: "email profile", redirectTo: location.origin + location.pathname } });
      if (error) throw error;
    } catch (e) { $("loginError").textContent = e.message || String(e); }
  }
  async function salir() {
    if (sb) await sb.auth.signOut();
    yo = null; pintarSesion();
    toast("Has cerrado la sesión.");
  }
  $("salir").onclick = salir;

  function pintarSesion() {
    $("sesion").hidden = !yo;
    $("usuario").textContent = yo ? yo.nombre : "";
    $("btnAcceso").hidden = !!yo;
    $("btnAcceso2").hidden = !!yo;
    $("btnNuevo").hidden = !yo;
    pintarCalendario();
    if (vistaActual() === "acceso") pintarAcceso();
  }

  function pintarAcceso() {
    const t = $("tarjeta-acceso");
    if (yo) {
      t.innerHTML = `<h2>Sesión iniciada</h2><p>Has entrado como <strong>${esc(yo.nombre)}</strong> (${esc(yo.email)}). Ya puedes añadir, editar o eliminar exámenes desde el calendario.</p>
        <a href="#calendario" class="btn verde grande">Ir al calendario</a><p class="error"></p>`;
      return;
    }
    t.innerHTML = `<h2>Acceso del profesorado</h2>
      <p>Para añadir o modificar exámenes, entra con tu cuenta del colegio <strong>@${esc(CFG.dominio)}</strong>. El alumnado no necesita iniciar sesión.</p>
      <button id="btnLogin" class="btn grande btn-ms" type="button">${ICONO_MS}Entrar con Microsoft 365</button>
      <p id="loginError" class="error"></p>
      <a href="#calendario" class="volver"><svg class="i" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>Volver al calendario</a>`;
    $("btnLogin").onclick = entrar;
  }

  // ── Instalar como app (PWA) ───────────────────────────────────────────────
  (function instalar() {
    const b = $("instalar");
    if (matchMedia("(display-mode: standalone)").matches || navigator.standalone) return;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    let aviso = null;
    if (ios) b.hidden = false;
    addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); aviso = e; b.hidden = false; });
    addEventListener("appinstalled", () => { b.hidden = true; });
    b.onclick = async () => {
      if (aviso) { aviso.prompt(); try { await aviso.userChoice; } catch {} aviso = null; b.hidden = true; }
      else $("dlg-instalar").showModal();
    };
  })();

  // ── Arranque ──────────────────────────────────────────────────────────────
  leerFiltros();
  pintarFiltros();
  pintarSuscripcion();
  const c = leerCache();
  if (c) { examenes = c.examenes; cargados = true; }
  pintarCalendario();
  mostrarVista();
  cargarExamenes();
  addEventListener("offline", avisoSinConexion);
  addEventListener("online", () => cargarExamenes());
  if (!navigator.onLine) avisoSinConexion();

  if (haySesionGuardada() || vieneDelLogin() || window.TeamsSSO?.enTeams) {
    comprobarSesion()
      .catch((e) => toast(e.message || String(e), "error", 7000))
      .finally(() => {
        let volver = false;
        try { volver = sessionStorage.getItem(VOLVER_KEY) === "1"; sessionStorage.removeItem(VOLVER_KEY); } catch {}
        if (volver || vieneDelLogin()) {
          history.replaceState(null, "", location.pathname + (yo ? "#calendario" : "#acceso"));
          mostrarVista();
          if (yo) toast(`Hola, ${yo.nombre.split(" ")[0]}. Ya puedes añadir exámenes.`);
        }
      });
  }

  if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
})();
