const API_BASE_URL = 'http://localhost:8080/api';

// --- LÓGICA DE LOGIN ---
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('jwt_token', data.token); 
                window.location.href = 'index.html';
            } else {
                const errorDiv = document.getElementById('loginError');
                if (errorDiv) errorDiv.classList.remove('d-none');
            }
        } catch (error) {
            console.error('Error de conexión:', error);
            alert("No s'ha pogut connectar amb el servidor.");
        }
    });
}

// --- LÓGICA DE REGISTRO (NUEVO) ---
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;

        try {
            // Suponemos que tu backend tiene un endpoint /auth/register
            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (response.ok) {
                document.getElementById('registerError').classList.add('d-none');
                document.getElementById('registerSuccess').classList.remove('d-none');
                // Esperamos 2 segundos y lo mandamos al login para que entre
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
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

// --- LÓGICA DE CARGA DE RESERVAS ---
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
            
            if (reservas.length === 0) {
                listaContainer.innerHTML = `
                    <div class="alert alert-info shadow-sm">
                        Encara no tens cap reserva.
                    </div>`;
                return;
            }

            let html = `
                <div class="table-responsive shadow-sm rounded">
                    <table class="table table-hover align-middle bg-white">
                        <thead class="table-dark">
                            <tr>
                                <th>Data</th>
                                <th>Hora</th>
                                <th>Persones</th>
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
                        <td><strong>${res.reservationDate}</strong></td>
                        <td>${res.reservationTime}</td>
                        <td><span class="badge rounded-pill bg-light text-dark border">${res.numberOfPeople} pers.</span></td>
                        <td>Mesura ${res.tableId}</td>
                        <td><span class="badge ${badgeClass}">${res.status}</span></td>
                        <td class="text-center">
                            <button class="btn btn-sm btn-outline-danger" onclick="cancelarReserva(${res.id})">
                                Anul·lar
                            </button>
                        </td>
                    </tr>`;
            });
            
            html += '</tbody></table></div>';
            listaContainer.innerHTML = html;

        } else {
            listaContainer.innerHTML = '<div class="alert alert-danger">Error al carregar les reserves.</div>';
            if(response.status === 403) {
                alert("Sessió caducada o no autoritzada. Torna a entrar.");
                localStorage.removeItem('jwt_token');
                window.location.href = 'login.html';
            }
        }
    } catch (error) {
        console.error("Error de xarxa:", error);
        listaContainer.innerHTML = '<div class="alert alert-danger">Error de connexió amb el servidor.</div>';
    }
}

function cancelarReserva(id) {
    if(confirm("Segur que vols anul·lar la reserva #" + id + "?")) {
        console.log("Intentant anul·lar reserva:", id);
    }
}

// --- LÓGICA DEL MAPA DE MESAS ---
function dibujarMapaMesas() {
    const mapaContenedor = document.getElementById('mapaMesas');
    if (!mapaContenedor) return;

    let htmlMapa = '';

    for (let i = 1; i <= 20; i++) {
        let capacidad;
        if (i === 1 || i === 5 || i === 9 || i === 15) {
            capacidad = 2; 
        } else if (i === 10 || i === 20) {
            capacidad = 6; 
        } else {
            capacidad = 4; 
        }

        const estaDisponible = Math.random() > 0.4;
        const claseEstado = estaDisponible ? 'disponible' : 'ocupada';
        const iconoEstado = estaDisponible ? '✓ Lliure' : '✕ Ocupada';

        htmlMapa += `
            <div class="taula-plano taula-${capacidad} ${claseEstado}">
                <span class="taula-numero">T-${i}</span>
                <span class="taula-pax"><i class="bi bi-people-fill"></i> ${capacidad} pax</span>
                <span style="font-size: 0.7rem; margin-top: 5px;">${iconoEstado}</span>
            </div>
        `;
    }

    mapaContenedor.innerHTML = htmlMapa;
}

// --- INICIALIZACIÓN GENERAL ---
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('jwt_token');
    const loginBtn = document.getElementById('loginBtn');
    const reservationsBtn = document.getElementById('reservationsBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    // Botones de Navbar
    if (token) {
        if (loginBtn) loginBtn.classList.add('d-none');
        if (reservationsBtn) reservationsBtn.classList.remove('d-none');
        if (logoutBtn) logoutBtn.classList.remove('d-none');
    }

    // Dibujar plano si estamos en index.html
    dibujarMapaMesas();

    // Cargar reservas si estamos en reservations.html
    if (window.location.pathname.includes('reservations.html')) {
        if (token) {
            cargarMisReservas();
        } else {
            window.location.href = 'login.html';
        }
    }

    // Cierre de sesión
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('jwt_token');
            window.location.href = 'index.html';
        });
    }
});