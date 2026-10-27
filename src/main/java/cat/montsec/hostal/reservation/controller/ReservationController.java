package cat.montsec.hostal.reservation.controller;

import cat.montsec.hostal.reservation.dto.ReservationRequestDTO;
import cat.montsec.hostal.reservation.dto.ReservationResponseDTO;
import cat.montsec.hostal.reservation.enums.ReservationStatus;
import cat.montsec.hostal.reservation.service.ReservationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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

    @GetMapping
    public ResponseEntity<Page<ReservationResponseDTO>> getReservations(
            @RequestParam(required = false) ReservationStatus status,
            @PageableDefault(size = 10, sort = "reservationDate", direction = Sort.Direction.ASC) Pageable pageable,
            Principal principal) {

        Page<ReservationResponseDTO> responses = reservationService.getUserReservations(principal.getName(), pageable, status);
        return ResponseEntity.ok(responses);
    }

    @PreAuthorize("hasAuthority('ADMIN')")
    @GetMapping("/all")
    public ResponseEntity<Page<ReservationResponseDTO>> getAllReservations(
            @RequestParam(required = false) ReservationStatus status,
            @PageableDefault(size = 10, sort = "reservationDate", direction = Sort.Direction.ASC) Pageable pageable) {

        Page<ReservationResponseDTO> responses = reservationService.getAdminReservations(pageable, status);
        return ResponseEntity.ok(responses);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<String> cancelReservation(@PathVariable Long id, Principal principal) {
        reservationService.cancelReservation(id, principal.getName());
        return ResponseEntity.ok("Reservation cancelled successfully");
    }

    @PutMapping("/{id}")
    public ResponseEntity<ReservationResponseDTO> updateReservation(
            @PathVariable Long id,
            @Valid @RequestBody ReservationRequestDTO request,
            Principal principal) {

        ReservationResponseDTO response = reservationService.updateReservation(id, request, principal.getName());
        return ResponseEntity.ok(response);
    }
}