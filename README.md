# 🏔️ Hostal Montsec — Full-Stack Reservation & CMS Platform

> A full-stack restaurant reservation and dynamic Content Management System (CMS) built with Spring Boot 3 and Vanilla JavaScript, featuring intelligent table auto-assignment, real-time floor plan mapping, and role-based access control.

[![Java](https://img.shields.io/badge/Java-21+-orange.svg)](https://www.oracle.com/java/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3-brightgreen.svg)](https://spring.io/projects/spring-boot)
[![Spring Security](https://img.shields.io/badge/Spring%20Security-JWT-red.svg)]()
[![Frontend](https://img.shields.io/badge/Frontend-HTML5%20%7C%20JS%20%7C%20Bootstrap%205-blue.svg)]()
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## 📖 Overview

This project is a **comprehensive full-stack management platform** developed for Hostal Montsec. It replaces traditional manual table selection with a smart, backend-driven allocation algorithm to maximize restaurant capacity, while providing administrators with a built-in **Dynamic CMS** to update website content, pricing, and imagery in real time without touching a single line of code.

Developed as a final capstone project, it demonstrates clean **Monorepo architecture**, **RESTful API design**, and the strategic integration of **Artificial Intelligence (Gemini 3.1 Pro)** in full-stack development and complex debugging.

---

## 🎥 Live Demo

> **🎬 Watch the full platform walkthrough below (Client Booking Flow + Admin Dashboard & Live CMS Editing):**

<!-- 👇 ARRASTRA TU ARCHIVO .MP4 AQUÍ DESDE EL EDITOR WEB DE GITHUB 👇 -->
https://github.com/user-attachments/assets/placeholder-video-url

---

## ✨ Features

### 👤 Client-Facing (`ROLE_USER`)

- **Frictionless Booking**: Users only input date, time, and party size — the backend automatically assigns the optimal table.
- **Dynamic Landing Page**: Hero titles, restaurant history, menu prices, and dish photography are fetched dynamically from the CMS API on page load.
- **Interactive Floor Plan**: Real-time visual map of the indoor dining room (`INSIDE`) and outdoor terrace (`TERRACE`), calculating availability dynamically per time slot.
- **Simulated Payment Gateway**: Secure modal with visual feedback and delayed bank authorization simulation.
- **Smart Cancellations**: Automatic 24-hour penalty warning system before confirming a cancellation.

### 🛡️ Administrative (`ROLE_ADMIN`)

- **Built-in Dynamic CMS**: Live control panel allowing administrators to modify website copy, menu descriptions, pricing, and external image URLs in real time.
- **Interactive Table Management (CRUD)**: Create, edit, or remove restaurant tables dynamically, defining capacities and zone allocations (`INSIDE` / `TERRACE`).
- **User Directory Management**: View registered clients, inspect roles, and manage user accounts directly from the dashboard.
- **Global Reservation Dashboard**: Full visibility of all client bookings across the system with two-step cancellation/deletion (soft-delete status change followed by permanent hard-delete) and late-cancellation fee tracking (20 €/person).

---

## 🏗 Architecture & Design Decisions

### 1. Intelligent Table Auto-Assignment

Instead of requiring the client to send a specific `tableId` (which causes race conditions and UI errors), the assignment logic lives entirely in the backend (`ReservationService`).

- Fetches all available tables and sorts them by capacity using `Comparator.comparingInt(RestaurantTable::getCapacity)`.
- Iterates through the sorted list checking time-slot availability, ensuring a party of 2 is seated at a 2-person table before occupying a 6-person table.

### 2. Key-Value Dynamic CMS with Auto-Seeding

To avoid rigid database schemas for website content, the `cms` package implements a flexible key-value architecture (`SiteConfig`).

- **Zero-Config Initialization**: A `@PostConstruct` initializer in `SiteConfigService` automatically seeds default texts, menu prices, and gallery images if the database is empty upon startup.
- **Batch Updates**: Administrators can update multiple configuration keys simultaneously via a single `PUT /api/cms` payload.

### 3. Stateless Authentication (JWT)

**JSON Web Tokens** provide secure, stateless API communication.

- The frontend decodes the JWT payload (`parseJwt` utility) to dynamically render UI elements — unlocking the Admin Dashboard — without extra API calls.
- Spring Security intercepts every request, verifying the token signature and enforcing endpoint-level authorization (`ROLE_USER` vs `ROLE_ADMIN`), while allowing public `GET` access to CMS content for anonymous visitors.

### 4. Caching Strategy (Level 2)

**Spring Cache** is applied on read-heavy endpoints to minimize database hits:

- `@Cacheable("reservations")` — caches the reservation list.
- `@CacheEvict(value = "reservations", allEntries = true)` — automatically invalidates the cache on any create, update, or delete, ensuring strict data consistency.

### 5. Centralized Global Exception Handling

A dedicated `GlobalExceptionHandler` (`@RestControllerAdvice`) intercepts custom business exceptions (`TableNotAvailableException`, `InvalidReservationDateException`, `ResourceNotFoundException`) and validation errors, ensuring the frontend always receives standardized, human-readable JSON responses instead of raw 500 stack traces.

---

## 🛠 Tech Stack

| Category | Technologies |
|---|---|
| **Backend** | Java 21, Spring Boot 3, Spring Security (JWT), Hibernate |
| **Database** | MySQL / H2 (Spring Data JPA) |
| **Frontend** | HTML5, CSS3, Vanilla JavaScript (ES6+), Bootstrap 5 |
| **Optimization** | SLF4J (Structured Logging), Spring Cache |
| **Tools** | Maven, Git, IntelliJ IDEA, VS Code |

---

## 📡 API Endpoints

### Authentication & Users

| Method | Endpoint | Description | Role |
|---|---|---|---|
| `POST` | `/api/auth/register` | Create a new user account | PUBLIC |
| `POST` | `/api/auth/login` | Authenticate and retrieve JWT | PUBLIC |
| `GET` | `/api/users` | Retrieve all registered users | ADMIN |
| `DELETE` | `/api/users/{id}` | Delete a user account | ADMIN |

### Reservations

| Method | Endpoint | Description | Role |
|---|---|---|---|
| `POST` | `/api/reservations` | Create a new auto-assigned reservation | USER |
| `GET` | `/api/reservations` | Get reservations for the logged-in user | USER |
| `GET` | `/api/reservations/all` | Get all system reservations | ADMIN |
| `PUT` | `/api/reservations/{id}` | Update reservation (date, time, party size) | USER |
| `DELETE` | `/api/reservations/{id}` | Cancel or hard-delete a reservation | USER, ADMIN |

### Tables & Floor Plan

| Method | Endpoint | Description | Role |
|---|---|---|---|
| `GET` | `/api/tables` | Get all tables and zone locations (`INSIDE`/`TERRACE`) | AUTHENTICATED |
| `POST` | `/api/tables` | Create a new restaurant table | ADMIN |
| `PUT` | `/api/tables/{id}` | Update table capacity or zone | ADMIN |
| `DELETE` | `/api/tables/{id}` | Remove a table from the system | ADMIN |

### Dynamic CMS

| Method | Endpoint | Description | Role |
|---|---|---|---|
| `GET` | `/api/cms` | Fetch all website texts, prices, and image URLs | PUBLIC |
| `PUT` | `/api/cms` | Batch-update website configuration keys | ADMIN |

---

## 📂 Project Structure (Monorepo)

```text
Hostal-Montsec/
├── frontend/
│   ├── index.html          # Public landing page & dynamic CMS rendering
│   ├── admin.html          # Admin dashboard (Reservations, Tables, Users & CMS)
│   ├── reservations.html   # Client booking & interactive floor plan
│   ├── app.js              # Centralized HTTP client, JWT auth & DOM logic
│   └── styles.css          # Custom styling
├── src/main/java/cat/montsec/hostal/
│   ├── auth/               # Auth & User controllers, services, DTOs, repositories
│   ├── cms/                # Dynamic CMS module (SiteConfig entity, service, controller)
│   ├── exception/          # GlobalExceptionHandler & custom business exceptions
│   ├── reservation/        # Reservation CRUD & smart auto-assignment logic
│   ├── security/           # Spring Security filter chain & JWT filters
│   └── table/              # Table CRUD, DTOs & location enums (INSIDE / TERRACE)
└── pom.xml
```

---

## 🚀 Installation & Setup

### Prerequisites

- Java JDK 21+
- MySQL Server (port 3306)
- Maven 3.8+

### 1️⃣ Database Setup

```sql
CREATE DATABASE hostal_montsec;
```

### 2️⃣ Run the Backend

```bash
./mvnw spring-boot:run
```

The API will be available at: **http://localhost:8080/api** *(Default CMS content and initial data will seed automatically on startup).*

### 3️⃣ Run the Frontend

Open the `frontend/` directory in VS Code and serve `index.html` using the **Live Server** extension.

---

## 🤖 AI Integration Report

### 1. AI Selected — Gemini 3.1 Pro

Chosen for its massive context window, which allowed it to maintain the full context of Java controllers, services, and Vanilla JS files simultaneously — ensuring strict synchronization between backend DTOs, enums, and frontend API payloads.

### 2. Interaction Log

- **Prompting strategy**: Iterative and architecture-driven. Used to design the key-value CMS module and align frontend floor-plan rendering with backend `INSIDE`/`TERRACE` enums.
- **Debugging**: Fed Hibernate SQL logs and HTTP status traces directly into the AI to diagnose and resolve relational constraints and CORS/security filter mismatches.

### 3. Code Analysis & Adjustments

Refactored the frontend HTTP client (`app.js`) to gracefully handle empty or non-JSON responses, and centralized backend exception handling in `GlobalExceptionHandler` so business rule violations display clean, user-friendly alerts in the UI.

### 4. Frontend–Backend Connection

Overcame CORS issues, enum serialization mismatches, and `@NotNull` validation errors by standardizing REST payloads. Shifted table availability calculation and default CMS seeding entirely to the backend.

### 5. Learning Reflection

This project highlighted that AI is a powerful accelerator, but requires a solid software engineering foundation from the developer to architect clean separation of concerns, manage Git workflows in a monorepo, and enforce security best practices.

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

*Criteria met: Level 1 (CRUD & Security), Level 2 (SLF4J Logging & Caching), Level 3 (Integration Testing & Dynamic CMS).*
