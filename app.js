/****************************************************
 * APP.JS — STOCK SUPERVISOR V.FINAL (ANTIBALAS)
 ****************************************************/

const WORKER_URL = "https://jolly-dust-2d7a.santamariapablodaniel.workers.dev/"; 
let usuarioActual = localStorage.getItem("usuarioStock");

// --- ARRANQUE ---
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
    if (nombre.length < 2) return mostrarToast("Ingresa un nombre", "error");
    
    usuarioActual = nombre;
    localStorage.setItem("usuarioStock", nombre);
    mostrarToast(`Hola, ${nombre}`, "success");
    verificarSesion();
    cargarDatosCompletos();
}

// --- CARGA DE DATOS (CON PROTECCIÓN 429) ---
async function cargarDatosCompletos() {
    const container = document.querySelector('.task-list');
    const aiSection = document.getElementById('ai-section');
    const motivationalBanner = document.getElementById('motivational-message'); // Nuevo elemento

    // Limpia la consola y muestra el loader
    console.clear(); 
    if(container) container.innerHTML = `
        <div style="text-align:center; padding:40px; opacity:0.6">
            <i class="material-icons spin" style="font-size:30px; color:var(--yellow)">donut_large</i>
            <p style="margin-top:15px; font-size:0.9rem">Conectando con la base...</p>
        </div>`;

    try {
        const res = await fetch(WORKER_URL);
        
        // MANEJO DE ERROR 429 O 500
        if (!res.ok) {
            if(res.status === 429) throw new Error("Servidor saturado. Espera 1 min.");
            throw new Error("Error del servidor (" + res.status + ")");
        }

        // INTENTO DE PARSEAR JSON
        let data;
        try {
            data = await res.json();
        } catch (jsonError) {
            throw new Error("Respuesta inválida del servidor.");
        }
        
        if(data.status === "success") {
            // 1. Renderiza las tareas pendientes
            renderizarTareas(data.tasks || []);
            
            // 2. Muestra el Reporte IA
            if (data.ia_report && data.ia_report.texto) {
                mostrarReporteIA(data.ia_report);
            } else {
                aiSection.style.display = "none";
            }
            
            // 3. MUESTRA EL MENSAJE MOTIVACIONAL (NUEVA LÓGICA)
            if (data.motivational_msg && motivationalBanner) {
                motivationalBanner.innerHTML = data.motivational_msg;
                motivationalBanner.classList.remove('hidden'); 
                motivationalBanner.style.display = 'block';
            } else if (motivationalBanner) {
                motivationalBanner.classList.add('hidden');
            }
            
        }
    } catch (e) {
        console.error(e);
        // Asegura que el banner motivacional se oculte si hay error de conexión
        if (motivationalBanner) motivationalBanner.classList.add('hidden');
        
        container.innerHTML = `
            <div style="text-align:center; padding:30px; color:#ff5252">
                <i class="material-icons" style="font-size:40px">wifi_off</i>
                <p style="margin:10px 0">${e.message}</p>
                <button onclick="cargarDatosCompletos()" style="background:#333; color:white; border:none; padding:10px 20px; border-radius:10px; cursor:pointer">Reintentar</button>
            </div>`;
    }
}

// --- RENDER STOCK ---
function renderizarTareas(lista) {
    const container = document.querySelector('.task-list');
    container.innerHTML = "";

    if (lista.length === 0) {
        const h = new Date().getHours();
        let msg = "Stock al día."; let icon = "check_circle";
        if(h < 7 || h > 17) { msg = "Sistema en reposo."; icon = "nights_stay"; }

        container.innerHTML = `
            <div style="text-align:center; opacity:0.3; margin-top:60px">
                <i class="material-icons" style="font-size:60px">${icon}</i>
                <p style="margin-top:15px">${msg}</p>
            </div>`;
        return;
    }

    lista.forEach((item, index) => {
        let color = "#FFD60A"; let icono = "schedule";
        let msg = item.mensaje || "Revisión pendiente";
        let dias = item.diasAtraso || 0;

        if (item.estado === "critico") { color = "#FF5252"; icono = "priority_high"; }
        else if (item.estado === "adelantar") { color = "#00E676"; icono = "fast_forward"; }

        const card = document.createElement('div');
        card.className = 'task-card';
        card.style.borderLeft = `4px solid ${color}`;
        card.style.animationDelay = index * 0.1 + 's';
        card.id = `card-${cleanId(item.proveedor)}`;

        card.innerHTML = `
            <div class="task-info">
                <h3>${item.proveedor}</h3>
                <div class="task-meta">
                    <i class="material-icons" style="font-size:14px; color:${color}">${icono}</i> 
                    ${msg} (${dias}d)
                </div>
            </div>
            <button class="btn-check" onclick="accionStock('${item.proveedor}', this)">
                <i class="material-icons">check</i>
            </button>
        `;
        container.appendChild(card);
    });
}

