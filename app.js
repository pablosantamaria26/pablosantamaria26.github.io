/****************************************************
 * APP.JS — LÓGICA FINAL (WORKER INTEGRATION)
 ****************************************************/

// ⚠️ IMPORTANTE: Pega aquí la URL de TU CLOUDFLARE WORKER
// NO la de Google. La que termina en .workers.dev
const WORKER_URL = "https://jolly-dust-2d7a.santamariapablodaniel.workers.dev/"; 

let usuarioActual = localStorage.getItem("usuarioStock");

// INICIO
window.addEventListener('DOMContentLoaded', () => {
    verificarSesion();
    initOneSignal();
});

// 1. GESTIÓN DE SESIÓN
function verificarSesion() {
    if (usuarioActual) {
        document.getElementById("view-login").classList.add("hidden");
        document.getElementById("view-app").classList.remove("hidden");
        const badge = document.getElementById("user-badge");
        badge.textContent = usuarioActual;
        badge.classList.remove("hidden");
    }
}

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
    mostrarToast(`Hola, ${nombre} 👋`, "success");
}

// 2. ENVÍO DE DATOS AL WORKER
async function enviarReporte(proveedor, btnElement) {
    if (!usuarioActual) return location.reload();

    // UI: Estado Cargando
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
        // PETICIÓN AL WORKER (Ahora sí soporta JSON gracias a tu nuevo código de Worker)
        const respuesta = await fetch(WORKER_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(datos)
        });

        const resultado = await respuesta.json();

        if (resultado.status === "success") {
            // UI: Éxito
            btnElement.innerHTML = '<i class="material-icons">done_all</i>';
            btnElement.classList.add("checked");
            
            // Efecto visual en la tarjeta
            const cardId = `card-${cleanId(proveedor)}`;
            document.getElementById(cardId).style.opacity = "0.5";
            
            mostrarToast(`${proveedor} registrado correctamente`, "success");
        } else {
            throw new Error(resultado.message || "Error desconocido");
        }

    } catch (error) {
        console.error(error);
        mostrarToast("Error de conexión con el servidor", "error");
        // Restaurar botón
        btnElement.innerHTML = originalIcon;
        btnElement.disabled = false;
    }
}

// 3. UTILIDADES
function cleanId(str) {
    return str.toLowerCase().replace(/\s+/g, '-');
}

function mostrarToast(mensaje, tipo) {
    const toast = document.getElementById("toast");
    const texto = document.getElementById("toast-msg");
    const icono = toast.querySelector("i");

    texto.textContent = mensaje;
    icono.textContent = tipo === "success" ? "check_circle" : "error_outline";
    
    toast.className = ""; // Reset
    toast.classList.add(tipo);
    toast.classList.add("show");

    // Vibración
    if (navigator.vibrate) navigator.vibrate(tipo === "error" ? [50, 50, 50] : 50);

    setTimeout(() => {
        toast.classList.remove("show");
    }, 3500);
}

// 4. ONESIGNAL INIT
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

// PEGAR ESTO EN APP.JS

// URL DE TU WORKER
const WORKER_URL = "https://jolly-dust-2d7a.santamariapablodaniel.workers.dev/";

// Cargar al iniciar
window.addEventListener('DOMContentLoaded', () => {
    initOneSignal();
    cargarStockInteligente(); // Nueva función de carga
});

async function cargarStockInteligente() {
    const container = document.querySelector('.task-list'); // Tu contenedor de tarjetas
    if(!container) return;

    container.innerHTML = '<div style="text-align:center; padding:20px;"><i class="material-icons spin">sync</i><p>Analizando stocks...</p></div>';

    try {
        const res = await fetch(WORKER_URL); // GET request
        const data = await res.json();
        
        if(data.status === "success") {
            renderizarTareas(data.tasks);
        }
    } catch (e) {
        console.error(e);
        container.innerHTML = '<p style="text-align:center; color:red">Error de conexión</p>';
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
        let borde = "#FFD600"; // Amarillo (Toca hoy)
        let icono = "schedule";
        let textoColor = "#FFF";
        
        if (item.urgencia >= 1.5) {
            borde = "#FF4444"; // Rojo (Muy atrasado)
            icono = "warning";
            textoColor = "#FF8888";
        } else if (item.mensaje.includes("Adelantar")) {
            borde = "#00C851"; // Verde (Adelantar)
            icono = "event_available";
        }

        const card = document.createElement('div');
        card.className = 'task-card'; // Asegúrate de tener esta clase en CSS
        card.style.borderLeft = `5px solid ${borde}`;
        card.style.marginBottom = "15px";
        card.id = `card-${cleanId(item.proveedor)}`;

        card.innerHTML = `
            <div class="task-info">
                <h3 style="margin:0; font-size:1.1rem;">${item.proveedor}</h3>
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
