/****************************************************
 * APP.JS — STOCK SUPERVISOR (PWA + OneSignal)
 * Versión Final 2025 — Ultra Optimizada
 ****************************************************/

// URL del Worker (anti-CORS)
const APPS_SCRIPT_URL = "https://jolly-dust-2d7a.santamariapablodaniel.workers.dev/";

// Variables locales
let ENCARGADO_NAME = localStorage.getItem("encargadoName") || null;

/****************************************************
 * INICIO
 ****************************************************/
window.onload = () => {
    updateUI();
    initOneSignalListener();
    console.log("📦 Stock Supervisor iniciado");
};


/****************************************************
 * UI
 ****************************************************/
function updateUI() {
    if (ENCARGADO_NAME) {
        document.getElementById("encargado-setup").classList.add("hidden");
        document.getElementById("main-app").classList.remove("hidden");

        document.getElementById("current-encargado").textContent = ENCARGADO_NAME;

        const notif = document.getElementById("notification-status");
        notif.textContent = "Notificaciones: ACTIVAS";
        notif.classList.add("status-success");
    } else {
        document.getElementById("encargado-setup").classList.remove("hidden");
        document.getElementById("main-app").classList.add("hidden");
    }
}


/****************************************************
 * GUARDAR ENCARGADO
 ****************************************************/
function saveEncargado() {
    const name = document.getElementById("encargado-name").value.trim();
    if (!name) return showToast("Ingresá tu nombre", true);

    ENCARGADO_NAME = name;
    localStorage.setItem("encargadoName", ENCARGADO_NAME);

    navigator.vibrate?.(80);
    showToast("Encargado guardado 👌");

    updateUI();
}


/****************************************************
 * MARCAR STOCK — 100% FUNCIONAL
 ****************************************************/
function markStockDone(proveedor) {
    if (!ENCARGADO_NAME) return showToast("Primero ingresá tu nombre", true);

    navigator.vibrate?.([60, 40, 60]);
    showToast(`Marcando ${proveedor}…`);

    fetch(APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            action: "stockDone",
            proveedor: proveedor,
            encargado: ENCARGADO_NAME,
            fechaRealizacion: new Date().toISOString()
        })
    })
    .then((r) => r.json())
    .then((res) => {
        console.log("Respuesta GAS:", res);

        if (res.status !== "success") {
            return showToast("Error desde servidor: " + res.message, true);
        }

        // Animación + ocultar tarjeta
        const card = document.querySelector(`#item-${cleanId(proveedor)}`);
        if (card) {
            card.style.opacity = "0.3";
            card.style.transform = "scale(0.95)";
        }

        showToast(`✔ ${proveedor} realizado`);

        setTimeout(() => card?.classList.add("hidden"), 900);
    })
    .catch((err) => {
        console.error("Error fetch:", err);
        showToast("Error enviando datos 🚨", true);
    });
}


/****************************************************
 * TOAST ESTILO NEGRO/AMARILLO
 ****************************************************/
function showToast(text, error = false) {
    const toast = document.getElementById("toast");
    toast.textContent = text;

    toast.style.background = error ? "#d32f2f" : "#ffcc00";
    toast.style.color = error ? "#fff" : "#000";

    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3500);
}


/****************************************************
 * OneSignal — Listener de notificaciones
 ****************************************************/
function initOneSignalListener() {
    if (!window.OneSignalDeferred) window.OneSignalDeferred = [];

    OneSignalDeferred.push(function (OneSignal) {
        if (!OneSignal || !OneSignal.Notification) return;

        OneSignal.Notification.on("click", (event) => {
            const proveedor = event?.data?.proveedor;
            if (!proveedor) return;

            focusProveedor(proveedor);
            setTimeout(() => openProveedorAction(proveedor), 700);
        });
    });
}


/****************************************************
 * ANIMACIONES UI
 ****************************************************/
function focusProveedor(proveedor) {
    const id = `item-${cleanId(proveedor)}`;
    const card = document.getElementById(id);
    if (!card) return;

    navigator.vibrate?.(100);

    card.style.boxShadow = "0 0 22px 6px #ffcc00";
    card.style.transform = "scale(1.03)";
    card.scrollIntoView({ behavior: "smooth", block: "center" });

    setTimeout(() => {
        card.style.boxShadow = "";
        card.style.transform = "";
    }, 3000);
}

function openProveedorAction(proveedor) {
    const id = `item-${cleanId(proveedor)}`;
    const btn = document.querySelector(`#${id} button`);
    if (!btn) return;

    navigator.vibrate?.(60);

    btn.style.boxShadow = "0 0 18px 6px #ffcc00";
    btn.style.transform = "scale(1.08)";
    btn.scrollIntoView({ behavior: "smooth", block: "center" });

    setTimeout(() => {
        btn.style.boxShadow = "";
        btn.style.transform = "";
    }, 2500);
}


/****************************************************
 * UTILIDAD
 ****************************************************/
function cleanId(str) {
    return str.toLowerCase().replace(/\s+/g, "-");
}
