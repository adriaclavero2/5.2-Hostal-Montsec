package cat.montsec.hostal.table;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class TableIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    // TEST 1: Un Administrador pot veure les taules
    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    public void shouldReturnOkWhenFetchingTablesAsAdmin() throws Exception {
        mockMvc.perform(get("/api/tables"))
                .andExpect(status().isOk());
    }

    // TEST 2: Un Usuari normal també pot veure les taules (per fer la reserva)
    @Test
    @WithMockUser(username = "user", roles = {"USER"})
    public void shouldReturnOkWhenFetchingTablesAsUser() throws Exception {
        mockMvc.perform(get("/api/tables"))
                .andExpect(status().isOk());
    }

    // TEST 3: Un usuari anònim (sense token) NO pot veure les taules
    @Test
    public void shouldDenyAccessWhenFetchingTablesUnauthenticated() throws Exception {
        mockMvc.perform(get("/api/tables"))
                .andExpect(status().isForbidden()); // o isUnauthorized()
    }

    // TEST 4: Seguretat RBAC - Un Administrador POT crear una taula nova
    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    public void shouldAllowAdminToCreateNewTable() throws Exception {
        String newTableJson = """
            {
                "tableNumber": 99,
                "capacity": 6,
                "location": "TERRACE"
            }
            """;

        mockMvc.perform(post("/api/tables")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(newTableJson))
                .andExpect(status().is2xxSuccessful());
    }

    @Test
    @WithMockUser(username = "user", roles = {"USER"})
    public void shouldDenyUserFromCreatingNewTable() throws Exception {
        String newTableJson = """
            {
                "tableNumber": 100,
                "capacity": 2,
                "location": "INSIDE"
            }
            """;

        mockMvc.perform(post("/api/tables")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(newTableJson))
                .andExpect(status().isForbidden()); // Esperem que Spring Security el bloquegi
    }
}