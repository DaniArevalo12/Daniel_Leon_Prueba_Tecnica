package com.segurosbolivar.polizas.integration;

import com.segurosbolivar.polizas.domain.port.CorePort;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Base de los tests de integración: contexto completo, H2 en modo Oracle con Flyway y MockMvc
 * (con todos los filtros: correlationId, CORS y API key).
 * <p>
 * Cada test parte de los datos semilla: se limpia y migra la base antes de cada uno. Así las
 * transacciones son reales (se confirman) y los listeners AFTER_COMMIT se ejecutan como en producción.
 * El puerto CORE se reemplaza por un mock para verificar que cada operación lo invoca.
 */
@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = "spring.flyway.clean-disabled=false")
abstract class AbstractIntegrationTest {

    protected static final String API_KEY_HEADER = "x-api-key";
    protected static final String API_KEY = "123456";

    @Autowired
    protected MockMvc mockMvc;

    @MockitoBean
    protected CorePort corePort;

    @Autowired
    private Flyway flyway;

    @BeforeEach
    void reiniciarBaseDeDatos() {
        flyway.clean();
        flyway.migrate();
    }
}
