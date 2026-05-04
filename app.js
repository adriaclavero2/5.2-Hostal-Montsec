const API_BASE_URL = 'http://localhost:8080/api';

// --- UTILIDAD: DECODIFICADOR DE TOKEN ---
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

function esAdmin(token) {
    const decoded = parseJwt(token);
    if (!decoded) return false;
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
        errorDiv.classList.add('d-none'); 

        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (response.ok) {
                const data = await response.json();
                let tokenRecibido = data.token || data.jwt || data.accessToken;
                if (!tokenRecibido && typeof data === 'string') tokenRecibido = data;

                if (tokenRecibido) {
                    localStorage.setItem('jwt_token', tokenRecibido); 
                    if (esAdmin(tokenRecibido)) window.location.href = 'admin.html';
                    else window.location.href = 'index.html';
                } else {
                    errorDiv.innerHTML = `<i class="bi bi-exclamation-triangle"></i> Error: Servidor no retorna token.`;
                    errorDiv.classList.remove('d-none');
                }
            } else {
                errorDiv.innerHTML = `<i class="bi bi-exclamation-triangle"></i> Correu o contrasenya incorrectes.`;
                errorDiv.classList.remove('d-none');
            }
        } catch (error) {
            errorDiv.innerHTML = `<i class="bi bi-wifi-off"></i> No s'ha pogut connectar.`;
            errorDiv.classList.remove('d-none');
        }
    });
}

// --- LÓGICA DE REGISTRO ---
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('regName').value;
        const surname = document.getElementById('regSurname').value;
        const nationalId = document.getElementById('regDni').value;
        const phone = document.getElementById('regPhone').value;
        const city = document.getElementById('regCity').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;

        const errorDiv = document.getElementById('registerError');
        const successDiv = document.getElementById('registerSuccess');
        errorDiv.classList.add('d-none');
        successDiv.classList.add('d-none');

        try {
            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, surname, nationalId, phone, city, email, password })
            });

            if (response.ok) {
                successDiv.classList.remove('d-none');
                setTimeout(() => window.location.href = 'login.html', 2000);
            } else {
                errorDiv.innerHTML = `<i class="bi bi-exclamation-triangle"></i> Revisa les dades o correu ja existent.`;
                errorDiv.classList.remove('d-none');
            }
        } catch (error) {
            errorDiv.innerHTML = `<i class="bi bi-wifi-off"></i> Error de connexió.`;
            errorDiv.classList.remove('d-none');
        }
    });
}

// --- LÓGICA PARA CREAR NUEVA RESERVA (ACTUALIZADO: SIN TABLE_ID) ---
const newReservationForm = document.getElementById('newReservationForm');
if (newReservationForm) {
    newReservationForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const reservationDate = document.getElementById('resDate').value;
        const reservationTime = document.getElementById('resTime').value;
        const numberOfPeople = parseInt(document.getElementById('resPax').value);
        const token = localStorage.getItem('jwt_token');

        const errorDiv = document.getElementById('reservaError');
        const successDiv = document.getElementById('reservaSuccess');
        errorDiv.classList.add('d-none');
        successDiv.classList.add('d-none');

        try {
            const response = await fetch(`${API_BASE_URL}/reservations`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                // Se elimina tableId, el backend debe asignarla automáticamente
                body: JSON.stringify({ reservationDate, reservationTime, numberOfPeople })
            });

            if (response.ok) {
                successDiv.classList.remove('d-none');
                setTimeout(() => {
                    const modalEl = document.getElementById('nuevaReservaModal');
                    const modal = bootstrap.Modal.getInstance(modalEl);
                    modal.hide();
                    
                    newReservationForm.reset();
                    successDiv.classList.add('d-none');
                    cargarMisReservas();
                }, 1500);
            } else {
                const errorData = await response.text();
                errorDiv.innerHTML = `Ho sentim: No hi ha taules lliures per a ${numberOfPeople} persones en aquesta data i hora.`;
                errorDiv.classList.remove('d-none');
            }
        } catch (error) {
            errorDiv.innerHTML = `Error de connexió amb el servidor.`;
            errorDiv.classList.remove('d-none');
        }
    });
}

// --- LÓGICA DE CARGA DE RESERVAS (USUARIO NORMAL) ---
async function cargarMisReservas() {
    const token = localStorage.getItem('jwt_token');
    const listaContainer = document.getElementById('listaReservas');
    if (!token || !listaContainer) return;

    try {
        const response = await fetch(`${API_BASE_URL}/reservations`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });

        if (response.ok) {
            const reservas = await response.json();
            dibujarTablaReservas(reservas, listaContainer, false);
        } else {
            manejarErrorSesion(response, listaContainer);
        }
    } catch (error) {
        listaContainer.innerHTML = `<div class="alert alert-danger">Error de connexió amb el servidor.</div>`;
    }
}

