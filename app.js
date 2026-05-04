// URL base de tu Backend de Spring Boot
const API_BASE_URL = 'http://localhost:8080/api';

// --- LÓGICA DE LOGIN ---
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Evita que la página se recargue

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            // Hacemos la llamada al Backend (¡Asegúrate de que la URL de auth sea esta en tu Java!)
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            if (response.ok) {
                // Si el backend nos dice OK, cogemos el Token JWT
                const data = await response.json();
                // Lo guardamos en la memoria del navegador
                localStorage.setItem('jwt_token', data.token); 
                
                // Redirigimos a la página principal
                window.location.href = 'index.html';
            } else {
                document.getElementById('loginError').classList.remove('d-none');
            }
        } catch (error) {
            console.error('Error de conexión:', error);
            alert("No s'ha pogut connectar amb el servidor. Està encès?");
        }
    });
}

// --- LÓGICA DE NAVEGACIÓN (Saber si estamos logueados) ---
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('jwt_token');
    const loginBtn = document.getElementById('loginBtn');
    const reservationsBtn = document.getElementById('reservationsBtn');

    // Si estamos en el index y tenemos token, cambiamos el botón de Login por el de Reservas
    if (token && loginBtn && reservationsBtn) {
        loginBtn.classList.add('d-none');
        reservationsBtn.classList.remove('d-none');
    }
});