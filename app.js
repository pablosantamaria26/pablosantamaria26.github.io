/****************************************************
 * APP.JS — STOCK SUPERVISOR (FINAL)
 ****************************************************/

// ⚠️ ESTA DEBE SER LA ÚNICA VEZ QUE SE DECLARA ESTA VARIABLE
const WORKER_URL = "https://jolly-dust-2d7a.santamariapablodaniel.workers.dev/"; 

let usuarioActual = localStorage.getItem("usuarioStock");

// INICIO
window.addEventListener('DOMContentLoaded', () => {
    verificarSesion();
    initOneSignal();
    // Si ya está logueado, cargamos las tareas. Si no, esperamos al login.
    if (usuarioActual) cargarStockInteligente();
});

// 1. GESTIÓN DE SESIÓN
function verificarSesion() {
    if (usuarioActual) {
        const viewLogin = document.getElementById("view-login");
        const viewApp = document.getElementById("view-app");
        const badge = document.getElementById("user-badge");

        if(viewLogin) viewLogin.classList.add("hidden");
        if(viewApp) viewApp.classList.remove("hidden");
        
        if(badge) {
            badge.textContent = usuarioActual;
            badge.classList.remove("hidden");
        }
    }
}

// ESTA ES LA FUNCIÓN QUE NO ENCONTRABA ANTES
function login() {
    const input = document.getElementById("input-name");
    const nombre = input.value.trim();

    if (nombre.length < 2) {
        mostrarToast("Por favor ingresa un nombre válido", "error");
        return;
    }

    usuarioActual = nombre;
    localStorage.setItem("usuarioStock", nombre);
    verificarSesion();
    cargarStockInteligente(); // Cargamos la lista al entrar
    mostrarToast(`Hola, ${nombre} 👋`, "success");
}

// 2. CARGAR LISTA INTELIGENTE (DESDE WORKER -> GAS -> DRIVE)
async function cargarStockInteligente() {
    const container = document.querySelector('.task-list');
    if(!container) return;

    container.innerHTML = '<div style="text-align:center; padding:20px; color:#888"><i class="material-icons spin">sync</i><p>Analizando prioridades...</p></div>';

    try {
        const res = await fetch(WORKER_URL); 
        const data = await res.json();
        
        if(data.status === "success" && data.tasks) {
            renderizarTareas(data.tasks);
        } else {
            throw new Error("Formato incorrecto");
        }
    } catch (e) {
        console.error(e);
        container.innerHTML = '<div style="text-align:center; padding:20px; color:#ff4444"><i class="material-icons">wifi_off</i><p>Error de conexión</p><button class="btn" onclick="cargarStockInteligente()" style="margin-top:10px; width:auto">REINTENTAR</button></div>';
    }
}

function renderizarTareas(lista) {
    const container = document.querySelector('.task-list');
    container.innerHTML = "";

    if (lista.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; margin-top:30px; opacity:0.7;">
                <i class="material-icons" style="font-size:48px; color:#00C851;">verified</i>
                <p>¡Todo al día! Descansa.</p>
            </div>
        `;
        return;
    }

    lista.forEach(item => {
        // Estilos según urgencia
        let borde = "#FFD600"; // Amarillo (Pendiente normal)
        let icono = "schedule";
        let textoColor = "#CCC"; // Gris claro
        
        // Lógica visual
        if (item.urgencia >= 1.5) { // CRÍTICO
            borde = "#FF4444"; 
            icono = "warning";
            textoColor = "#FF8888";
        } else if (item.mensaje.includes("Adelantar")) { // ADELANTAR
            borde = "#00C851"; 
            icono = "event_available";
            textoColor = "#88FF88";
        }

        const card = document.createElement('div');
        card.className = 'task-card'; 
        card.style.borderLeft = `5px solid ${borde}`;
        card.style.marginBottom = "15px";
        card.id = `card-${cleanId(item.proveedor)}`;

        card.innerHTML = `
            <div class="task-info">
                <h3 style="margin:0; font-size:1.1rem; color:#FFF">${item.proveedor}</h3>
                <p style="margin:5px 0; font-size:0.85rem; color:${textoColor}; display:flex; align-items:center; gap:5px;">
                    <i class="material-icons" style="font-size:14px">${icono}</i> 
                    ${item.mensaje} 
                    <span style="opacity:0.6; margin-left:5px;">(hace ${item.diasAtraso} días)</span>
                </p>
            </div>
            <button class="btn-icon" onclick="enviarReporte('${item.proveedor}', this)">
                <i class="material-icons">check</i>
            </button>
        `;
        
        container.appendChild(card);
    });
}

// 3. ENVÍO DE REPORTE AL WORKER
async function enviarReporte(proveedor, btnElement) {
    if (!usuarioActual) return location.reload();

    const originalIcon = btnElement.innerHTML;
    btnElement.innerHTML = '<i class="material-icons spin">sync</i>';
    btnElement.disabled = true;

    const datos = {
        action: "stockDone",
        proveedor: proveedor,
        encargado: usuarioActual,
        fechaRealizacion: new Date().toLocaleString()
    };

    try {
        const respuesta = await fetch(WORKER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datos)
        });

        const resultado = await respuesta.json();

        if (resultado.status === "success") {
            btnElement.innerHTML = '<i class="material-icons">done_all</i>';
            btnElement.classList.add("checked");
            
            const card = document.getElementById(`card-${cleanId(proveedor)}`);
            if(card) card.style.opacity = "0.4";
            
            mostrarToast(`${proveedor} registrado correctamente`, "success");
        } else {
            throw new Error(resultado.message || "Error desconocido");
        }

    } catch (error) {
        console.error(error);
        mostrarToast("Error de conexión", "error");
        btnElement.innerHTML = originalIcon;
        btnElement.disabled = false;
    }
}

// 4. UTILIDADES
function cleanId(str) {
    return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function mostrarToast(mensaje, tipo) {
    const toast = document.getElementById("toast");
    const texto = document.getElementById("toast-msg");
    const icono = toast.querySelector("i");

    if(texto) texto.textContent = mensaje;
    if(icono) icono.textContent = tipo === "success" ? "check_circle" : "error_outline";
    
    if(toast) {
        toast.className = ""; 
        toast.classList.add(tipo);
        toast.classList.add("show");
        setTimeout(() => toast.classList.remove("show"), 3500);
    }
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
