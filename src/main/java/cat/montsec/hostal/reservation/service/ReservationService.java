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

@Service
@RequiredArgsConstructor
public class ReservationService {

    private final ReservationRepository reservationRepository;
    private final TableRepository tableRepository;
    private final UserRepository userRepository;
    private final ReservationMapper reservationMapper;

    public ReservationResponseDTO createReservation(ReservationRequestDTO request, String userEmail) {

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("Error: User not found"));

        RestaurantTable table = tableRepository.findById(request.getTableId())
                .orElseThrow(() -> new RuntimeException("Error: Requested table does not exist"));

        if (table.getCapacity() < request.getNumberOfPeople()) {
            throw new RuntimeException("Error: The selected table only has capacity for " + table.getCapacity() + " people.");
        }

        boolean isOccupied = reservationRepository.isTableReserved(
                request.getTableId(),
                request.getReservationDate(),
                request.getReservationTime()
        );

        if (isOccupied) {
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

        return reservationMapper.toResponseDTO(savedReservation);
    }

    public java.util.List<ReservationResponseDTO> getReservations(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("Error: User not found"));

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

    public void cancelReservation(Long reservationId, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("Error: User not found"));

        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new RuntimeException("Error: Reservation not found"));

        boolean isAdmin = "ADMIN".equals(user.getRole());
        boolean isOwner = reservation.getUser().getId().equals(user.getId());

        if (!isAdmin && !isOwner) {
            throw new RuntimeException("Error: You do not have permission to cancel this reservation");
        }

        reservation.setStatus(ReservationStatus.CANCELLED);
        reservationRepository.save(reservation);
    }

    public ReservationResponseDTO updateReservation(Long reservationId, ReservationRequestDTO request, String userEmail) {

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("Error: User not found"));

        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new RuntimeException("Error: Reservation not found"));

        boolean isAdmin = "ADMIN".equals(user.getRole());
        boolean isOwner = reservation.getUser().getId().equals(user.getId());

        if (!isAdmin && !isOwner) {
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

        return reservationMapper.toResponseDTO(updatedReservation);
    }

}