/****************************************************
 * APP.JS — STOCK SUPERVISOR V.FINAL PRO
 ****************************************************/

const WORKER_URL = "https://jolly-dust-2d7a.santamariapablodaniel.workers.dev/"; 
let usuarioActual = localStorage.getItem("usuarioStock");

// --- INICIO ---
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
    if (nombre.length < 2) return mostrarToast("Ingresa un nombre válido", "error");
    
    usuarioActual = nombre;
    localStorage.setItem("usuarioStock", nombre);
    
    mostrarToast(`Bienvenido, ${nombre}`, "success");
    verificarSesion();
    cargarDatosCompletos();
}

// --- CARGA DE DATOS ---
async function cargarDatosCompletos() {
    const container = document.querySelector('.task-list');
    const aiSection = document.getElementById('ai-section');
    
    if(container) container.innerHTML = `
        <div style="text-align:center; padding:40px; color:#555">
            <i class="material-icons spin" style="font-size:30px; color:var(--stock)">donut_large</i>
            <p style="margin-top:10px; font-size:0.9rem">Sincronizando datos...</p>
        </div>`;

    try {
        const res = await fetch(WORKER_URL); 
        const data = await res.json();
        
        if(data.status === "success") {
            renderizarTareas(data.tasks || []);
            
            // Renderizar IA solo si hay reporte válido
            if (data.ia_report && data.ia_report.texto) {
                mostrarReporteIA(data.ia_report);
            } else {
                aiSection.style.display = "none";
            }
        }
    } catch (e) {
        console.error(e);
        container.innerHTML = `
            <div style="text-align:center; padding:30px; color:#ff5252">
                <i class="material-icons">wifi_off</i><p>Sin conexión</p>
                <button onclick="cargarDatosCompletos()" style="margin-top:10px; padding:8px 16px; background:#333; color:#fff; border:none; border-radius:8px;">Reintentar</button>
            </div>`;
    }
}

// --- RENDERIZADO DE TARJETAS (Con Animación Cascada) ---
function renderizarTareas(lista) {
    const container = document.querySelector('.task-list');
    container.innerHTML = "";

    if (lista.length === 0) {
        const hora = new Date().getHours();
        let msg = "Todo al día.";
        let icon = "check_circle";
        if(hora < 7 || hora > 17) { msg = "Modo Reposo."; icon = "bedtime"; }

        container.innerHTML = `
            <div style="text-align:center; opacity:0.4; margin-top:50px">
                <i class="material-icons" style="font-size:50px">${icon}</i>
                <p style="margin-top:10px">${msg}</p>
            </div>`;
        return;
    }

    lista.forEach((item, index) => {
        let color = "#FFD60A"; // Stock
        let icono = "schedule";
        let mensaje = item.mensaje || "Pendiente";
        let dias = item.diasAtraso !== undefined ? item.diasAtraso : 0;

        if (item.estado === "critico") { color = "#FF5252"; icono = "priority_high"; } // Rojo
        else if (item.estado === "adelantar") { color = "#00E676"; icono = "fast_forward"; } // Verde

        const card = document.createElement('div');
        card.className = 'task-card';
        card.style.borderLeft = `4px solid ${color}`;
        // Animación escalonada: cada tarjeta aparece 100ms después de la anterior
        card.style.animationDelay = `${index * 0.08}s`; 
        card.id = `card-${cleanId(item.proveedor)}`;

        card.innerHTML = `
            <div class="task-info">
                <h3>${item.proveedor}</h3>
                <div class="task-detail">
                    <i class="material-icons" style="font-size:14px; color:${color}">${icono}</i> 
                    ${mensaje} <span style="opacity:0.5">• ${dias}d</span>
                </div>
            </div>
            <button class="btn-check" onclick="accionStock('${item.proveedor}', this)">
                <i class="material-icons">check</i>
            </button>
        `;
        container.appendChild(card);
    });
}

// --- RENDER IA ---
function mostrarReporteIA(reporte) {
    const aiSection = document.getElementById('ai-section');
    aiSection.style.display = "block";
    document.getElementById('ai-text').innerText = reporte.texto;
    const f = new Date(reporte.fecha);
    document.getElementById('ai-date').innerText = `Escaneo: ${f.toLocaleDateString()} ${f.toLocaleTimeString()}`;
}

// --- ACCIONES CON MODAL PERSONALIZADO ---

