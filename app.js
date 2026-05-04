// URL base de tu Backend de Spring Boot
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
                // IMPORTANTE: Asegúrate de que tu backend devuelve el campo como "token" o "jwt"
                localStorage.setItem('jwt_token', data.token); 
                window.location.href = 'index.html';
            } else {
                const errorData = await response.json();
                console.error("Error del backend:", errorData);
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
    if (!token) return;

    try {
        const response = await fetch(`${API_BASE_URL}/reservations`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`, // ¡Aquí está la clave!
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const reservas = await response.json();
            console.log("Reservas recibidas:", reservas);
            // Aquí iría la lógica para pintar las reservas en el HTML
            // p.ej: renderizarReservas(reservas);
        } else {
            console.error("Error al obtener reservas:", response.status);
            if(response.status === 403) alert("Sessió caducada. Torna a entrar.");
        }
    } catch (error) {
        console.error("Error de red:", error);
    }
}

// --- LÓGICA DE NAVEGACIÓN Y CIERRE DE SESIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('jwt_token');
    const loginBtn = document.getElementById('loginBtn');
    const reservationsBtn = document.getElementById('reservationsBtn');
    const logoutBtn = document.getElementById('logoutBtn'); // Por si tienes un botón de salir

    if (token) {
        if (loginBtn) loginBtn.classList.add('d-none');
        if (reservationsBtn) reservationsBtn.classList.remove('d-none');
        
        // Si estamos en la página de reservas, las cargamos automáticamente
        if (window.location.pathname.includes('reservas.html')) {
            cargarMisReservas();
        }
    }

    // Lógica para cerrar sesión
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('jwt_token');
            window.location.href = 'login.html';
        });
    }
});