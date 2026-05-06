package cat.montsec.hostal.reservation.dto;

import cat.montsec.hostal.reservation.enums.ReservationStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReservationResponseDTO {

    private Long id;
    private String userEmail;
    private String userName;
    private String userSurname;
    private String userPhone;

    private Integer tableNumber;
    private LocalDate reservationDate;
    private LocalTime reservationTime;
    private Integer numberOfPeople;
    private ReservationStatus status;
}