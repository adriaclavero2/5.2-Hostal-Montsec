package cat.montsec.hostal.reservation.mapper;

import cat.montsec.hostal.reservation.dto.ReservationResponseDTO;
import cat.montsec.hostal.reservation.model.Reservation;
import org.springframework.stereotype.Component;

@Component
public class ReservationMapper {

    public ReservationResponseDTO toResponseDTO(Reservation reservation) {
        return new ReservationResponseDTO(
                reservation.getId(),
                reservation.getUser().getEmail(),
                reservation.getRestaurantTable().getTableNumber(),
                reservation.getReservationDate(),
                reservation.getReservationTime(),
                reservation.getNumberOfPeople(),
                reservation.getStatus()
        );
    }
}