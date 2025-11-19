/****************************************************
 * APP.JS — STOCK SUPERVISOR (PWA + OneSignal)
 * Versión Final 2025 — Ultra Optimizada
 ****************************************************/

// URL de Google Apps Script
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwXa7vxx1AM4nm3bVP1qhO3IbDncAQPjG4XeZdQJcONQ6ljC_OeBigGH9L_i61irhIXBw/exec";

// Variables locales
let ENCARGADO_NAME = localStorage.getItem("encargadoName") || null;

// ==============================
//   INICIO DE LA APP
// ==============================

window.onload = () => {
    updateUI();
    initOneSignalListener();
};

// ==============================
//   ACTUALIZAR UI
// ==============================

function updateUI() {
    if (ENCARGADO_NAME) {
        document.getElementById("encargado-setup").classList.add("hidden");
        document.getElementById("main-app").classList.remove("hidden");
        document.getElementById("current-encargado").textContent = ENCARGADO_NAME;

        document.getElementById("notification-status").textContent = "Notificaciones: ACTIVAS";
        document.getElementById("notification-status").classList.add("status-success");
    } else {
        document.getElementById("encargado-setup").classList.remove("hidden");
        document.getElementById("main-app").classList.add("hidden");
    }
}

// ==============================
//   GUARDAR ENCARGADO
// ==============================

function saveEncargado() {
    const name = document.getElementById("encargado-name").value.trim();
    if (!name) return showToast("Ingresá tu nombre", true);

    ENCARGADO_NAME = name;
    localStorage.setItem("encargadoName", ENCARGADO_NAME);

    showToast("Encargado guardado 👌");
    updateUI();
}

// ==============================
//   MARCAR STOCK REALIZADO
// ==============================

function markStockDone(proveedor) {
    if (!ENCARGADO_NAME) return showToast("Primero ingresá tu nombre", true);

    showToast(`Marcando ${proveedor}…`);

    fetch(APPS_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify({
            action: "stockDone",
            proveedor,
            encargado: ENCARGADO_NAME,
            fechaRealizacion: new Date().toISOString()
        })
    })
        .then(() => {
            showToast(`✔ ${proveedor} marcado como realizado`);
            document.querySelector(`#item-${cleanId(proveedor)}`).classList.add("hidden");
        })
        .catch(() => {
            showToast("Error enviando datos", true);
        });
}

// ==============================
//   TOAST BONITO
// ==============================

function showToast(text, error = false) {
    const toast = document.getElementById("toast");
    toast.textContent = text;
    toast.style.background = error ? "#d32f2f" : "#078a3b";

    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3500);
}

// ==============================
//   OneSignal — Recibir Click
// ==============================

function initOneSignalListener() {
    if (!window.OneSignal) return;

    OneSignalDeferred.push(function (OneSignal) {

        // Esperamos eventos
        OneSignal.Notification.on("click", function (event) {
            const proveedor = event?.data?.proveedor;

            if (proveedor) {
                focusProveedor(proveedor);

                setTimeout(() => {
                    openProveedorAction(proveedor);
                }, 800);
            }
        });
    });
}

// ==============================
//   ENFOCAR TARJETA
// ==============================

function focusProveedor(proveedor) {
    const id = `item-${cleanId(proveedor)}`;
    const card = document.getElementById(id);
    if (!card) return;

    card.style.boxShadow = "0 0 15px 4px #0faa4b";
    card.style.transform = "scale(1.02)";
    card.scrollIntoView({ behavior: "smooth", block: "center" });

    setTimeout(() => {
        card.style.boxShadow = "";
        card.style.transform = "";
    }, 3000);
}

// ==============================
//   DESTACAR BOTÓN
// ==============================

function openProveedorAction(proveedor) {
    const id = `item-${cleanId(proveedor)}`;
    const card = document.getElementById(id);
    if (!card) return;

    const btn = card.querySelector("button");

    btn.style.boxShadow = "0 0 12px 4px #ffb300";
    btn.style.transform = "scale(1.06)";

    btn.scrollIntoView({ behavior: "smooth", block: "center" });

    setTimeout(() => {
        btn.style.boxShadow = "";
        btn.style.transform = "";
    }, 3000);
}

// Utilidad
function cleanId(str) {
    return str.toLowerCase().replace(/\s+/g, "-");
}
