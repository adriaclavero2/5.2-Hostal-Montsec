/**
 * HOSTAL MONTSEC - MAIN APPLICATION SCRIPT
 * Arquitectura modular limpia i desacoplada
 */

// ============================================================================
// 1. CONFIGURACIÓ I CONSTANTS
// ============================================================================
const CONFIG = {
    API_BASE_URL: 'http://localhost:8080/api',
    TOKEN_KEY: 'jwt_token',
    PENALTY_PER_PAX: 20,
    CANCELLATION_LIMIT_HOURS: 24,
    PAGE_SIZE: 10
};

// Extractor unificat d'errors del backend
const getErrorMsg = (errData, fallback) => {
    if (!errData) return fallback;
    return errData.error || errData.message || fallback;
};

// ============================================================================
// 2. UTILITATS DE VALIDACIÓ (FRONTEND SECURITY LAYER)
// ============================================================================
const Validators = {
    isEmail: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    isPhone: (phone) => /^[0-9]{9}$/.test(phone),
    isDniNie: (id) => /^([0-9]{8}[A-Za-z]|[XYZxyz][0-9]{7}[A-Za-z])$/.test(id),
    isStrongPassword: (pwd) => /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z]).{8,}$/.test(pwd),

    validarFormularioRegistro: (data) => {
        const errors = [];
        if (!data.name || data.name.trim().length < 2) errors.push("El nom és massa curt.");
        if (!data.surname || data.surname.trim().length < 2) errors.push("Els cognoms són massa curts.");
        if (!Validators.isDniNie(data.nationalId)) errors.push("El DNI/NIE introduït no té un format vàlid.");
        if (!Validators.isPhone(data.phone)) errors.push("El telèfon ha de tenir 9 dígits.");
        if (!Validators.isEmail(data.email)) errors.push("El correu electrònic no és vàlid.");
        if (!Validators.isStrongPassword(data.password)) {
            errors.push("La contrasenya ha de tenir mínim 8 caràcters, una majúscula, una minúscula i un número.");
        }
        return errors;
    }
};

// ============================================================================
// 3. GESTIÓ D'AUTENTICACIÓ I JWT
// ============================================================================
const Auth = {
    getToken: () => localStorage.getItem(CONFIG.TOKEN_KEY),
    setToken: (token) => localStorage.setItem(CONFIG.TOKEN_KEY, token),
    clearToken: () => localStorage.removeItem(CONFIG.TOKEN_KEY),

    parseJwt: (token) => {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
                window.atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
            );
            return JSON.parse(jsonPayload);
        } catch (e) {
            return null;
        }
    },

    isAdmin: () => {
        const token = Auth.getToken();
        if (!token) return false;
        const decoded = Auth.parseJwt(token);
        return decoded ? JSON.stringify(decoded).toUpperCase().includes('ADMIN') : false;
    },

    logout: () => {
        Auth.clearToken();
        window.location.href = 'index.html';
    }
};

// ============================================================================
// 4. CLIENT HTTP CENTRALITZAT (API FETCH WRAPPER)
// ============================================================================
const ApiClient = {
    request: async (endpoint, options = {}) => {
        const token = Auth.getToken();
        const headers = {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers
        };

        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, {
                ...options,
                headers
            });

            if (response.status === 401 || response.status === 403) {
                // Per a endpoints completament públics
                if ((endpoint === '/tables' || endpoint === '/cms') && options.method === 'GET') {
                    return response; 
                }
                Auth.clearToken();
                if (!window.location.pathname.includes('login.html') && !window.location.pathname.includes('index.html')) {
                    window.location.href = 'login.html';
                }
                throw new Error("Sessió caducada o no autoritzada.");
            }

            return response;
        } catch (error) {
            console.error(`[API Error] ${endpoint}:`, error);
            throw error;
        }
    }
};

