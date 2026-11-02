package cat.montsec.hostal.table.mapper;

import cat.montsec.hostal.table.dto.TableResponseDTO;
import cat.montsec.hostal.table.model.RestaurantTable;
import org.springframework.stereotype.Component;

@Component
public class TableMapper {

    public TableResponseDTO toResponseDTO(RestaurantTable table) {
        return new TableResponseDTO(
                table.getId(),
                table.getTableNumber(),
                table.getCapacity(),
                table.getLocation()
        );
    }
}
