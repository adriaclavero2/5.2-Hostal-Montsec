package cat.montsec.hostal.table.dto;

import cat.montsec.hostal.table.enums.TableLocation; // Añade este import
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class TableRequestDTO {

    @NotNull(message = "Table number is required")
    @Min(value = 1, message = "Table number must be greater than 0")
    private Integer tableNumber;

    @NotNull(message = "Capacity is required")
    @Min(value = 1, message = "Capacity must be at least 1 person")
    private Integer capacity;

    @NotNull(message = "Location is required (must be INTERIOR or TERRAZA)")
    private TableLocation location;
}