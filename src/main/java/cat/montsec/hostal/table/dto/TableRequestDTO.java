package cat.montsec.hostal.table.dto;

import cat.montsec.hostal.table.enums.TableLocation;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class TableRequestDTO {

    @NotNull(message = "El número de taula és obligatori")
    @Min(value = 1, message = "El número de taula ha de ser major que 0")
    private Integer tableNumber;

    @NotNull(message = "La capacitat és obligatòria")
    @Min(value = 1, message = "La capacitat mínima és 1 persona")
    private Integer capacity;

    @NotNull(message = "La ubicació és obligatòria (INTERIOR o TERRAZA)")
    private TableLocation location;
}