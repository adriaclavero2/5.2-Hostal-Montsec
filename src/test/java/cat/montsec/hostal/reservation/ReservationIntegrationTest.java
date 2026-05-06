package cat.montsec.hostal.reservation;

import cat.montsec.hostal.auth.model.User;
import cat.montsec.hostal.auth.repository.UserRepository;
import cat.montsec.hostal.table.model.RestaurantTable;
import cat.montsec.hostal.table.repository.TableRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import cat.montsec.hostal.table.enums.TableLocation;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class ReservationIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TableRepository tableRepository;

    private Long tableId;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();
        tableRepository.deleteAll();

        User user = new User();
        user.setEmail("testuser@gmail.com");
        user.setPassword("password");
        user.setRole("USER");
        user.setName("Usuario");
        user.setSurname("Prueba");
        user.setNationalId("12345678Z");
        user.setPhone("600123456");
        user.setCity("Lleida");

        userRepository.save(user);

        RestaurantTable table = new RestaurantTable();
        table.setTableNumber(1);
        table.setCapacity(4);
        table.setLocation(TableLocation.TERRACE);

        RestaurantTable savedTable = tableRepository.save(table);
        this.tableId = savedTable.getId();
    }

    @Test
    @WithMockUser(username = "testuser@gmail.com", roles = {"USER"})
    public void shouldCreateReservationSuccessfully() throws Exception {
        String reservationJson = String.format("""
            {
                "tableId": %d,
                "reservationDate": "2026-06-15",
                "reservationTime": "21:00:00",
                "numberOfPeople": 4
            }
            """, tableId);

        mockMvc.perform(post("/api/reservations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reservationJson))
                .andExpect(status().isOk());
    }
}