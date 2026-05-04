// URL base de tu Backend de Spring Boot
console.log("¡POR FIN! app.js cargado correctamente");
alert("JS externo funcionando");
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
                // Guardamos el token que devuelve el backend
                localStorage.setItem('jwt_token', data.token); 
                window.location.href = 'index.html';
            } else {
                document.getElementById('loginError').classList.remove('d-none');
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
    
    if (!token) return;

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
            console.log("Reservas recibidas:", reservas);
            
            if (reservas.length === 0) {
                listaContainer.innerHTML = '<div class="alert alert-info">Encara no tens cap reserva.</div>';
                return;
            }

            // Generamos el HTML para ver las reservas en la tabla
            let html = '<table class="table table-striped"><thead><tr>' +
                       '<th>Data</th><th>Hora</th><th>Persones</th><th>Taula</th><th>Estat</th>' +
                       '</tr></thead><tbody>';
            
            reservas.forEach(res => {
                html += `<tr>
                    <td>${res.reservationDate}</td>
                    <td>${res.reservationTime}</td>
                    <td>${res.numberOfPeople}</td>
                    <td>${res.tableId}</td>
                    <td><span class="badge bg-success">${res.status}</span></td>
                </tr>`;
            });
            
            html += '</tbody></table>';
            listaContainer.innerHTML = html;

        } else {
            listaContainer.innerHTML = '<div class="alert alert-danger">Error al cargar las reservas.</div>';
            if(response.status === 403) alert("Sessió caducada. Torna a entrar.");
        }
    } catch (error) {
        console.error("Error de red:", error);
        listaContainer.innerHTML = '<div class="alert alert-danger">Error de conexió amb el servidor.</div>';
    }
}

// --- LÓGICA DE NAVEGACIÓN Y CIERRE DE SESIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('jwt_token');
    const loginBtn = document.getElementById('loginBtn');
    const reservationsBtn = document.getElementById('reservationsBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    // Manejo de botones en el Navbar
    if (token) {
        if (loginBtn) loginBtn.classList.add('d-none');
        if (reservationsBtn) reservationsBtn.classList.remove('d-none');
    }

    // ¡CORRECCIÓN AQUÍ!: Detectar el nombre correcto del archivo
    if (window.location.pathname.includes('reservations.html')) {
        if (token) {
            cargarMisReservas();
        } else {
            window.location.href = 'login.html';
        }
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('jwt_token');
            window.location.href = 'index.html';
        });
    }
});