// --- LÓGICA DE CARGA DE RESERVAS (ADMINISTRADOR) ---
async function cargarTodasLasReservas() {
    const token = localStorage.getItem('jwt_token');
    const container = document.getElementById('adminReservasContainer');
    if (!token || !container) return;

    try {
        // ACTUALIZADO: El admin pide todas las reservas a /all
        const response = await fetch(`${API_BASE_URL}/reservations/all`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });

        if (response.ok) {
            const reservas = await response.json();
            dibujarTablaReservas(reservas, container, true);
        } else {
            manejarErrorSesion(response, container);
        }
    } catch (error) {
        container.innerHTML = `<div class="alert alert-danger">Error de connexió.</div>`;
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
                        ${esAdmin ? '<th>Client</th>' : ''}
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
                <td>T-${res.tableId || res.tableNumber || 'Auto'}</td>
                <td><span class="badge ${badgeClass}">${res.status || 'PENDING'}</span></td>
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
    if(confirm(`Estàs segur que vols anul·lar i ESBORRAR la reserva #${id}?`)) {
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
                alert("Error al intentar anul·lar la reserva.");
            }
        } catch (error) {
            alert("Error de connexió.");
        }
    }
}

function manejarErrorSesion(response, container) {
    container.innerHTML = `<div class="alert alert-danger">Sessió caducada. Torna a entrar.</div>`;
    if(response.status === 403 || response.status === 401) {
        localStorage.removeItem('jwt_token');
        setTimeout(() => window.location.href = 'login.html', 1500);
    }
}

// --- LÓGICA DEL MAPA DE MESAS (ACTUALIZADO CON HORA/FECHA) ---
function dibujarMapaMesas() {
    const mapaContenedor = document.getElementById('mapaMesas');
    if (!mapaContenedor) return;

    const mapDate = document.getElementById('mapDate');
    const mapTime = document.getElementById('mapTime');
    const horaSeleccionada = (mapTime && mapTime.value) ? mapTime.value : 'Ara';

    let htmlMapa = `
        <div class="zona-interior p-4 mb-5 shadow-sm">
            <h4 class="text-secondary border-bottom pb-2 mb-4"><i class="bi bi-house-door-fill text-dark"></i> Saló Interior</h4>
            <div class="mapa-grid">
    `;
    for (let i = 1; i <= 12; i++) htmlMapa += generarHTMLMesa(i, horaSeleccionada);
    htmlMapa += `</div></div>
        <div class="zona-terraza p-4 shadow-sm">
            <h4 class="text-secondary border-bottom pb-2 mb-4" style="color: #8b4513 !important;"><i class="bi bi-sun-fill text-warning"></i> Terrassa Exterior</h4>
            <div class="mapa-grid">
    `;
    for (let i = 13; i <= 20; i++) htmlMapa += generarHTMLMesa(i, horaSeleccionada);
    htmlMapa += `</div></div>`;

    mapaContenedor.innerHTML = htmlMapa;
}

function generarHTMLMesa(numero, horaSeleccionada) {
    let capacidad = (numero === 1 || numero === 5 || numero === 13 || numero === 17) ? 2 : (numero === 10 || numero === 20) ? 6 : 4; 
    
    const estaDisponible = Math.random() > 0.4;
    const claseEstado = estaDisponible ? 'disponible' : 'ocupada';
    
    const iconoEstado = estaDisponible 
        ? '✓ Lliure' 
        : `✕ Ocupada<br><small style="font-size:0.65rem; color:#ffd0d0;">(Reservada a les ${horaSeleccionada})</small>`;

    return `
        <div class="taula-plano taula-${capacidad} ${claseEstado}">
            <span class="taula-numero">T-${numero}</span>
            <span class="taula-pax"><i class="bi bi-people-fill"></i> ${capacidad} pax</span>
            <span class="text-center" style="font-size: 0.75rem; margin-top: 5px;">${iconoEstado}</span>
        </div>
    `;
}

// --- INICIALIZACIÓN GENERAL ---
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('jwt_token');
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const reservationsBtn = document.getElementById('reservationsBtn');
    const adminBtn = document.getElementById('adminBtn');
    const logoutBtns = document.querySelectorAll('#logoutBtn'); 

    const dateInput = document.getElementById('mapDate');
    if (dateInput) dateInput.valueAsDate = new Date();

    if (token) {
        if (loginBtn) loginBtn.classList.add('d-none');
        if (registerBtn) registerBtn.classList.add('d-none');
        logoutBtns.forEach(btn => btn.classList.remove('d-none'));

        if (esAdmin(token)) {
            if (adminBtn) adminBtn.classList.remove('d-none');
        } else {
            if (reservationsBtn) reservationsBtn.classList.remove('d-none');
        }
    }

    dibujarMapaMesas();

    if (window.location.pathname.includes('reservations.html')) {
        if (token) cargarMisReservas();
        else window.location.href = 'login.html';
    }

    if (window.location.pathname.includes('admin.html')) {
        if (token && esAdmin(token)) cargarTodasLasReservas();
        else window.location.href = 'login.html'; 
    }

    logoutBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('jwt_token');
            window.location.href = 'index.html';
        });
    });
});