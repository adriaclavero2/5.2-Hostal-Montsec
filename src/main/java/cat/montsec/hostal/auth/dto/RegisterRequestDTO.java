package cat.montsec.hostal.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterRequestDTO {

    @NotBlank(message = "L'email és obligatori")
    @Email(message = "El format de correu electrònic no és vàlid")
    private String email;

    @NotBlank(message = "La contrasenya és obligatòria")
    @Size(min = 8, max = 64, message = "La contrasenya ha de tenir entre 8 i 64 caràcters")
    @Pattern(
            regexp = "^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z]).{8,}$",
            message = "La contrasenya ha de contenir almenys una majúscula, una minúscula i un número"
    )
    private String password;

    @NotBlank(message = "El nom és obligatori")
    @Size(min = 2, max = 50, message = "El nom ha de tenir entre 2 i 50 caràcters")
    private String name;

    @NotBlank(message = "Els cognoms són obligatoris")
    @Size(min = 2, max = 80, message = "Els cognoms han de tenir entre 2 i 80 caràcters")
    private String surname;

    @NotBlank(message = "El DNI/NIE és obligatori")
    @Pattern(
            regexp = "^([0-9]{8}[A-Za-z]|[XYZxyz][0-9]{7}[A-Za-z])$",
            message = "El format del DNI/NIE no és vàlid (Ex: 12345678Z o X1234567Z)"
    )
    private String nationalId;

    @NotBlank(message = "El telèfon és obligatori")
    @Pattern(
            regexp = "^[0-9]{9}$",
            message = "El telèfon ha de contenir exactament 9 dígits numèrics"
    )
    private String phone;

    @NotBlank(message = "La població és obligatòria")
    @Size(min = 2, max = 60, message = "La població ha de tenir entre 2 i 60 caràcters")
    private String city;
}