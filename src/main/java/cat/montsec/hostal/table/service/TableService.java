package cat.montsec.hostal.table.service;

import cat.montsec.hostal.table.dto.TableRequestDTO;
import cat.montsec.hostal.table.dto.TableResponseDTO;
import cat.montsec.hostal.table.mapper.TableMapper;
import cat.montsec.hostal.table.model.RestaurantTable;
import cat.montsec.hostal.table.repository.TableRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TableService {

    private final TableRepository tableRepository;
    private final TableMapper tableMapper;

    public TableResponseDTO createTable(TableRequestDTO request) {
        if (tableRepository.findByTableNumber(request.getTableNumber()).isPresent()) {
            throw new RuntimeException("Error: Table number " + request.getTableNumber() + " already exists");
        }

        RestaurantTable table = new RestaurantTable();

        table.setTableNumber(request.getTableNumber());
        table.setCapacity(request.getCapacity());
        table.setLocation(request.getLocation());

        RestaurantTable savedTable = tableRepository.save(table);

        return tableMapper.toResponseDTO(savedTable);
    }

    public List<TableResponseDTO> getAllTables() {
        List<RestaurantTable> tables = tableRepository.findAll();

        return tables.stream()
                .map(tableMapper::toResponseDTO)
                .collect(Collectors.toList());
    }
}