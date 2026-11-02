package cat.montsec.hostal.table.controller;

import cat.montsec.hostal.table.dto.TableRequestDTO;
import cat.montsec.hostal.table.dto.TableResponseDTO;
import cat.montsec.hostal.table.service.TableService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tables")
@RequiredArgsConstructor
public class TableController {

    private final TableService tableService;

    @PostMapping
    public ResponseEntity<TableResponseDTO> createTable(@Valid @RequestBody TableRequestDTO request) {
        TableResponseDTO response = tableService.createTable(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<List<TableResponseDTO>> getAllTables() {
        List<TableResponseDTO> response = tableService.getAllTables();
        return ResponseEntity.ok(response);
    }
}