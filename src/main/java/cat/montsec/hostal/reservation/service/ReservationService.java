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
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;

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
        log.info("Attempting to create auto-assigned reservation for user: {}", userEmail);

        if (request.getReservationDate().isBefore(LocalDate.now())) {
            throw new InvalidReservationDateException("Error: No pots fer una reserva per a una data passada.");
        }

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Error: Usuari no trobat."));

        List<RestaurantTable> allTables = tableRepository.findAll();

        if (allTables.isEmpty()) {
            throw new TableNotAvailableException("Error Crític: No hi ha taules registrades a la base de dades.");
        }

        allTables.sort(Comparator.comparingInt(RestaurantTable::getCapacity));

        RestaurantTable assignedTable = null;

        for (RestaurantTable table : allTables) {
            if (table.getCapacity() >= request.getNumberOfPeople()) {
                boolean isOccupied = reservationRepository.isTableReserved(
                        table.getId(),
                        request.getReservationDate(),
                        request.getReservationTime()
                );

                if (!isOccupied) {
                    assignedTable = table;
                    break;
                }
            }
        }

        if (assignedTable == null) {
            throw new TableNotAvailableException("Ho sentim, no hi ha taules lliures per a " + request.getNumberOfPeople() + " persones en aquesta data i hora.");
        }

        Reservation reservation = new Reservation();
        reservation.setUser(user);
        reservation.setRestaurantTable(assignedTable);
        reservation.setReservationDate(request.getReservationDate());
        reservation.setReservationTime(request.getReservationTime());
        reservation.setNumberOfPeople(request.getNumberOfPeople());
        reservation.setStatus(ReservationStatus.CONFIRMED);

        Reservation savedReservation = reservationRepository.save(reservation);

        return reservationMapper.toResponseDTO(savedReservation);
    }

    @Cacheable("reservations")
    public java.util.List<ReservationResponseDTO> getReservations(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Error: Usuari no trobat."));

        java.util.List<Reservation> reservations;

        boolean isAdmin = user.getRole() != null && user.getRole().toUpperCase().contains("ADMIN");

        if (isAdmin) {
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
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Error: Usuari no trobat."));

        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new ResourceNotFoundException("Error: Reserva no trobada."));

        boolean isAdmin = user.getRole() != null && user.getRole().toUpperCase().contains("ADMIN");
        boolean isOwner = reservation.getUser().getId().equals(user.getId());

        if (!isAdmin && !isOwner) {
            throw new AccessDeniedException("Error: No tens permís per cancel·lar aquesta reserva.");
        }

        LocalDateTime reservationDateTime = LocalDateTime.of(reservation.getReservationDate(), reservation.getReservationTime());
        LocalDateTime now = LocalDateTime.now();

        if (now.plusHours(24).isAfter(reservationDateTime) && reservationDateTime.isAfter(now)) {
            int penaltyAmount = reservation.getNumberOfPeople() * 20;
            log.warn("LATE CANCELLATION DETECTED! Charging penalty of {}€ to user {} for reservation #{}",
                    penaltyAmount, userEmail, reservationId);
        }

        reservation.setStatus(ReservationStatus.CANCELLED);
        reservationRepository.save(reservation);
    }

    @CacheEvict(value = "reservations", allEntries = true)
    public ReservationResponseDTO updateReservation(Long reservationId, ReservationRequestDTO request, String userEmail) {
        if (request.getReservationDate().isBefore(LocalDate.now())) {
            throw new InvalidReservationDateException("Error: No pots actualitzar una reserva a una data passada.");
        }

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Error: Usuari no trobat."));

        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new ResourceNotFoundException("Error: Reserva no trobada."));

        boolean isAdmin = user.getRole() != null && user.getRole().toUpperCase().contains("ADMIN");
        boolean isOwner = reservation.getUser().getId().equals(user.getId());

        if (!isAdmin && !isOwner) {
            throw new AccessDeniedException("Error: No tens permís per modificar aquesta reserva.");
        }

        RestaurantTable assignedTable = null;

        if (request.getTableId() != null && request.getTableId() > 0) {
            assignedTable = tableRepository.findById(request.getTableId())
                    .orElseThrow(() -> new ResourceNotFoundException("Error: La taula sol·licitada no existeix."));
        } else {
            List<RestaurantTable> allTables = tableRepository.findAll();
            allTables.sort(Comparator.comparingInt(RestaurantTable::getCapacity));
            for (RestaurantTable t : allTables) {
                if (t.getCapacity() >= request.getNumberOfPeople()) {
                    boolean isOccupied = reservationRepository.isTableReserved(t.getId(), request.getReservationDate(), request.getReservationTime());
                    if (!isOccupied || (t.getId().equals(reservation.getRestaurantTable().getId()) && request.getReservationDate().equals(reservation.getReservationDate()) && request.getReservationTime().equals(reservation.getReservationTime()))) {
                        assignedTable = t;
                        break;
                    }
                }
            }
            if (assignedTable == null) throw new TableNotAvailableException("Error: No hi ha taules lliures per a aquests canvis.");
        }

        if (assignedTable.getCapacity() < request.getNumberOfPeople()) {
            throw new TableNotAvailableException("Error: La taula seleccionada només té capacitat per a " + assignedTable.getCapacity() + " persones.");
        }

        boolean timeChanged = !reservation.getReservationTime().equals(request.getReservationTime());
        boolean dateChanged = !reservation.getReservationDate().equals(request.getReservationDate());
        boolean tableChanged = !reservation.getRestaurantTable().getId().equals(assignedTable.getId());

        if (timeChanged || dateChanged || tableChanged) {
            boolean isOccupied = reservationRepository.isTableReserved(
                    assignedTable.getId(),
                    request.getReservationDate(),
                    request.getReservationTime()
            );

            if (isOccupied) {
                throw new TableNotAvailableException("Error: Ho sentim, la taula ja està reservada per a aquesta nova data i hora.");
            }
        }

        reservation.setRestaurantTable(assignedTable);
        reservation.setReservationDate(request.getReservationDate());
        reservation.setReservationTime(request.getReservationTime());
        reservation.setNumberOfPeople(request.getNumberOfPeople());

        Reservation updatedReservation = reservationRepository.save(reservation);

        return reservationMapper.toResponseDTO(updatedReservation);
    }
}