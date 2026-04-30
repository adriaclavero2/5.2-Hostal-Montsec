package cat.montsec.hostal.reservation.controller;

import cat.montsec.hostal.reservation.dto.ReservationRequestDTO;
import cat.montsec.hostal.reservation.dto.ReservationResponseDTO;
import cat.montsec.hostal.reservation.service.ReservationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequestMapping("/api/reservations")
@RequiredArgsConstructor
public class ReservationController {

    private final ReservationService reservationService;

    @PostMapping
    public ResponseEntity<ReservationResponseDTO> createReservation(
            @Valid @RequestBody ReservationRequestDTO request,
            Principal principal) {

        String userEmail = principal.getName();

        ReservationResponseDTO response = reservationService.createReservation(request, userEmail);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/my-reservations")
    public ResponseEntity<java.util.List<ReservationResponseDTO>> getMyReservations(Principal principal) {

        String userEmail = principal.getName();

        java.util.List<ReservationResponseDTO> responses = reservationService.getUserReservations(userEmail);

        return ResponseEntity.ok(responses);
    }
}