// ============================================================================
// 5. MÒDUL D'AUTENTICACIÓ (LOGIN / REGISTRE)
// ============================================================================
const AuthModule = {
    init: () => {
        AuthModule.initLoginForm();
        AuthModule.initRegisterForm();
    },

    initLoginForm: () => {
        const form = document.getElementById('loginForm');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const errorDiv = document.getElementById('loginError');
            errorDiv.classList.add('d-none');

            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;

            try {
                const response = await ApiClient.request('/auth/login', {
                    method: 'POST',
                    body: JSON.stringify({ email, password })
                });

                if (response.ok) {
                    const data = await response.json();
                    const token = data.token || data.jwt || data.accessToken || (typeof data === 'string' ? data : null);

                    if (token) {
                        Auth.setToken(token);
                        window.location.href = Auth.isAdmin() ? 'admin.html' : 'index.html';
                    } else {
                        AuthModule.showError(errorDiv, "El servidor no ha retornat un testimoni (token) vàlid.");
                    }
                } else {
                    const errData = await response.json().catch(() => null);
                    AuthModule.showError(errorDiv, getErrorMsg(errData, "Correu o contrasenya incorrectes."));
                }
            } catch (err) {
                AuthModule.showError(errorDiv, "No s'ha pogut establir connexió amb el servidor.");
            }
        });
    },

    initRegisterForm: () => {
        const form = document.getElementById('registerForm');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const errorDiv = document.getElementById('registerError');
            const successDiv = document.getElementById('registerSuccess');
            errorDiv.classList.add('d-none');
            successDiv.classList.add('d-none');

            const payload = {
                name: document.getElementById('regName').value.trim(),
                surname: document.getElementById('regSurname').value.trim(),
                nationalId: document.getElementById('regDni').value.trim().toUpperCase(),
                phone: document.getElementById('regPhone').value.trim(),
                city: document.getElementById('regCity').value.trim(),
                email: document.getElementById('regEmail').value.trim(),
                password: document.getElementById('regPassword').value
            };

            const validationErrors = Validators.validarFormularioRegistro(payload);
            if (validationErrors.length > 0) {
                AuthModule.showError(errorDiv, validationErrors.join('<br>'));
                return;
            }

            try {
                const response = await ApiClient.request('/auth/register', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    successDiv.classList.remove('d-none');
                    form.reset();
                    setTimeout(() => window.location.href = 'login.html', 2000);
                } else {
                    const errData = await response.json().catch(() => null);
                    AuthModule.showError(errorDiv, getErrorMsg(errData, "Revisa les dades o el correu ja està registrat."));
                }
            } catch (err) {
                AuthModule.showError(errorDiv, "Error de connexió amb el servidor.");
            }
        });
    },

    showError: (element, message) => {
        element.innerHTML = `<i class="bi bi-exclamation-triangle-fill me-2"></i><span>${message}</span>`;
        element.classList.remove('d-none');
    }
};

