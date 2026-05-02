package cat.montsec.hostal.reservation.service;

import cat.montsec.hostal.auth.model.User;
import cat.montsec.hostal.auth.repository.UserRepository;
import cat.montsec.hostal.reservation.dto.ReservationRequestDTO;
import cat.montsec.hostal.reservation.dto.ReservationResponseDTO;
import cat.montsec.hostal.reservation.enums.ReservationStatus;
import cat.montsec.hostal.reservation.mapper.ReservationMapper;
import cat.montsec.hostal.reservation.model.Reservation;
import cat.montsec.hostal.reservation.repository.ReservationRepository;
import cat.montsec.hostal.table.model.RestaurantTable;
import cat.montsec.hostal.table.repository.TableRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.CacheEvict;

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

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> {
                    log.error("Failed to create reservation: User {} not found", userEmail);
                    return new RuntimeException("Error: User not found");
                });

        RestaurantTable table = tableRepository.findById(request.getTableId())
                .orElseThrow(() -> {
                    log.error("Failed to create reservation: Table {} not found", request.getTableId());
                    return new RuntimeException("Error: Requested table does not exist");
                });

        if (table.getCapacity() < request.getNumberOfPeople()) {
            log.warn("Reservation rejected: Table {} capacity ({}) is less than requested people ({})",
                    table.getTableNumber(), table.getCapacity(), request.getNumberOfPeople());
            throw new RuntimeException("Error: The selected table only has capacity for " + table.getCapacity() + " people.");
        }

        boolean isOccupied = reservationRepository.isTableReserved(
                request.getTableId(),
                request.getReservationDate(),
                request.getReservationTime()
        );

        if (isOccupied) {
            log.warn("Reservation rejected: Table {} is already occupied at {} on {}",
                    table.getTableNumber(), request.getReservationTime(), request.getReservationDate());
            throw new RuntimeException("Error: Sorry, the table is already reserved for that date and time.");
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
                    return new RuntimeException("Error: User not found");
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
                .orElseThrow(() -> new RuntimeException("Error: User not found"));

        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new RuntimeException("Error: Reservation not found"));

        boolean isAdmin = "ADMIN".equals(user.getRole());
        boolean isOwner = reservation.getUser().getId().equals(user.getId());

        if (!isAdmin && !isOwner) {
            log.warn("Unauthorized cancellation attempt by user: {} for reservation ID: {}", userEmail, reservationId);
            throw new RuntimeException("Error: You do not have permission to cancel this reservation");
        }

        reservation.setStatus(ReservationStatus.CANCELLED);
        reservationRepository.save(reservation);

        log.info("Reservation ID: {} successfully cancelled by user: {}", reservationId, userEmail);
    }

    @CacheEvict(value = "reservations", allEntries = true)
    public ReservationResponseDTO updateReservation(Long reservationId, ReservationRequestDTO request, String userEmail) {
        log.info("User: {} is attempting to update reservation ID: {}", userEmail, reservationId);

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("Error: User not found"));

        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new RuntimeException("Error: Reservation not found"));

        boolean isAdmin = "ADMIN".equals(user.getRole());
        boolean isOwner = reservation.getUser().getId().equals(user.getId());

        if (!isAdmin && !isOwner) {
            log.warn("Unauthorized update attempt by user: {} for reservation ID: {}", userEmail, reservationId);
            throw new RuntimeException("Error: You do not have permission to update this reservation");
        }

        RestaurantTable table = tableRepository.findById(request.getTableId())
                .orElseThrow(() -> new RuntimeException("Error: Requested table does not exist"));

        if (table.getCapacity() < request.getNumberOfPeople()) {
            throw new RuntimeException("Error: The selected table only has capacity for " + table.getCapacity() + " people.");
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
                throw new RuntimeException("Error: Sorry, the table is already reserved for that new date and time.");
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