async function accionStock(proveedor, btn) {
    // 1. Pedir confirmación con modal bonito
    const confirmado = await abrirModalConfirmacion(
        `¿Stock Realizado?`, 
        `Confirma que has revisado físicamente el stock de <b>${proveedor}</b>.`
    );

    if (!confirmado) return;

    // 2. UI de carga
    btn.innerHTML = '<i class="material-icons spin">sync</i>';
    btn.disabled = true;
    if(navigator.vibrate) navigator.vibrate(50); // Feedback táctil

    // 3. Enviar al servidor
    try {
        await fetch(WORKER_URL, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ action: "stockDone", proveedor, encargado: usuarioActual })
        });

        // 4. Éxito visual
        btn.innerHTML = '<i class="material-icons">done</i>';
        btn.classList.add("checked");
        document.getElementById(`card-${cleanId(proveedor)}`).style.opacity = "0.2";
        mostrarToast("Stock Registrado", "success");

    } catch (e) {
        mostrarToast("Error de conexión", "error");
        btn.disabled = false;
        btn.innerHTML = '<i class="material-icons">check</i>';
    }
}

async function pedirConfirmacionIA() {
    const confirmado = await abrirModalConfirmacion(
        "¿Activar Escaneo IA?", 
        "La IA buscará faltantes en los pedidos recientes. Esto puede demorar unos segundos."
    );

    if (!confirmado) return;

    mostrarToast("IA Analizando...", "info");
    
    try {
        const res = await fetch(WORKER_URL, {
            method: "POST", headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ action: "forceAI", usuario: usuarioActual })
        });
        const data = await res.json();
        
        if(data.status === "success") {
            mostrarToast("Análisis Completado", "success");
            setTimeout(cargarDatosCompletos, 1500);
        } else {
            mostrarToast("Sin novedades", "info");
        }
    } catch(e) { mostrarToast("Error IA", "error"); }
}

// --- SISTEMA DE MODALES (Promesa) ---
let resolverModal = null;

function abrirModalConfirmacion(titulo, mensaje) {
    const modal = document.getElementById('modal-overlay');
    document.getElementById('modal-title').innerHTML = titulo;
    document.getElementById('modal-text').innerHTML = mensaje;
    document.getElementById('modal-actions').style.display = 'flex';
    
    // Configurar botones
    const btnConfirm = document.getElementById('btn-confirm-action');
    btnConfirm.textContent = "Confirmar";
    btnConfirm.onclick = () => { cerrarModal(); if(resolverModal) resolverModal(true); };

    modal.classList.add('show-flex');
    return new Promise(resolve => { resolverModal = resolve; });
}

function mostrarAyuda() {
    const modal = document.getElementById('modal-overlay');
    document.getElementById('modal-title').innerHTML = '<i class="material-icons" style="color:var(--stock)">school</i> Guía Rápida';
    document.getElementById('modal-text').innerHTML = `
        <div style="text-align:left; font-size:0.85rem">
        <p>🟡 <b>Amarillo:</b> Stock regular pendiente.</p>
        <p>🔴 <b>Rojo:</b> Muy atrasado (Prioridad).</p>
        <p>🟣 <b>Violeta:</b> Mensaje de la IA sobre faltantes.</p>
        <hr style="border-color:#333; margin:10px 0">
        <p>Toca el <i class="material-icons" style="font-size:12px">check</i> cuando termines de contar.</p>
        </div>`;
    
    const btnConfirm = document.getElementById('btn-confirm-action');
    btnConfirm.textContent = "Entendido";
    btnConfirm.onclick = cerrarModal;
    
    document.querySelector('.btn-cancel').style.display = 'none'; // Ocultar cancelar en ayuda
    modal.classList.add('show-flex');
}

function cerrarModal() {
    const modal = document.getElementById('modal-overlay');
    modal.classList.remove('show-flex');
    setTimeout(() => {
        document.querySelector('.btn-cancel').style.display = 'block'; // Restaurar botón
        if(resolverModal) resolverModal(false);
    }, 300);
}

// --- UI UTILS ---
function mostrarToast(mensaje, tipo) {
    const t = document.getElementById("toast");
    const icon = t.querySelector("i");
    document.getElementById("toast-msg").textContent = mensaje;

    t.style.border = tipo === "success" ? "1px solid #00E676" : (tipo === "error" ? "1px solid #FF5252" : "1px solid #29b6f6");
    icon.style.color = tipo === "success" ? "#00E676" : (tipo === "error" ? "#FF5252" : "#29b6f6");
    icon.textContent = tipo === "success" ? "check_circle" : (tipo === "error" ? "error" : "info");

    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 3000);
}

function cleanId(s) { return s.toLowerCase().replace(/[^a-z0-9]/g, ''); }
function initOneSignal() {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    OneSignalDeferred.push(async function(OneSignal) {
        await OneSignal.init({ appId: "b89337f7-3997-43ab-be02-bdd99346fad7", safari_web_id: "", notifyButton: { enable: true } });
    });
}
