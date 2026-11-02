package cat.montsec.hostal.reservation.repository;

import cat.montsec.hostal.reservation.model.Reservation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public interface ReservationRepository extends JpaRepository<Reservation, Long> {

    List<Reservation> findByUserId(Long userId);

    @Query("SELECT CASE WHEN COUNT(r) > 0 THEN true ELSE false END FROM Reservation r " +
            "WHERE r.restaurantTable.id = :tableId AND r.reservationDate = :date " +
            "AND r.reservationTime = :time AND r.status != 'CANCELLED'")

    boolean isTableReserved(@Param("tableId") Long tableId, @Param("date") LocalDate date,
                            @Param("time") LocalTime time);
}