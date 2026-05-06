package cat.montsec.hostal.reservation;

import cat.montsec.hostal.auth.model.User;
import cat.montsec.hostal.auth.repository.UserRepository;
import cat.montsec.hostal.reservation.repository.ReservationRepository;
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

import java.time.LocalDate;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;

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

    @Autowired
    private ReservationRepository reservationRepository;

    private Long tableId;

    @BeforeEach
    void setUp() {
        reservationRepository.deleteAll();
        tableRepository.deleteAll();
        userRepository.deleteAll();

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
        String futureDate = LocalDate.now().plusDays(5).toString();
        String reservationJson = String.format("""
            {
                "tableId": %d,
                "reservationDate": "%s",
                "reservationTime": "20:00:00",
                "numberOfPeople": 4
            }
            """, tableId, futureDate);

        mockMvc.perform(post("/api/reservations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reservationJson))
                .andDo(print())
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "testuser@gmail.com", roles = {"USER"})
    public void shouldFailWhenReservationTimeIsInvalid() throws Exception {
        String futureDate = LocalDate.now().plusDays(5).toString();
        String reservationJson = String.format("""
            {
                "tableId": %d,
                "reservationDate": "%s",
                "reservationTime": "17:30:00",
                "numberOfPeople": 4
            }
            """, tableId, futureDate);

        mockMvc.perform(post("/api/reservations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reservationJson))
                .andDo(print())
                .andExpect(status().is4xxClientError());
    }

    @Test
    @WithMockUser(username = "testuser@gmail.com", roles = {"USER"})
    public void shouldFailWhenReservationDateIsInThePast() throws Exception {
        String pastDate = LocalDate.now().minusDays(5).toString();
        String reservationJson = String.format("""
            {
                "tableId": %d,
                "reservationDate": "%s",
                "reservationTime": "20:00:00",
                "numberOfPeople": 2
            }
            """, tableId, pastDate);

        mockMvc.perform(post("/api/reservations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reservationJson))
                .andDo(print())
                .andExpect(status().is4xxClientError());
    }

    @Test
    @WithMockUser(username = "testuser@gmail.com", roles = {"USER"})
    public void shouldFailWhenCapacityExceedsAvailableTables() throws Exception {
        String futureDate = LocalDate.now().plusDays(5).toString();
        String reservationJson = String.format("""
            {
                "tableId": %d,
                "reservationDate": "%s",
                "reservationTime": "20:00:00",
                "numberOfPeople": 10
            }
            """, tableId, futureDate);

        mockMvc.perform(post("/api/reservations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reservationJson))
                .andDo(print())
                .andExpect(status().is4xxClientError());
    }

    @Test
    @WithMockUser(username = "testuser@gmail.com", roles = {"USER"})
    public void shouldReturnOkWhenFetchingReservationsAsUser() throws Exception {
        mockMvc.perform(get("/api/reservations"))
                .andDo(print())
                .andExpect(status().isOk());
    }

    @Test
    public void shouldDenyAccessWhenFetchingReservationsUnauthenticated() throws Exception {
        mockMvc.perform(get("/api/reservations"))
                .andDo(print())
                .andExpect(status().isForbidden());
    }
}