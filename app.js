/****************************************************
 * APP.JS — STOCK SUPERVISOR + GEMINI AI
 ****************************************************/

const WORKER_URL = "https://jolly-dust-2d7a.santamariapablodaniel.workers.dev/"; 
let usuarioActual = localStorage.getItem("usuarioStock");

window.addEventListener('DOMContentLoaded', () => {
    verificarSesion();
    initOneSignal();
    if (usuarioActual) cargarDatosCompletos();
});

// --- SESIÓN ---
function verificarSesion() {
    if (usuarioActual) {
        document.getElementById("view-login")?.classList.add("hidden");
        document.getElementById("view-app")?.classList.remove("hidden");
        const badge = document.getElementById("user-badge");
        if(badge) { badge.textContent = usuarioActual; badge.classList.remove("hidden"); }
    }
}

function login() {
    const nombre = document.getElementById("input-name").value.trim();
    if (nombre.length < 2) return mostrarToast("Nombre inválido", "error");
    usuarioActual = nombre;
    localStorage.setItem("usuarioStock", nombre);
    verificarSesion();
    cargarDatosCompletos();
}

// --- CORE: CARGA DE DATOS (STOCK + IA) ---
async function cargarDatosCompletos() {
    const container = document.querySelector('.task-list');
    const aiSection = document.getElementById('ai-section');
    
    // Estado de carga
    if(container) container.innerHTML = '<div style="text-align:center; padding:20px; color:#666"><i class="material-icons spin">donut_large</i><p>Sincronizando Cerebro...</p></div>';

    try {
        const res = await fetch(WORKER_URL); 
        const data = await res.json();
        
        if(data.status === "success") {
            // 1. Renderizar Tareas Stock
            renderizarTareas(data.tasks || []);
            
            // 2. Renderizar Reporte IA (Si existe)
            if (data.ia_report) {
                mostrarReporteIA(data.ia_report);
            } else {
                aiSection.style.display = "none";
            }
        }
    } catch (e) {
        console.error(e);
        container.innerHTML = '<div style="text-align:center; color:#ff4444">Error de conexión neural.</div>';
    }
}

// --- RENDER STOCK ---
function renderizarTareas(lista) {
    const container = document.querySelector('.task-list');
    container.innerHTML = "";

    if (lista.length === 0) {
        const hora = new Date().getHours();
        // Solo mensaje de descanso si es fuera de hora
        if(hora < 7 || hora > 17) {
            container.innerHTML = '<div style="text-align:center; opacity:0.5; margin-top:30px"><i class="material-icons" style="font-size:40px">bedtime</i><p>Sistema en reposo.</p></div>';
        } else {
            container.innerHTML = '<div style="text-align:center; opacity:0.5; margin-top:30px"><i class="material-icons" style="font-size:40px; color:#00C851">check</i><p>Todo en orden.</p></div>';
        }
        return;
    }

    lista.forEach(item => {
        let color = "#FFD60A"; let icono = "schedule";
        if (item.estado === "critico") { color = "#FF4444"; icono = "warning"; }
        else if (item.estado === "adelantar") { color = "#00C851"; icono = "fast_forward"; }

        const card = document.createElement('div');
        card.className = 'task-card';
        card.style.borderLeft = `4px solid ${color}`;
        card.id = `card-${cleanId(item.proveedor)}`;
        card.innerHTML = `
            <div>
                <h3 style="margin:0; font-size:1rem; color:#fff">${item.proveedor}</h3>
                <div style="font-size:0.8rem; color:#aaa; margin-top:4px; display:flex; align-items:center; gap:5px">
                    <i class="material-icons" style="font-size:12px; color:${color}">${icono}</i> ${item.mensaje}
                </div>
            </div>
            <button class="btn-icon" onclick="enviarStock('${item.proveedor}', this)">
                <i class="material-icons">check</i>
            </button>
        `;
        container.appendChild(card);
    });
}

// --- RENDER IA ---
function mostrarReporteIA(reporte) {
    const aiSection = document.getElementById('ai-section');
    const aiText = document.getElementById('ai-text');
    const aiDate = document.getElementById('ai-date');
    
    // Si hay reporte, mostramos la tarjeta
    aiSection.style.display = "block";
    aiText.innerText = reporte.texto; // Gemini ya manda el texto formateado
    
    // Formato de fecha amigable
    const fecha = new Date(reporte.fecha);
    aiDate.innerText = "IA Scan: " + fecha.toLocaleDateString() + " " + fecha.toLocaleTimeString();
}

async function forzarAnalisisIA() {
    if(!confirm("¿Activar escaneo manual de pedidos con IA? Esto puede tardar unos segundos.")) return;
    
    mostrarToast("IA Analizando pedidos...", "info");
    
    try {
        const res = await fetch(WORKER_URL, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ action: "forceAI", usuario: usuarioActual })
        });
        const data = await res.json();
        
        if(data.status === "success") {
            mostrarToast("Análisis finalizado", "success");
            setTimeout(cargarDatosCompletos, 1000); // Recargar para ver el nuevo reporte
        } else {
            mostrarToast("Sin faltantes nuevos", "success");
        }
    } catch(e) {
        mostrarToast("Error al contactar IA", "error");
    }
}

// --- ACCIONES ---
async function enviarStock(proveedor, btn) {
    if (!confirm(`¿Confirmas ${proveedor}?`)) return;
    
    btn.innerHTML = '<i class="material-icons spin">sync</i>';
    btn.disabled = true;
    
    try {
        await fetch(WORKER_URL, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ action: "stockDone", proveedor, encargado: usuarioActual })
        });
        
        btn.innerHTML = '<i class="material-icons">done</i>';
        btn.classList.add("checked");
        document.getElementById(`card-${cleanId(proveedor)}`).style.opacity = "0.3";
        mostrarToast("Stock guardado", "success");
    } catch (e) {
        mostrarToast("Error de red", "error");
        btn.disabled = false; btn.innerHTML = '<i class="material-icons">check</i>';
    }
}

// --- UTILS ---
function cleanId(s) { return s.toLowerCase().replace(/[^a-z0-9]/g, ''); }
function mostrarToast(m, t) {
    const el = document.getElementById("toast");
    document.getElementById("toast-msg").innerText = m;
    el.className = t + " show";
    setTimeout(() => el.className = "", 3000);
}
function initOneSignal() {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    OneSignalDeferred.push(async function(OneSignal) {
        await OneSignal.init({ appId: "b89337f7-3997-43ab-be02-bdd99346fad7", safari_web_id: "", notifyButton: { enable: true } });
    });
}