function mostrarReporteIA(reporte) {
    document.getElementById('ai-section').style.display = "block";
    document.getElementById('ai-text').innerText = reporte.texto;
    const f = new Date(reporte.fecha);
    document.getElementById('ai-date').innerText = `Reporte: ${f.toLocaleDateString()} ${f.toLocaleTimeString()}`;
}

// --- ACCIONES Y MODALES ---
async function accionStock(proveedor, btn) {
    // Usamos nuestro Modal Custom en vez de confirm()
    const confirmar = await mostrarModal(
        "check_circle", 
        "Confirmar Stock", 
        `¿Ya terminaste de contar y ordenar el stock de <b>${proveedor}</b>?`,
        "Sí, Confirmar",
        "#FFD60A"
    );

    if (!confirmar) return;

    btn.innerHTML = '<i class="material-icons spin">sync</i>';
    btn.disabled = true;

    try {
        await fetch(WORKER_URL, {
            method: "POST", headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ action: "stockDone", proveedor, encargado: usuarioActual })
        });

        btn.innerHTML = '<i class="material-icons">done</i>';
        btn.classList.add("checked");
        document.getElementById(`card-${cleanId(proveedor)}`).style.opacity = "0.2";
        mostrarToast("Stock registrado", "success");
    } catch (e) {
        mostrarToast("Error al guardar", "error");
        btn.disabled = false; btn.innerHTML = '<i class="material-icons">check</i>';
    }
}

async function forzarIA() {
    const confirmar = await mostrarModal(
        "psychology",
        "Análisis IA",
        "La IA escaneará los pedidos de la semana buscando faltantes. ¿Continuar?",
        "Escanear",
        "#D437FF"
    );

    if(!confirmar) return;

    mostrarToast("IA pensando...", "info");
    try {
        const res = await fetch(WORKER_URL, {
            method: "POST", headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ action: "forceAI", usuario: usuarioActual })
        });
        const data = await res.json();
        if(data.status === "success") {
            mostrarToast("Análisis completo", "success");
            setTimeout(cargarDatosCompletos, 1500);
        } else {
            mostrarToast("Sin cambios", "info");
        }
    } catch(e) { mostrarToast("Error de IA", "error"); }
}

// --- SISTEMA DE MODAL (Promesas) ---
let resolveModal;

function mostrarModal(iconName, titulo, desc, btnText, colorBtn) {
    const modal = document.getElementById('modal-overlay');
    const icon = document.getElementById('modal-icon');
    const btnConfirm = document.getElementById('btn-confirm');
    
    icon.innerHTML = `<i class="material-icons" style="color:${colorBtn}">${iconName}</i>`;
    document.getElementById('modal-title').innerText = titulo;
    document.getElementById('modal-desc').innerHTML = desc;
    
    btnConfirm.innerText = btnText;
    btnConfirm.style.background = colorBtn;
    
    // Ocultar botón cancelar si es ayuda
    const btnCancel = document.querySelector('.btn-cancel');
    btnCancel.style.display = (btnText === "Entendido") ? "none" : "block";
    if(btnText === "Entendido") btnConfirm.style.background = "#333";

    modal.classList.add('show-modal');

    return new Promise((resolve) => {
        resolveModal = resolve;
        btnConfirm.onclick = () => { cerrarModal(); resolve(true); };
        btnCancel.onclick = () => { cerrarModal(); resolve(false); };
    });
}

function mostrarAyuda() {
    mostrarModal(
        "school", 
        "Ayuda Rápida", 
        `<div style="text-align:left; font-size:0.85rem">
         <p>🟡 <b>Amarillo:</b> Pendiente normal.</p>
         <p>🔴 <b>Rojo:</b> Muy atrasado.</p>
         <p>🟣 <b>Violeta:</b> Reporte de la IA.</p>
         <hr style="border-color:#333">
         <p>Presiona el check para confirmar stock realizado.</p>
         </div>`,
        "Entendido",
        "#fff"
    );
}

function cerrarModal() {
    document.getElementById('modal-overlay').classList.remove('show-modal');
}

// --- UTILS ---
function mostrarToast(msg, tipo) {
    const t = document.getElementById("toast");
    const icon = t.querySelector("i");
    document.getElementById("toast-msg").innerText = msg;
    
    if(tipo==="success"){ t.style.border="1px solid var(--green)"; icon.innerText="check_circle"; icon.style.color="var(--green)"; }
    else if(tipo==="error"){ t.style.border="1px solid var(--red)"; icon.innerText="error"; icon.style.color="var(--red)"; }
    else { t.style.border="1px solid #29b6f6"; icon.innerText="info"; icon.style.color="#29b6f6"; }
    
    t.classList.add("show");
    setTimeout(()=>t.classList.remove("show"), 3000);
}
function cleanId(s) { return s.toLowerCase().replace(/[^a-z0-9]/g, ''); }
function initOneSignal() { window.OneSignalDeferred = window.OneSignalDeferred || []; OneSignalDeferred.push(async function(OS){ await OS.init({ appId: "b89337f7-3997-43ab-be02-bdd99346fad7", safari_web_id: "", notifyButton: { enable: true } }); }); }
