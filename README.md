# 🏔️ Hostal Montsec — Reservation System API

> A full-stack reservation management system built with Spring Boot 3 and Vanilla JavaScript, featuring intelligent table auto-assignment and role-based access control.

[![Java](https://img.shields.io/badge/Java-17+-orange.svg)](https://www.oracle.com/java/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3-brightgreen.svg)](https://spring.io/projects/spring-boot)
[![Spring Security](https://img.shields.io/badge/Spring%20Security-JWT-red.svg)]()
[![Frontend](https://img.shields.io/badge/Frontend-HTML5%20%7C%20JS-blue.svg)]()
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## 📖 Overview

This project is a **full-stack reservation management system** developed for Hostal Montsec. It replaces traditional manual table selection with a smart, backend-driven allocation algorithm, ensuring maximum restaurant capacity utilization and a frictionless user experience.

Developed as a final academic project, it demonstrates the **integration of Artificial Intelligence (Gemini 3.1 Pro)** in generating the frontend, analyzing complex Java code, and connecting a secure, role-based RESTful API.

---

## ✨ Features

### 👤 Client-Facing (`ROLE_USER`)

- **Frictionless Booking**: Users only input date, time, and party size — no manual table selection required.
- **Simulated Payment Gateway**: Secure modal with visual feedback and delayed processing simulation.
- **Interactive Floor Plan**: Real-time visual map of the indoor dining room and outdoor terrace, calculating availability based on the selected time slot.
- **Smart Cancellations**: Automatic 24-hour penalty warning system before confirming a cancellation.

### 🛡️ Administrative (`ROLE_ADMIN`)

- **Global Dashboard**: Full visibility of all client reservations across the system.
- **Two-Step Deletion**: Safe cancellation process (soft-delete / status change) followed by a permanent hard-delete option.
- **Penalty Tracking**: Automatic calculation and logging of late-cancellation fees (20 €/person).

---

## 🏗 Architecture & Design Decisions

### 1. Intelligent Table Auto-Assignment

Instead of requiring the client to send a specific `tableId` (which causes race conditions and UI errors), the assignment logic lives entirely in the backend (`ReservationService`).

- Fetches all available tables and sorts them by capacity using `Comparator.comparingInt(RestaurantTable::getCapacity)`.
- Iterates through the sorted list checking time-slot availability, ensuring a party of 2 is seated at a 2-person table before occupying a 6-person table.

### 2. Stateless Authentication (JWT)

**JSON Web Tokens** provide secure, stateless API communication.

- The frontend decodes the JWT payload (`parseJwt` utility) to dynamically render UI elements — hiding or showing the Admin panel — without extra API calls.
- Spring Security intercepts every request, verifying the token signature and granting access based on `ROLE_USER` or `ROLE_ADMIN`.

### 3. Caching Strategy (Level 2)

**Spring Cache** is applied on read-heavy endpoints to minimize database hits:

- `@Cacheable("reservations")` — caches the reservation list.
- `@CacheEvict(value = "reservations", allEntries = true)` — automatically invalidates the cache on any create, update, or delete, ensuring data consistency.

### 4. Global Exception Handling

Custom business exceptions (`TableNotAvailableException`, `InvalidReservationDateException`, `ResourceNotFoundException`) ensure the frontend always receives clean, readable JSON error messages instead of raw 500 stack traces.

---

## 🛠 Tech Stack

| Category | Technologies |
|---|---|
| **Backend** | Java 17+, Spring Boot 3, Spring Security, Hibernate |
| **Database** | MySQL (Spring Data JPA) |
| **Frontend** | HTML5, CSS3, Vanilla JavaScript, Bootstrap 5 |
| **Optimization** | SLF4J (Structured Logging), Spring Cache |
| **Tools** | Maven, Git, IntelliJ IDEA |

---

## 📡 API Endpoints

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Create a new user account |
| `POST` | `/api/auth/login` | Authenticate and retrieve JWT |

### Reservations

| Method | Endpoint | Description | Role |
|---|---|---|---|
| `POST` | `/api/reservations` | Create a new auto-assigned reservation | USER |
| `GET` | `/api/reservations` | Get reservations for the logged-in user | USER |
| `GET` | `/api/reservations/all` | Get all reservations | ADMIN |
| `PUT` | `/api/reservations/{id}` | Update a reservation (date, time, party size) | USER |
| `DELETE` | `/api/reservations/{id}` | Cancel or hard-delete a reservation | USER, ADMIN |

---

## 📂 Project Structure

```
hostal-montsec/
├── frontend/
│   ├── index.html
│   ├── app.js
│   ├── reservations.html
│   ├── admin.html
│   └── (css, assets...)
└── backend/
    └── src/main/java/cat/montsec/hostal/
        ├── auth/
        │   └── controller/, service/, model/, repository/
        ├── reservation/
        │   └── controller/, service/, model/, repository/, dto/, exception/
        └── table/
            └── model/, repository/
```

---

## 🚀 Installation & Setup

### Prerequisites

- Java JDK 17+
- MySQL Server (port 3306)
- Maven 3.6+

### 1️⃣ Database Setup

```sql
CREATE DATABASE hostal_montsec;
```

### 2️⃣ Run the Backend

```bash
./mvnw spring-boot:run
```

The API will be available at: **http://localhost:8080/api**

### 3️⃣ Run the Frontend

Open the `frontend/` folder and serve `index.html` using the VS Code Live Server extension.

---

## 🤖 AI Integration Report

### 1. AI Selected — Gemini 3.1 Pro

Chosen for its massive context window, which allowed it to maintain the full context of Java controllers, services, and Vanilla JS files simultaneously — ensuring perfect synchronization between DTOs and API payloads.

### 2. Interaction Log

- **Prompting strategy**: Iterative and context-rich. Example: *"Generate a Bootstrap payment modal that delays the fetch request by 2 seconds to simulate bank authorization."*
- **Debugging**: Fed Hibernate SQL logs directly into the AI to identify and resolve complex relational database bugs (e.g., disconnected entities during table assignment).

### 3. Code Analysis & Adjustments

The raw AI-generated JavaScript was refactored to include `async/await` patterns and a robust error-catching system that reads custom backend exception messages to display user-friendly UI alerts.

### 4. Frontend–Backend Connection

Overcame CORS issues and `@NotNull` validation mismatches by redesigning the payload structure. The responsibility of calculating table availability was successfully shifted from the UI to the backend.

### 5. Learning Reflection

This project highlighted that AI is a powerful copilot, but requires a solid technical foundation from the developer to architect the solution, interpret errors, and guide the AI toward best practices — such as moving business logic entirely to the backend.

---

## 🧪 Testing

```bash
./mvnw test
```

| Layer | Tool | Scope |
|---|---|---|
| Controller | MockMvc | Endpoints, status codes, role-based access |
| Service | Mockito | Business logic, table assignment, cancellation rules |
| Integration | `@SpringBootTest` | Full reservation flow end-to-end |

---

*Criteria met: Level 1 (CRUD & Security), Level 2 (SLF4J Logging & Caching), Level 3 (Integration Testing).*
