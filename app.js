/****************************************************
 * APP.JS — STOCK SUPERVISOR (VERSIÓN LIMPIA)
 ****************************************************/

// ⚠️ ESTA VARIABLE DEBE APARECER SOLO UNA VEZ EN TODO EL ARCHIVO
const WORKER_URL = "https://jolly-dust-2d7a.santamariapablodaniel.workers.dev/"; 

let usuarioActual = localStorage.getItem("usuarioStock");

// INICIO
window.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 Iniciando Stock App...");
    verificarSesion();
    initOneSignal();
    // Si hay usuario guardado, intentamos cargar la lista
    if (usuarioActual) {
        console.log("Usuario detectado:", usuarioActual);
        cargarStockInteligente();
    }
});

// 1. GESTIÓN DE SESIÓN
function verificarSesion() {
    if (usuarioActual) {
        // Ocultamos login, mostramos app
        const loginView = document.getElementById("view-login");
        const appView = document.getElementById("view-app"); // Ajustado al HTML nuevo
        
        // Soporte para ambas versiones de HTML (por si acaso)
        if (loginView) loginView.classList.add("hidden");
        if (appView) appView.classList.remove("hidden");
        
        // Mostramos badge
        const badge = document.getElementById("user-badge");
        if (badge) {
            badge.textContent = usuarioActual;
            badge.classList.remove("hidden");
        }
    }
}

// FUNCIÓN LOGIN (La que daba error "not defined")
function login() {
    const input = document.getElementById("input-name");
    if (!input) return console.error("No encuentro el input-name");
    
    const nombre = input.value.trim();

    if (nombre.length < 2) {
        mostrarToast("Ingresa un nombre válido", "error");
        return;
    }

    usuarioActual = nombre;
    localStorage.setItem("usuarioStock", nombre);
    
    mostrarToast(`¡Hola, ${nombre}!`, "success");
    verificarSesion();
    cargarStockInteligente();
}

// 2. CARGAR LISTA INTELIGENTE
async function cargarStockInteligente() {
    const container = document.querySelector('.task-list');
    if(!container) return;

    container.innerHTML = '<div style="text-align:center; padding:20px; color:#888"><i class="material-icons spin">sync</i><p>Consultando al Supervisor...</p></div>';

    try {
        // Petición GET al Worker
        const res = await fetch(WORKER_URL); 
        const data = await res.json();
        
        if(data.status === "success" && data.tasks) {
            renderizarTareas(data.tasks);
        } else {
            container.innerHTML = '<p style="text-align:center">No se pudo leer la lista.</p>';
        }
    } catch (e) {
        console.error("Error carga:", e);
        container.innerHTML = '<div style="text-align:center; padding:20px; color:#ff4444"><p>Error de conexión</p></div>';
    }
}

function renderizarTareas(lista) {
    const container = document.querySelector('.task-list');
    container.innerHTML = "";

    if (lista.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; margin-top:30px; opacity:0.7;">
                <i class="material-icons" style="font-size:48px; color:#00C851;">check_circle</i>
                <p>¡Todo el stock está al día!</p>
            </div>
        `;
        return;
    }

    lista.forEach(item => {
        // Estilos dinámicos
        let borde = "#FFD600"; // Amarillo
        let icono = "schedule";
        let colorTexto = "#ccc";
        
        if (item.urgencia >= 1.5) { // Crítico
            borde = "#FF4444"; 
            icono = "priority_high";
            colorTexto = "#ff8888";
        } else if (item.mensaje && item.mensaje.includes("Adelantar")) { // Adelantar
            borde = "#00C851"; 
            icono = "speed";
            colorTexto = "#88ff88";
        }

        const div = document.createElement('div');
        div.className = 'task-card';
        div.style.borderLeft = `5px solid ${borde}`;
        div.style.marginBottom = "15px";
        div.id = `card-${cleanId(item.proveedor)}`;

        div.innerHTML = `
            <div class="task-info">
                <h3 style="margin:0; font-size:1.1rem; color:white;">${item.proveedor}</h3>
                <p style="margin:5px 0; font-size:0.85rem; color:${colorTexto}; display:flex; align-items:center; gap:5px;">
                    <i class="material-icons" style="font-size:14px">${icono}</i> 
                    ${item.mensaje || "Pendiente"} 
                    <span style="opacity:0.5; font-size:0.75em">(${item.diasAtraso}d)</span>
                </p>
            </div>
            <button class="btn-icon" onclick="enviarReporte('${item.proveedor}', this)">
                <i class="material-icons">check</i>
            </button>
        `;
        
        container.appendChild(div);
    });
}

// 3. ENVIAR REPORTE (POST)
async function enviarReporte(proveedor, btn) {
    if (!usuarioActual) return location.reload();

    // UI Loading
    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<i class="material-icons spin">sync</i>';
    btn.disabled = true;

    const payload = {
        action: "stockDone",
        proveedor: proveedor,
        encargado: usuarioActual,
        fechaRealizacion: new Date().toLocaleString()
    };

    try {
        const res = await fetch(WORKER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        
        const data = await res.json();

        if (data.status === "success") {
            btn.innerHTML = '<i class="material-icons">done</i>';
            btn.classList.add("checked");
            document.getElementById(`card-${cleanId(proveedor)}`).style.opacity = "0.3";
            mostrarToast("Registrado correctamente", "success");
        } else {
            throw new Error(data.message);
        }
    } catch (e) {
        console.error(e);
        mostrarToast("Error al enviar", "error");
        btn.innerHTML = originalHtml;
        btn.disabled = false;
    }
}

// 4. UTILIDADES
function cleanId(str) {
    return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function mostrarToast(msg, tipo) {
    const t = document.getElementById("toast");
    const tm = document.getElementById("toast-msg");
    const icon = t.querySelector("i");

    if(tm) tm.textContent = msg;
    if(icon) icon.textContent = tipo==="success" ? "check" : "warning";
    
    t.className = ""; 
    t.classList.add(tipo);
    t.classList.add("show");
    
    setTimeout(() => t.classList.remove("show"), 3000);
}

// 5. ONESIGNAL
function initOneSignal() {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    OneSignalDeferred.push(async function(OneSignal) {
        await OneSignal.init({
            appId: "b89337f7-3997-43ab-be02-bdd99346fad7",
            safari_web_id: "",
            notifyButton: { enable: true }
        });
    });
}
