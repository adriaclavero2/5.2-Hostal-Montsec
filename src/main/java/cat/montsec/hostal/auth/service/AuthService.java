package cat.montsec.hostal.auth.service;

import cat.montsec.hostal.auth.dto.RegisterRequestDTO;
import cat.montsec.hostal.auth.model.User;
import cat.montsec.hostal.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public User register(RegisterRequestDTO request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new RuntimeException("Error: Email is already in use");
        }

        User user = new User();

        user.setEmail(request.getEmail());
        user.setName(request.getName());
        user.setSurname(request.getSurname());
        user.setNationalId(request.getNationalId());
        user.setPhone(request.getPhone());
        user.setCity(request.getCity());

        String hashedPassword = passwordEncoder.encode(request.getPassword());
        user.setPassword(hashedPassword);

        user.setRole("ROLE_USER");

        return userRepository.save(user);
    }
}