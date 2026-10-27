package cat.montsec.hostal.auth.controller;

import cat.montsec.hostal.auth.dto.UserResponseDTO;
import cat.montsec.hostal.auth.model.User;
import cat.montsec.hostal.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ADMIN')")
public class UserController {

    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<List<UserResponseDTO>> getAllUsers() {
        List<UserResponseDTO> users = userRepository.findAll().stream()
                .map(u -> new UserResponseDTO(
                        u.getId(), u.getEmail(), u.getName(), u.getSurname(),
                        u.getNationalId(), u.getPhone(), u.getCity(), u.getRole()
                ))
                .collect(Collectors.toList());
        return ResponseEntity.ok(users);
    }

    @PutMapping("/{id}")
    public ResponseEntity<UserResponseDTO> updateUser(@PathVariable Long id, @RequestBody UserResponseDTO dto) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuari no trobat"));

        user.setName(dto.getName());
        user.setSurname(dto.getSurname());
        user.setPhone(dto.getPhone());
        user.setCity(dto.getCity());
        user.setRole(dto.getRole());

        User updated = userRepository.save(user);
        return ResponseEntity.ok(new UserResponseDTO(
                updated.getId(), updated.getEmail(), updated.getName(), updated.getSurname(),
                updated.getNationalId(), updated.getPhone(), updated.getCity(), updated.getRole()
        ));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        userRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}