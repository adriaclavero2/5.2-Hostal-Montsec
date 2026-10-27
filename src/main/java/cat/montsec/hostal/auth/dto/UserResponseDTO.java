package cat.montsec.hostal.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public class UserResponseDTO {
        private Long id;
        private String email;
        private String name;
        private String surname;
        private String nationalId;
        private String phone;
        private String city;
        private String role;
    }

