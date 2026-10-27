package cat.montsec.hostal.table.service;

import cat.montsec.hostal.exception.ResourceNotFoundException;
import cat.montsec.hostal.table.dto.TableRequestDTO;
import cat.montsec.hostal.table.dto.TableResponseDTO;
import cat.montsec.hostal.table.mapper.TableMapper;
import cat.montsec.hostal.table.model.RestaurantTable;
import cat.montsec.hostal.table.repository.TableRepository;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.dao.DataIntegrityViolationException;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TableService {

    private final TableRepository tableRepository;
    private final TableMapper tableMapper;

    @CacheEvict(value = "tables", allEntries = true)
    public TableResponseDTO createTable(TableRequestDTO request) {
        if (tableRepository.existsByTableNumber(request.getTableNumber())) {
            throw new DataIntegrityViolationException("Error: El número de taula " + request.getTableNumber() + " ja existeix.");
        }

        RestaurantTable table = new RestaurantTable();
        table.setTableNumber(request.getTableNumber());
        table.setCapacity(request.getCapacity());
        table.setLocation(request.getLocation());

        RestaurantTable savedTable = tableRepository.save(table);
        return tableMapper.toResponseDTO(savedTable);
    }

    @Cacheable("tables")
    public List<TableResponseDTO> getAllTables() {
        List<RestaurantTable> tables = tableRepository.findAll();
        return tables.stream()
                .map(tableMapper::toResponseDTO)
                .collect(Collectors.toList());
    }

    @CacheEvict(value = "tables", allEntries = true)
    public TableResponseDTO updateTable(Long id, TableRequestDTO request) {
        RestaurantTable table = tableRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Error: Taula no trobada."));

        if (!table.getTableNumber().equals(request.getTableNumber()) &&
                tableRepository.existsByTableNumber(request.getTableNumber())) {
            throw new DataIntegrityViolationException("Error: Ja existeix una altra taula amb el número " + request.getTableNumber());
        }

        table.setTableNumber(request.getTableNumber());
        table.setCapacity(request.getCapacity());
        table.setLocation(request.getLocation());

        RestaurantTable updatedTable = tableRepository.save(table);
        return tableMapper.toResponseDTO(updatedTable);
    }

    @CacheEvict(value = "tables", allEntries = true)
    public void deleteTable(Long id) {
        if (!tableRepository.existsById(id)) {
            throw new ResourceNotFoundException("Error: Taula no trobada.");
        }
        tableRepository.deleteById(id);
    }
}