// ============================================================================
// 6. MÒDUL DE RESERVES I TAULES (CLIENT & ADMIN)
// ============================================================================
const ReservationModule = {
    tempReservationData: null,
    currentUserPage: 0,
    currentAdminPage: 0,

    init: () => {
        ReservationModule.initNewReservationWorkflow();
        ReservationModule.initTableMap();

        if (window.location.pathname.includes('reservations.html') || window.location.pathname.includes('reservas.html')) {
            ReservationModule.loadUserReservations();
        }
        if (window.location.pathname.includes('admin.html')) {
            ReservationModule.loadAdminReservations();
        }
    },

    initNewReservationWorkflow: () => {
        const resForm = document.getElementById('newReservationForm');
        const payForm = document.getElementById('paymentForm');

        if (resForm) {
            resForm.addEventListener('submit', (e) => {
                e.preventDefault();
                ReservationModule.tempReservationData = {
                    reservationDate: document.getElementById('resDate').value,
                    reservationTime: document.getElementById('resTime').value,
                    numberOfPeople: parseInt(document.getElementById('resPax').value, 10)
                };

                const penalty = ReservationModule.tempReservationData.numberOfPeople * CONFIG.PENALTY_PER_PAX;
                document.getElementById('penaltyAmount').innerText = penalty;

                bootstrap.Modal.getInstance(document.getElementById('nuevaReservaModal'))?.hide();
                new bootstrap.Modal(document.getElementById('paymentModal')).show();
            });
        }

        if (payForm) {
            payForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await ReservationModule.processPaymentAndReserve();
            });
        }
    },

    processPaymentAndReserve: async () => {
        const errorDiv = document.getElementById('reservaError');
        const successDiv = document.getElementById('reservaSuccess');
        const payBtn = document.getElementById('payBtn');
        const payBtnText = document.getElementById('payBtnText');
        const payBtnSpinner = document.getElementById('payBtnSpinner');

        errorDiv.classList.add('d-none');
        successDiv.classList.add('d-none');
        payBtn.disabled = true;
        payBtnText.innerText = "Processant pagament...";
        payBtnSpinner.classList.remove('d-none');

        try {
            const response = await ApiClient.request('/reservations', {
                method: 'POST',
                body: JSON.stringify(ReservationModule.tempReservationData)
            });

            if (response.ok) {
                successDiv.classList.remove('d-none');
                setTimeout(() => {
                    bootstrap.Modal.getInstance(document.getElementById('paymentModal'))?.hide();
                    document.getElementById('newReservationForm')?.reset();
                    document.getElementById('paymentForm')?.reset();
                    successDiv.classList.add('d-none');
                    ReservationModule.resetUserPage(); 
                }, 1500);
            } else {
                const errData = await response.json().catch(() => null);
                errorDiv.innerHTML = `<i class="bi bi-exclamation-circle me-1"></i> ${getErrorMsg(errData, "No s'ha pogut completar la reserva.")}`;
                errorDiv.classList.remove('d-none');
            }
        } catch (error) {
            errorDiv.innerHTML = `<i class="bi bi-wifi-off me-1"></i> Error de connexió amb el servidor.`;
            errorDiv.classList.remove('d-none');
        } finally {
            payBtn.disabled = false;
            payBtnText.innerHTML = '<i class="bi bi-shield-check"></i> Autoritzar i Reservar';
            payBtnSpinner.classList.add('d-none');
        }
    },

    resetUserPage: () => {
        ReservationModule.currentUserPage = 0;
        ReservationModule.loadUserReservations();
    },

    changeUserPage: (delta) => {
        ReservationModule.currentUserPage += delta;
        ReservationModule.loadUserReservations();
    },

    loadUserReservations: async () => {
        const container = document.getElementById('listaReservas');
        if (!container) return;

        const statusFilter = document.getElementById('userStatusFilter')?.value || '';
        const url = `/reservations?page=${ReservationModule.currentUserPage}&size=${CONFIG.PAGE_SIZE}${statusFilter ? '&status=' + statusFilter : ''}`;

        try {
            const response = await ApiClient.request(url, { method: 'GET' });
            const pageData = await response.json();
            
            ReservationModule.renderTable(pageData.content, container, false);
            ReservationModule.updatePaginationUI('user', pageData);
        } catch (e) {
            container.innerHTML = `<div class="alert alert-danger m-3">Error carregant les reserves.</div>`;
        }
    },

    resetAdminPage: () => {
        ReservationModule.currentAdminPage = 0;
        ReservationModule.loadAdminReservations();
    },

    changeAdminPage: (delta) => {
        ReservationModule.currentAdminPage += delta;
        ReservationModule.loadAdminReservations();
    },

    loadAdminReservations: async () => {
        const container = document.getElementById('adminReservasContainer');
        if (!container) return;

        const statusFilter = document.getElementById('adminStatusFilter')?.value || '';
        const url = `/reservations/all?page=${ReservationModule.currentAdminPage}&size=${CONFIG.PAGE_SIZE}${statusFilter ? '&status=' + statusFilter : ''}`;

        try {
            const response = await ApiClient.request(url, { method: 'GET' });
            const pageData = await response.json();
            
            ReservationModule.renderTable(pageData.content, container, true);
            ReservationModule.updatePaginationUI('admin', pageData);
        } catch (e) {
            container.innerHTML = `<div class="alert alert-danger m-3">Error carregant el panell d'administració.</div>`;
        }
    },

    updatePaginationUI: (type, pageData) => {
        const prefix = type === 'admin' ? 'adminRes' : 'userRes';
        
        const infoSpan = document.getElementById(`${prefix}PageInfo`);
        const prevBtn = document.getElementById(`${prefix}PrevBtn`);
        const nextBtn = document.getElementById(`${prefix}NextBtn`);

        if(infoSpan) infoSpan.innerText = `Pàgina ${pageData.number + 1} de ${pageData.totalPages || 1} (Total: ${pageData.totalElements})`;
        if(prevBtn) prevBtn.disabled = pageData.first;
        if(nextBtn) nextBtn.disabled = pageData.last;
    },

    renderTable: (reservations, container, esAdmin) => {
        if (!reservations || reservations.length === 0) {
            container.innerHTML = `<div class="alert alert-info shadow-sm m-3"><i class="bi bi-info-circle me-2"></i> No s'han trobat reserves amb els filtres actuals.</div>`;
            return;
        }

        const rowsHtml = reservations.map(res => {
            const statusBadge = {
                'CONFIRMED': 'bg-success',
                'CANCELLED': 'bg-danger',
                'PENDING': 'bg-warning text-dark'
            }[res.status] || 'bg-secondary';

            const nomClient = res.userName ? `${res.userName} ${res.userSurname || ''}` : 'Desconegut';
            const clientCell = esAdmin 
                ? `<td><strong>${nomClient}</strong></td><td><small><i class="bi bi-envelope-fill text-muted"></i> ${res.userEmail || 'N/A'}<br><i class="bi bi-telephone-fill text-muted"></i> ${res.userPhone || 'N/A'}</small></td>`
                : '';

            const isCancelled = res.status === 'CANCELLED';
            
            const editBtn = esAdmin
                ? `<button class="btn btn-sm btn-outline-dark me-1" title="Editar reserva" onclick="AdminModule.openEditReservationModal(${res.id}, '${res.reservationDate}', '${res.reservationTime}', ${res.numberOfPeople})"><i class="bi bi-pencil-square"></i></button>`
                : '';

            const cancelBtn = isCancelled
                ? `<button class="btn btn-sm btn-danger" title="Esborrar de la BD" onclick="ReservationModule.cancelReservation(${res.id}, '${res.reservationDate}', '${res.reservationTime}', ${res.numberOfPeople}, true)"><i class="bi bi-x-octagon"></i> Esborrar</button>`
                : `<button class="btn btn-sm btn-outline-danger" title="Anul·lar reserva" onclick="ReservationModule.cancelReservation(${res.id}, '${res.reservationDate}', '${res.reservationTime}', ${res.numberOfPeople}, false)"><i class="bi bi-trash3"></i> Anul·lar</button>`;

            return `
                <tr>
                    <td class="text-muted">#${res.id}</td>
                    ${clientCell}
                    <td>${res.reservationDate}</td>
                    <td>${res.reservationTime}</td>
                    <td><span class="badge rounded-pill bg-light text-dark border">${res.numberOfPeople}</span></td>
                    <td>T-${res.tableId || res.tableNumber || 'Auto'}</td>
                    <td><span class="badge ${statusBadge}">${res.status || 'PENDING'}</span></td>
                    <td class="text-center text-nowrap">${editBtn}${cancelBtn}</td>
                </tr>`;
        }).join('');

        container.innerHTML = `
            <div class="table-responsive m-0">
                <table class="table table-hover align-middle bg-white m-0">
                    <thead class="table-dark">
                        <tr>
                            <th>ID</th>
                            ${esAdmin ? '<th>Client</th><th>Contacte</th>' : ''}
                            <th>Data</th><th>Hora</th><th>Pax</th><th>Taula</th><th>Estat</th>
                            <th class="text-center">Accions</th>
                        </tr>
                    </thead>
                    <tbody>${rowsHtml}</tbody>
                </table>
            </div>`;
    },

    cancelReservation: async (id, dateStr, timeStr, pax, isAlreadyCancelled) => {
        let confirmMsg = isAlreadyCancelled 
            ? `Vols esborrar DEFINITIVAMENT la reserva #${id} de la base de dades?`
            : ReservationModule.getCancelWarningMessage(id, dateStr, timeStr, pax);

        if (!confirm(confirmMsg)) return;

        try {
            const response = await ApiClient.request(`/reservations/${id}`, { method: 'DELETE' });
            if (response.ok || response.status === 204) {
                alert(isAlreadyCancelled ? "Reserva esborrada correctament." : "Reserva anul·lada. Reemborsament tramitat.");
                if (document.getElementById('adminReservasContainer')) ReservationModule.loadAdminReservations();
                else ReservationModule.loadUserReservations();
            } else {
                const errData = await response.json().catch(() => null);
                alert(getErrorMsg(errData, "No s'ha pogut modificar la reserva."));
            }
        } catch (e) {
            alert("Error de connexió.");
        }
    },

    getCancelWarningMessage: (id, dateStr, timeStr, pax) => {
        const resDate = new Date(`${dateStr}T${timeStr}`);
        const diffHours = (resDate - new Date()) / (1000 * 60 * 60);

        if (diffHours > 0 && diffHours < CONFIG.CANCELLATION_LIMIT_HOURS) {
            const penalty = pax * CONFIG.PENALTY_PER_PAX;
            return `ATENCIÓ: Faltan menys de 24h per a la reserva!\n\nS'aplicarà una penalització de ${penalty}€.\n\nVols continuar amb l'anul·lació de la reserva #${id}?`;
        }
        return `Estàs segur que vols anul·lar la reserva #${id}?\n\nS'emetrà el reemborsament complet sense cap penalització.`;
    },

    initTableMap: async () => {
        const mapaContenedor = document.getElementById('mapaMesas');
        if (!mapaContenedor) return;

        const mapTime = document.getElementById('mapTime');
        const horaSeleccionada = mapTime?.value || 'Ara';

        try {
            let fetchOptions = { headers: { 'Content-Type': 'application/json' } };
            if (Auth.getToken()) {
                fetchOptions.headers['Authorization'] = `Bearer ${Auth.getToken()}`;
            }

            const response = await fetch(`${CONFIG.API_BASE_URL}/tables`, fetchOptions);
            
            if (!response.ok) {
                mapaContenedor.innerHTML = `<div class="alert alert-warning m-3 text-center">Inicia sessió per veure el mapa de taules.</div>`;
                return;
            }

            const tables = await response.json();

            if (!tables || tables.length === 0) {
                mapaContenedor.innerHTML = `<div class="alert alert-info m-3 text-center">Encara no hi ha taules creades.</div>`;
                return;
            }

            const interiorTables = tables.filter(t => t.location === 'INSIDE' || t.location === 'INTERIOR');
            const terraceTables = tables.filter(t => t.location === 'TERRACE' || t.location === 'TERRAZA');

            let htmlMapa = `
                <div class="zona-interior p-4 mb-5 shadow-sm">
                    <h4 class="text-secondary border-bottom pb-2 mb-4"><i class="bi bi-house-door-fill text-dark"></i> Saló Interior</h4>
                    <div class="mapa-grid">
                        ${interiorTables.map(t => ReservationModule.generateTableHtml(t, horaSeleccionada)).join('')}
                    </div>
                </div>
                <div class="zona-terraza p-4 shadow-sm">
                    <h4 class="text-secondary border-bottom pb-2 mb-4" style="color: #8b4513 !important;"><i class="bi bi-sun-fill text-warning"></i> Terrassa Exterior</h4>
                    <div class="mapa-grid">
                        ${terraceTables.map(t => ReservationModule.generateTableHtml(t, horaSeleccionada)).join('')}
                    </div>
                </div>`;

            mapaContenedor.innerHTML = htmlMapa;
        } catch (error) {
            mapaContenedor.innerHTML = `<div class="alert alert-danger m-3 text-center">Error en connectar amb el servidor de taules.</div>`;
        }
    },

    generateTableHtml: (table, horaSeleccionada) => {
        const estaDisponible = Math.random() > 0.4;
        const claseEstado = estaDisponible ? 'disponible' : 'ocupada';
        const iconoEstado = estaDisponible 
            ? '✓ Lliure' 
            : `✕ Ocupada<br><small style="font-size:0.65rem; color:#ffd0d0;">(Les ${horaSeleccionada})</small>`;

        let classSize = 'taula-4';
        if (table.capacity <= 2) classSize = 'taula-2';
        else if (table.capacity >= 6) classSize = 'taula-6';

        return `
            <div class="taula-plano ${classSize} ${claseEstado}" title="Taula ${table.tableNumber} - Capacitat: ${table.capacity} pax">
                <span class="taula-numero">T-${table.tableNumber}</span>
                <span class="taula-pax"><i class="bi bi-people-fill"></i> ${table.capacity} pax</span>
                <span class="text-center" style="font-size: 0.75rem; margin-top: 5px;">${iconoEstado}</span>
            </div>`;
    }
};

