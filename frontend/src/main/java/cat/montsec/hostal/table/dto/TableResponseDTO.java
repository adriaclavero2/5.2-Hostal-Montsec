package cat.montsec.hostal.table.dto;

import cat.montsec.hostal.table.enums.TableLocation; // Añade este import
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class TableResponseDTO {

    private Long id;
    private Integer tableNumber;
    private Integer capacity;
    private TableLocation location;
}