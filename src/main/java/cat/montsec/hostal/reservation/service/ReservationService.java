package cat.montsec.hostal.reservation.service;

import cat.montsec.hostal.auth.model.User;
import cat.montsec.hostal.auth.repository.UserRepository;
import cat.montsec.hostal.exception.InvalidReservationDateException;
import cat.montsec.hostal.exception.ResourceNotFoundException;
import cat.montsec.hostal.exception.TableNotAvailableException;
import cat.montsec.hostal.reservation.dto.ReservationRequestDTO;
import cat.montsec.hostal.reservation.dto.ReservationResponseDTO;
import cat.montsec.hostal.reservation.enums.ReservationStatus;
import cat.montsec.hostal.reservation.mapper.ReservationMapper;
import cat.montsec.hostal.reservation.model.Reservation;
import cat.montsec.hostal.reservation.repository.ReservationRepository;
import cat.montsec.hostal.table.model.RestaurantTable;
import cat.montsec.hostal.table.repository.TableRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.CacheEvict;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReservationService {

    private final ReservationRepository reservationRepository;
    private final TableRepository tableRepository;
    private final UserRepository userRepository;
    private final ReservationMapper reservationMapper;

    @CacheEvict(value = "reservations", allEntries = true)
    public ReservationResponseDTO createReservation(ReservationRequestDTO request, String userEmail) {
        log.info("Attempting to create reservation for user: {}, table: {}", userEmail, request.getTableId());

        // 1. Validar fecha
        if (request.getReservationDate().isBefore(LocalDate.now())) {
            throw new InvalidReservationDateException("Error: No pots fer una reserva per a una data passada.");
        }

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> {
                    log.error("Failed to create reservation: User {} not found", userEmail);
                    return new ResourceNotFoundException("Error: Usuari no trobat.");
                });

        RestaurantTable table = tableRepository.findById(request.getTableId())
                .orElseThrow(() -> {
                    log.error("Failed to create reservation: Table {} not found", request.getTableId());
                    return new ResourceNotFoundException("Error: La taula sol·licitada no existeix.");
                });

        if (table.getCapacity() < request.getNumberOfPeople()) {
            log.warn("Reservation rejected: Table {} capacity ({}) is less than requested people ({})",
                    table.getTableNumber(), table.getCapacity(), request.getNumberOfPeople());
            throw new TableNotAvailableException("Error: La taula seleccionada només té capacitat per a " + table.getCapacity() + " persones.");
        }

        boolean isOccupied = reservationRepository.isTableReserved(
                request.getTableId(),
                request.getReservationDate(),
                request.getReservationTime()
        );

        if (isOccupied) {
            log.warn("Reservation rejected: Table {} is already occupied at {} on {}",
                    table.getTableNumber(), request.getReservationTime(), request.getReservationDate());
            throw new TableNotAvailableException("Error: Ho sentim, la taula ja està reservada per a aquesta data i hora.");
        }

        Reservation reservation = new Reservation();
        reservation.setUser(user);
        reservation.setRestaurantTable(table);
        reservation.setReservationDate(request.getReservationDate());
        reservation.setReservationTime(request.getReservationTime());
        reservation.setNumberOfPeople(request.getNumberOfPeople());
        reservation.setStatus(ReservationStatus.CONFIRMED);

        Reservation savedReservation = reservationRepository.save(reservation);

        log.info("Successfully created reservation ID: {} for user: {}", savedReservation.getId(), userEmail);

        return reservationMapper.toResponseDTO(savedReservation);
    }

    @Cacheable("reservations")
    public java.util.List<ReservationResponseDTO> getReservations(String userEmail) {
        log.info("Fetching reservations requested by user: {}", userEmail);

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> {
                    log.error("Failed to fetch reservations: User {} not found", userEmail);
                    return new ResourceNotFoundException("Error: Usuari no trobat.");
                });

        java.util.List<Reservation> reservations;

        if ("ADMIN".equals(user.getRole())) {
            reservations = reservationRepository.findAll();
        } else {
            reservations = reservationRepository.findByUserId(user.getId());
        }

        return reservations.stream()
                .map(reservationMapper::toResponseDTO)
                .toList();
    }

    @CacheEvict(value = "reservations", allEntries = true)
    public void cancelReservation(Long reservationId, String userEmail) {
        log.info("User: {} is attempting to cancel reservation ID: {}", userEmail, reservationId);

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Error: Usuari no trobat."));

        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new ResourceNotFoundException("Error: Reserva no trobada."));

        boolean isAdmin = "ADMIN".equals(user.getRole());
        boolean isOwner = reservation.getUser().getId().equals(user.getId());

        if (!isAdmin && !isOwner) {
            log.warn("Unauthorized cancellation attempt by user: {} for reservation ID: {}", userEmail, reservationId);
            throw new AccessDeniedException("Error: No tens permís per cancel·lar aquesta reserva.");
        }

        reservation.setStatus(ReservationStatus.CANCELLED);
        reservationRepository.save(reservation);

        log.info("Reservation ID: {} successfully cancelled by user: {}", reservationId, userEmail);
    }

    @CacheEvict(value = "reservations", allEntries = true)
    public ReservationResponseDTO updateReservation(Long reservationId, ReservationRequestDTO request, String userEmail) {
        log.info("User: {} is attempting to update reservation ID: {}", userEmail, reservationId);

        // 1. Validar fecha nueva
        if (request.getReservationDate().isBefore(LocalDate.now())) {
            throw new InvalidReservationDateException("Error: No pots actualitzar una reserva a una data passada.");
        }

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Error: Usuari no trobat."));

        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new ResourceNotFoundException("Error: Reserva no trobada."));

        boolean isAdmin = "ADMIN".equals(user.getRole());
        boolean isOwner = reservation.getUser().getId().equals(user.getId());

        if (!isAdmin && !isOwner) {
            log.warn("Unauthorized update attempt by user: {} for reservation ID: {}", userEmail, reservationId);
            throw new AccessDeniedException("Error: No tens permís per modificar aquesta reserva.");
        }

        RestaurantTable table = tableRepository.findById(request.getTableId())
                .orElseThrow(() -> new ResourceNotFoundException("Error: La taula sol·licitada no existeix."));

        if (table.getCapacity() < request.getNumberOfPeople()) {
            throw new TableNotAvailableException("Error: La taula seleccionada només té capacitat per a " + table.getCapacity() + " persones.");
        }

        boolean timeChanged = !reservation.getReservationTime().equals(request.getReservationTime());
        boolean dateChanged = !reservation.getReservationDate().equals(request.getReservationDate());
        boolean tableChanged = !reservation.getRestaurantTable().getId().equals(request.getTableId());

        if (timeChanged || dateChanged || tableChanged) {
            boolean isOccupied = reservationRepository.isTableReserved(
                    request.getTableId(),
                    request.getReservationDate(),
                    request.getReservationTime()
            );

            if (isOccupied) {
                throw new TableNotAvailableException("Error: Ho sentim, la taula ja està reservada per a aquesta nova data i hora.");
            }
        }

        reservation.setRestaurantTable(table);
        reservation.setReservationDate(request.getReservationDate());
        reservation.setReservationTime(request.getReservationTime());
        reservation.setNumberOfPeople(request.getNumberOfPeople());

        Reservation updatedReservation = reservationRepository.save(reservation);

        log.info("Reservation ID: {} successfully updated by user: {}", reservationId, userEmail);

        return reservationMapper.toResponseDTO(updatedReservation);
    }
}