// ============================================================================
// 7. MÒDUL D'ADMINISTRACIÓ (CLIENTS, RESERVES I TAULES)
// ============================================================================
const AdminModule = {
    loadAllUsers: async () => {
        const container = document.getElementById('adminClientsContainer');
        if (!container) return;

        try {
            const response = await ApiClient.request('/users', { method: 'GET' });
            const users = await response.json();
            AdminModule.renderUsersTable(users, container);
        } catch (error) {
            container.innerHTML = `<div class="alert alert-danger m-3">Error en carregar els usuaris del sistema.</div>`;
        }
    },

    renderUsersTable: (users, container) => {
        if (!users || users.length === 0) {
            container.innerHTML = `<div class="alert alert-info m-3">No hi ha clients registrats en el sistema.</div>`;
            return;
        }

        const rowsHtml = users.map(user => {
            const roleBadge = user.role.toUpperCase().includes('ADMIN')
                ? `<span class="badge bg-danger">ADMIN</span>`
                : `<span class="badge bg-secondary">USER</span>`;

            return `
                <tr>
                    <td class="text-muted">#${user.id}</td>
                    <td><strong>${user.name} ${user.surname}</strong></td>
                    <td><small>${user.email}</small></td>
                    <td>${user.phone}</td>
                    <td>${user.city}</td>
                    <td>${user.nationalId}</td>
                    <td>${roleBadge}</td>
                    <td class="text-center text-nowrap">
                        <button class="btn btn-sm btn-outline-dark me-1" title="Editar client" onclick="AdminModule.openEditUserModal(${user.id}, '${user.name}', '${user.surname}', '${user.phone}', '${user.city}', '${user.role}')">
                            <i class="bi bi-pencil-square"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" title="Eliminar client" onclick="AdminModule.deleteUser(${user.id}, '${user.name}')">
                            <i class="bi bi-trash3"></i>
                        </button>
                    </td>
                </tr>`;
        }).join('');

        container.innerHTML = `
            <div class="table-responsive m-0">
                <table class="table table-hover align-middle bg-white m-0">
                    <thead class="table-dark">
                        <tr>
                            <th>ID</th><th>Client</th><th>Email</th><th>Telèfon</th><th>Població</th><th>DNI/NIE</th><th>Rol</th><th class="text-center">Accions</th>
                        </tr>
                    </thead>
                    <tbody>${rowsHtml}</tbody>
                </table>
            </div>`;
    },

    openEditUserModal: (id, name, surname, phone, city, role) => {
        document.getElementById('editUserId').value = id;
        document.getElementById('editUserName').value = name;
        document.getElementById('editUserSurname').value = surname;
        document.getElementById('editUserPhone').value = phone;
        document.getElementById('editUserCity').value = city;
        document.getElementById('editUserRole').value = role;

        new bootstrap.Modal(document.getElementById('editUserModal')).show();
    },

    updateUser: async (e) => {
        e.preventDefault();
        const id = document.getElementById('editUserId').value;
        const payload = {
            name: document.getElementById('editUserName').value.trim(),
            surname: document.getElementById('editUserSurname').value.trim(),
            phone: document.getElementById('editUserPhone').value.trim(),
            city: document.getElementById('editUserCity').value.trim(),
            role: document.getElementById('editUserRole').value
        };

        try {
            const response = await ApiClient.request(`/users/${id}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                bootstrap.Modal.getInstance(document.getElementById('editUserModal'))?.hide();
                AdminModule.loadAllUsers();
            } else {
                const errData = await response.json().catch(() => null);
                alert(getErrorMsg(errData, "No s'ha pogut actualitzar el client."));
            }
        } catch (error) {
            alert("Error de connexió.");
        }
    },

    deleteUser: async (id, name) => {
        if (!confirm(`Estàs segur que vols eliminar definitivament el client "${name}" (ID #${id})? Aquesta acció no es pot desfer.`)) return;

        try {
            const response = await ApiClient.request(`/users/${id}`, { method: 'DELETE' });
            if (response.ok || response.status === 204) {
                AdminModule.loadAllUsers();
            } else {
                const errData = await response.json().catch(() => null);
                alert(getErrorMsg(errData, "Error en esborrar el client."));
            }
        } catch (error) {
            alert("Error de connexió al servidor.");
        }
    },

    openEditReservationModal: (id, dateStr, timeStr, pax) => {
        document.getElementById('editResId').value = id;
        document.getElementById('editResIdTxt').innerText = id;
        document.getElementById('editResDate').value = dateStr;
        
        const formattedTime = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
        document.getElementById('editResTime').value = formattedTime;
        document.getElementById('editResPax').value = pax;

        new bootstrap.Modal(document.getElementById('editReservationModal')).show();
    },

    updateReservation: async (e) => {
        e.preventDefault();
        const id = document.getElementById('editResId').value;
        const payload = {
            reservationDate: document.getElementById('editResDate').value,
            reservationTime: document.getElementById('editResTime').value,
            numberOfPeople: parseInt(document.getElementById('editResPax').value, 10)
        };

        try {
            const response = await ApiClient.request(`/reservations/${id}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                bootstrap.Modal.getInstance(document.getElementById('editReservationModal'))?.hide();
                ReservationModule.loadAdminReservations();
            } else {
                const errData = await response.json().catch(() => null);
                alert(getErrorMsg(errData, "No s'ha pogut modificar la reserva."));
            }
        } catch (error) {
            alert("Error de connexió en modificar la reserva.");
        }
    },

    loadAllTables: async () => {
        const container = document.getElementById('adminTablesContainer');
        if (!container) return;

        try {
            const response = await ApiClient.request('/tables', { method: 'GET' });
            const tables = await response.json();
            AdminModule.renderTablesTable(tables, container);
        } catch (error) {
            container.innerHTML = `<div class="alert alert-danger m-3">Error en carregar les taules del sistema.</div>`;
        }
    },

    renderTablesTable: (tables, container) => {
        if (!tables || tables.length === 0) {
            container.innerHTML = `<div class="alert alert-info m-3">No hi ha taules registrades. Clica a 'Nova Taula' per començar.</div>`;
            return;
        }

        tables.sort((a, b) => a.tableNumber - b.tableNumber);

        const rowsHtml = tables.map(t => {
            const locBadge = t.location === 'INSIDE' || t.location === 'INTERIOR'
                ? `<span class="badge bg-secondary"><i class="bi bi-house-door-fill"></i> Interior</span>`
                : `<span class="badge" style="background-color: #d2b48c; color: #5a3c18;"><i class="bi bi-sun-fill"></i> Terraza</span>`;

            return `
                <tr>
                    <td class="text-muted">#${t.id}</td>
                    <td><strong>Taula ${t.tableNumber}</strong></td>
                    <td>${t.capacity} persones</td>
                    <td>${locBadge}</td>
                    <td class="text-center text-nowrap">
                        <button class="btn btn-sm btn-outline-dark me-1" title="Editar taula" onclick="AdminModule.openTableModal(${t.id}, ${t.tableNumber}, ${t.capacity}, '${t.location}')">
                            <i class="bi bi-pencil-square"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" title="Eliminar taula" onclick="AdminModule.deleteTable(${t.id}, ${t.tableNumber})">
                            <i class="bi bi-trash3"></i>
                        </button>
                    </td>
                </tr>`;
        }).join('');

        container.innerHTML = `
            <div class="table-responsive m-0">
                <table class="table table-hover align-middle bg-white m-0">
                    <thead class="table-dark">
                        <tr>
                            <th>ID</th><th>Número</th><th>Capacitat</th><th>Ubicació</th><th class="text-center">Accions</th>
                        </tr>
                    </thead>
                    <tbody>${rowsHtml}</tbody>
                </table>
            </div>`;
    },

    openTableModal: (id = null, num = '', pax = '', loc = 'INSIDE') => {
        document.getElementById('editTableId').value = id || '';
        document.getElementById('editTableNum').value = num;
        document.getElementById('editTablePax').value = pax;
        
        const locSelect = document.getElementById('editTableLoc');
        if(loc === 'TERRACE' || loc === 'TERRAZA') locSelect.value = 'TERRACE';
        else locSelect.value = 'INSIDE';

        document.getElementById('tableModalTitle').innerText = id ? 'Modificar Taula' : 'Nova Taula';
        new bootstrap.Modal(document.getElementById('editTableModal')).show();
    },

    saveTable: async (e) => {
        e.preventDefault();
        const id = document.getElementById('editTableId').value;
        const payload = {
            tableNumber: parseInt(document.getElementById('editTableNum').value, 10),
            capacity: parseInt(document.getElementById('editTablePax').value, 10),
            location: document.getElementById('editTableLoc').value
        };

        const method = id ? 'PUT' : 'POST';
        const url = id ? `/tables/${id}` : '/tables';

        try {
            const response = await ApiClient.request(url, {
                method: method,
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                bootstrap.Modal.getInstance(document.getElementById('editTableModal'))?.hide();
                AdminModule.loadAllTables();
                ReservationModule.initTableMap(); 
            } else {
                const errData = await response.json().catch(() => null);
                alert(`No s'ha pogut desar la taula:\n\n${getErrorMsg(errData, 'Revisa les dades d\'entrada.')}`);
            }
        } catch (error) {
            alert("Error de connexió.");
        }
    },

    deleteTable: async (id, tableNum) => {
        if (!confirm(`Estàs segur que vols eliminar la Taula ${tableNum}?`)) return;

        try {
            const response = await ApiClient.request(`/tables/${id}`, { method: 'DELETE' });
            if (response.ok || response.status === 204) {
                AdminModule.loadAllTables();
                ReservationModule.initTableMap();
            } else {
                const errData = await response.json().catch(() => null);
                alert(`Error en esborrar la taula:\n\n${getErrorMsg(errData, 'Error desconegut.')}`);
            }
        } catch (error) {
            alert("Error de connexió al servidor.");
        }
    }
};

// ============================================================================
// 8. MÒDUL WEB CMS (GESTOR DE CONTINGUT DINÀMIC)
// ============================================================================
const CmsModule = {
    init: () => {
        // En carregar la pàgina principal, descarreguem tots els textos del CMS
        if (window.location.pathname.includes('index.html') || window.location.pathname === '/' || window.location.pathname === '') {
            CmsModule.loadPublicContent();
        }

        // Listener pel formulari de l'administrador
        const cmsForm = document.getElementById('cmsForm');
        if (cmsForm) {
            cmsForm.addEventListener('submit', CmsModule.saveContent);
        }
    },

    loadPublicContent: async () => {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/cms`);
            if (response.ok) {
                const configs = await response.json();
                
                // Apliquem la màgia: si és text, posem innerText. Si és imatge, canviem el src.
                Object.keys(configs).forEach(key => {
                    const el = document.getElementById(`cms_${key}`);
                    if (el) {
                        if (el.tagName === 'IMG') {
                            el.src = configs[key];
                        } else {
                            el.innerText = configs[key];
                        }
                    }
                });
            }
        } catch (e) {
            console.warn("Avís: Carregant textos locals per defecte (El backend CMS no respon).");
        }
    },

    loadAdminContent: async () => {
        try {
            const response = await ApiClient.request('/cms', { method: 'GET' });
            if (response.ok) {
                const configs = await response.json();
                
                // Omplim els inputs automàticament
                Object.keys(configs).forEach(key => {
                    const input = document.getElementById(`edit_${key}`);
                    if (input) {
                        input.value = configs[key];
                    }
                });
            }
        } catch (e) {
            console.error("Error carregant les dades del CMS al panell d'admin.");
        }
    },

    saveContent: async (e) => {
        e.preventDefault();
        
        const alertBox = document.getElementById('cmsAlert');
        alertBox.className = 'alert alert-info';
        alertBox.innerText = 'Desant canvis...';
        alertBox.classList.remove('d-none');

        // MÀGIA SENIOR: Llegim dinàmicament TOTS els inputs amb classe 'cms-input'
        const payload = {};
        document.querySelectorAll('.cms-input').forEach(input => {
            const key = input.id.replace('edit_', ''); // Traiem el prefix
            payload[key] = input.value.trim();
        });

        try {
            const response = await ApiClient.request('/cms', {
                method: 'PUT',
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                alertBox.className = 'alert alert-success';
                alertBox.innerHTML = '<i class="bi bi-check-circle-fill me-2"></i> Canvis desats correctament! Ves a la web per veure\'ls.';
            } else {
                alertBox.className = 'alert alert-danger';
                alertBox.innerText = 'Error al desar els canvis.';
            }
        } catch (error) {
            alertBox.className = 'alert alert-danger';
            alertBox.innerText = 'Error de connexió al servidor CMS.';
        }
    }
};

// ============================================================================
// 9. ARRENCADA PRINCIPAL (ENTRY POINT)
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    // ... (Mantén todo el código que ya tenías aquí: auth, logout, mapDate...)
    
    // Y asegúrate de tener estas tres líneas al final del todo:
    AuthModule.init();
    ReservationModule.init();
    CmsModule.init();
});