package cat.montsec.hostal.auth.service;

import cat.montsec.hostal.auth.dto.AuthResponseDTO;
import cat.montsec.hostal.auth.dto.LoginRequestDTO;
import cat.montsec.hostal.auth.dto.RegisterRequestDTO;
import cat.montsec.hostal.auth.model.User;
import cat.montsec.hostal.auth.repository.UserRepository;
import cat.montsec.hostal.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    public AuthResponseDTO register(RegisterRequestDTO request) {
        User user = new User();
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));

        if (request.getEmail().equalsIgnoreCase("admin@hostalmontsec.com")) {
            user.setRole("ADMIN");
        } else {
            user.setRole("USER");
        }

        user.setName(request.getName());
        user.setSurname(request.getSurname());
        user.setNationalId(request.getNationalId());
        user.setPhone(request.getPhone());
        user.setCity(request.getCity());

        userRepository.save(user);

        String jwtToken = jwtService.generateToken(user);
        return new AuthResponseDTO(jwtToken);
    }

    public AuthResponseDTO login(LoginRequestDTO request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getEmail(),
                        request.getPassword()
                )
        );

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow();

        String jwtToken = jwtService.generateToken(user);
        return new AuthResponseDTO(jwtToken);
    }
}