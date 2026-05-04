const API_BASE_URL = 'http://localhost:8080/api';

// --- UTILIDAD: DECODIFICADOR DE TOKEN (HACK PARA LEER ROLES) ---
function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
}

// Comprueba si el usuario tiene rol de Administrador
function esAdmin(token) {
    const decoded = parseJwt(token);
    if (!decoded) return false;
    // Buscamos la palabra ADMIN en cualquier parte del contenido del token
    return JSON.stringify(decoded).toUpperCase().includes('ADMIN');
}

// --- LÓGICA DE LOGIN ---
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('loginError');
        errorDiv.classList.add('d-none'); // Escondemos error previo

        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (response.ok) {
                const data = await response.json();
                
                // Sistema anti-fallos: A veces el backend no lo llama "token"
                let tokenRecibido = data.token || data.jwt || data.accessToken;
                if (!tokenRecibido && typeof data === 'string') tokenRecibido = data;

                if (tokenRecibido) {
                    localStorage.setItem('jwt_token', tokenRecibido); 
                    // Redirigir según el rol
                    if (esAdmin(tokenRecibido)) {
                        window.location.href = 'admin.html';
                    } else {
                        window.location.href = 'index.html';
                    }
                } else {
                    // USO DE COMILLAS INVERTIDAS PARA EVITAR ERRORES DE SINTAXIS
                    errorDiv.innerHTML = `<i class="bi bi-exclamation-triangle"></i> Error: El servidor no ha retornat cap token.`;
                    errorDiv.classList.remove('d-none');
                }
            } else {
                errorDiv.innerHTML = `<i class="bi bi-exclamation-triangle"></i> Correu o contrasenya incorrectes.`;
                errorDiv.classList.remove('d-none');
            }
        } catch (error) {
            console.error('Error de conexión:', error);
            // USO DE COMILLAS INVERTIDAS PARA EVITAR ERRORES DE SINTAXIS
            errorDiv.innerHTML = `<i class="bi bi-wifi-off"></i> No s'ha pogut connectar amb el servidor.`;
            errorDiv.classList.remove('d-none');
        }
    });
}

// --- LÓGICA DE REGISTRO ---
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;

        try {
            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (response.ok) {
                document.getElementById('registerError').classList.add('d-none');
                document.getElementById('registerSuccess').classList.remove('d-none');
                setTimeout(() => window.location.href = 'login.html', 2000);
            } else {
                document.getElementById('registerSuccess').classList.add('d-none');
                document.getElementById('registerError').classList.remove('d-none');
            }
        } catch (error) {
            console.error('Error de conexión:', error);
            alert("No s'ha pogut connectar amb el servidor.");
        }
    });
}

// --- LÓGICA DE CARGA DE RESERVAS (USUARIO) ---
async function cargarMisReservas() {
    const token = localStorage.getItem('jwt_token');
    const listaContainer = document.getElementById('listaReservas');
    if (!token || !listaContainer) return;

    try {
        const response = await fetch(`${API_BASE_URL}/reservations`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const reservas = await response.json();
            dibujarTablaReservas(reservas, listaContainer, false);
        } else {
            manejarErrorSesion(response, listaContainer);
        }
    } catch (error) {
        console.error("Error de xarxa:", error);
        listaContainer.innerHTML = `<div class="alert alert-danger">Error de connexió amb el servidor.</div>`;
    }
}

// --- LÓGICA DE CARGA DE RESERVAS (ADMIN) ---
async function cargarTodasLasReservas() {
    const token = localStorage.getItem('jwt_token');
    const container = document.getElementById('adminReservasContainer');
    if (!token || !container) return;

    try {
        const response = await fetch(`${API_BASE_URL}/reservations`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const reservas = await response.json();
            dibujarTablaReservas(reservas, container, true);
        } else {
            manejarErrorSesion(response, container);
        }
    } catch (error) {
        console.error("Error de xarxa:", error);
        container.innerHTML = `<div class="alert alert-danger">Error de connexió amb el servidor.</div>`;
    }
}

// --- DIBUJADOR DE TABLAS REUTILIZABLE ---
function dibujarTablaReservas(reservas, contenedor, esAdmin) {
    if (reservas.length === 0) {
        contenedor.innerHTML = `<div class="alert alert-info shadow-sm"><i class="bi bi-info-circle"></i> No hi ha cap reserva registrada ara mateix.</div>`;
        return;
    }

    let html = `
        <div class="table-responsive">
            <table class="table table-hover align-middle bg-white border">
                <thead class="table-dark">
                    <tr>
                        <th>ID</th>
                        ${esAdmin ? '<th>Client (Email)</th>' : ''}
                        <th>Data</th>
                        <th>Hora</th>
                        <th>Pax</th>
                        <th>Taula</th>
                        <th>Estat</th>
                        <th class="text-center">Accions</th>
                    </tr>
                </thead>
                <tbody>`;
    
    reservas.forEach(res => {
        const badgeClass = res.status === 'CONFIRMED' ? 'bg-success' : 'bg-warning text-dark';
        html += `
            <tr>
                <td class="text-muted">#${res.id}</td>
                ${esAdmin ? `<td><strong>${res.userEmail || 'Desconegut'}</strong></td>` : ''}
                <td>${res.reservationDate}</td>
                <td>${res.reservationTime}</td>
                <td><span class="badge rounded-pill bg-light text-dark border">${res.numberOfPeople}</span></td>
                <td>T-${res.tableId || res.tableNumber}</td>
                <td><span class="badge ${badgeClass}">${res.status}</span></td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-danger" onclick="cancelarReserva(${res.id})">
                        <i class="bi bi-trash3"></i> Anul·lar
                    </button>
                </td>
            </tr>`;
    });
    
    html += `</tbody></table></div>`;
    contenedor.innerHTML = html;
}

