/****************************************************
 * APP.JS — STOCK SUPERVISOR (PWA + OneSignal)
 * Versión Final 2025 — Ultra Optimizada
 ****************************************************/

// URL de Google Apps Script
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwXa7vxx1AM4nm3bVP1qhO3IbDncAQPjG4XeZdQJcONQ6ljC_OeBigGH9L_i61irhIXBw/exec";

// Variables locales
let ENCARGADO_NAME = localStorage.getItem("encargadoName") || null;

/****************************************************
 *     INICIO DE LA APP
 ****************************************************/
window.onload = () => {
    updateUI();
    initOneSignalListener();
    console.log("📦 Stock Supervisor iniciado");
};


/****************************************************
 *      ACTUALIZAR UI
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
 *     GUARDAR ENCARGADO
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
 *      MARCAR STOCK REALIZADO — VERSIÓN FINAL
 ****************************************************/
function markStockDone(proveedor) {
    if (!ENCARGADO_NAME) return showToast("Primero ingresá tu nombre", true);

    navigator.vibrate?.([80, 40, 80]);

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
    .then(r => r.json())
    .then(res => {
        console.log("Respuesta GAS:", res);

        if (res.status !== "success") {
            return showToast("Error desde servidor: " + res.message, true);
        }

        // ÉXITO TOTAL
        const card = document.querySelector(`#item-${cleanId(proveedor)}`);
        if (card) {
            card.style.opacity = "0.3";
            card.style.transform = "scale(0.97)";
        }

        showToast(`✔ ${proveedor} realizado`);

        setTimeout(() => card?.classList.add("hidden"), 900);
    })
    .catch(err => {
        console.error("Error fetch:", err);
        showToast("Error enviando datos 🚨", true);
    });
}


/****************************************************
 *      TOAST ULTRA MODERNO NEGRO/AMARILLO
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
 *      OneSignal — Recibir CLICK de Notificación
 ****************************************************/
function initOneSignalListener() {
    if (!window.OneSignal) return;

    OneSignalDeferred.push(function (OneSignal) {

        OneSignal.Notification.on("click", function (event) {
            const proveedor = event?.data?.proveedor;

            if (proveedor) {
                focusProveedor(proveedor);

                setTimeout(() => {
                    openProveedorAction(proveedor);
                }, 700);
            }
        });
    });
}


/****************************************************
 *      ENFOCAR TARJETA ANIMADA
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


/****************************************************
 *      DESTACAR BOTÓN DE ACCIÓN
 ****************************************************/
function openProveedorAction(proveedor) {
    const id = `item-${cleanId(proveedor)}`;
    const card = document.getElementById(id);
    if (!card) return;

    const btn = card.querySelector("button");
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
 *      UTILIDAD PARA ID
 ****************************************************/
function cleanId(str) {
    return str.toLowerCase().replace(/\s+/g, "-");
}