// --- FUNCIÓN PARA BORRAR RESERVAS REAL ---
async function cancelarReserva(id) {
    if(confirm(`Estàs segur que vols anul·lar i ESBORRAR la reserva #${id}? Aquesta acció no es pot desfer.`)) {
        const token = localStorage.getItem('jwt_token');
        try {
            const response = await fetch(`${API_BASE_URL}/reservations/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok || response.status === 204) {
                alert("Reserva anul·lada correctament.");
                if (document.getElementById('adminReservasContainer')) cargarTodasLasReservas();
                else if (document.getElementById('listaReservas')) cargarMisReservas();
            } else {
                alert("Error al intentar anul·lar la reserva. Potser no tens permisos.");
            }
        } catch (error) {
            console.error("Error al borrar:", error);
            alert("Error de connexió.");
        }
    }
}

function manejarErrorSesion(response, container) {
    container.innerHTML = `<div class="alert alert-danger">Error al carregar les dades.</div>`;
    if(response.status === 403 || response.status === 401) {
        alert("Sessió caducada o accés denegat. Torna a entrar.");
        localStorage.removeItem('jwt_token');
        window.location.href = 'login.html';
    }
}

// --- LÓGICA DEL MAPA DE MESAS (SEPARADO POR ZONAS) ---
function dibujarMapaMesas() {
    const mapaContenedor = document.getElementById('mapaMesas');
    if (!mapaContenedor) return;

    let htmlMapa = '';

    // ZONA INTERIOR (Mesas 1 a 12)
    htmlMapa += `
        <div class="zona-interior p-4 mb-5 shadow-sm">
            <h4 class="text-secondary border-bottom pb-2 mb-4"><i class="bi bi-house-door-fill text-dark"></i> Saló Interior</h4>
            <div class="mapa-grid">
    `;
    for (let i = 1; i <= 12; i++) htmlMapa += generarHTMLMesa(i);
    htmlMapa += `</div></div>`;

    // ZONA TERRAZA (Mesas 13 a 20)
    htmlMapa += `
        <div class="zona-terraza p-4 shadow-sm">
            <h4 class="text-secondary border-bottom pb-2 mb-4" style="color: #8b4513 !important;"><i class="bi bi-sun-fill text-warning"></i> Terrassa Exterior</h4>
            <div class="mapa-grid">
    `;
    for (let i = 13; i <= 20; i++) htmlMapa += generarHTMLMesa(i);
    htmlMapa += `</div></div>`;

    mapaContenedor.innerHTML = htmlMapa;
}

function generarHTMLMesa(numero) {
    let capacidad;
    if (numero === 1 || numero === 5 || numero === 13 || numero === 17) capacidad = 2; 
    else if (numero === 10 || numero === 20) capacidad = 6; 
    else capacidad = 4; 

    const estaDisponible = Math.random() > 0.4;
    const claseEstado = estaDisponible ? 'disponible' : 'ocupada';
    const iconoEstado = estaDisponible ? '✓ Lliure' : '✕ Ocupada';

    return `
        <div class="taula-plano taula-${capacidad} ${claseEstado}">
            <span class="taula-numero">T-${numero}</span>
            <span class="taula-pax"><i class="bi bi-people-fill"></i> ${capacidad} pax</span>
            <span style="font-size: 0.7rem; margin-top: 5px;">${iconoEstado}</span>
        </div>
    `;
}

// --- INICIALIZACIÓN GENERAL ---
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('jwt_token');
    const loginBtn = document.getElementById('loginBtn');
    const reservationsBtn = document.getElementById('reservationsBtn');
    const adminBtn = document.getElementById('adminBtn');
    const logoutBtns = document.querySelectorAll('#logoutBtn'); 

    // Botones de Navbar dependientes de la sesión
    if (token) {
        if (loginBtn) loginBtn.classList.add('d-none');
        logoutBtns.forEach(btn => btn.classList.remove('d-none'));

        // Decidimos qué botón mostrar según el rol
        if (esAdmin(token)) {
            if (adminBtn) adminBtn.classList.remove('d-none');
        } else {
            if (reservationsBtn) reservationsBtn.classList.remove('d-none');
        }
    }

    // Dibujar plano si estamos en index.html
    dibujarMapaMesas();

    // Lógica para página de Reservas (Usuario normal)
    if (window.location.pathname.includes('reservations.html')) {
        if (token) cargarMisReservas();
        else window.location.href = 'login.html';
    }

    // Lógica para página de Admin
    if (window.location.pathname.includes('admin.html')) {
        if (token && esAdmin(token)) cargarTodasLasReservas();
        else window.location.href = 'login.html'; // Protegemos la ruta
    }

    // Cierre de sesión (Para cualquier botón que se llame logoutBtn)
    logoutBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('jwt_token');
            window.location.href = 'index.html';
        });
    });
});