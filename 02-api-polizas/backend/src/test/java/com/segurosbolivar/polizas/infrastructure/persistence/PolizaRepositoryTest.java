package com.segurosbolivar.polizas.infrastructure.persistence;

import com.segurosbolivar.polizas.domain.model.EstadoPoliza;
import com.segurosbolivar.polizas.domain.model.Poliza;
import com.segurosbolivar.polizas.domain.model.Riesgo;
import com.segurosbolivar.polizas.domain.model.TipoPoliza;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.TestPropertySource;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Usa H2 en modo Oracle (no la base embebida por defecto de @DataJpaTest) para validar que las
 * migraciones Flyway y el mapeo JPA coinciden. Base propia para no compartir estado con otros tests.
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@TestPropertySource(properties = "spring.datasource.url=jdbc:h2:mem:repositorio-test;MODE=Oracle;DB_CLOSE_DELAY=-1")
class PolizaRepositoryTest {

    @Autowired
    private PolizaRepository polizaRepository;

    @Autowired
    private RiesgoRepository riesgoRepository;

    @Autowired
    private TestEntityManager entityManager;

    @Test
    void cargaLosDatosDePruebaDeFlyway() {
        assertThat(polizaRepository.count()).isEqualTo(8);
        assertThat(riesgoRepository.count()).isEqualTo(11);
    }

    @Test
    void sinFiltrosDevuelveTodasOrdenadasPorId() {
        List<Poliza> polizas = polizaRepository.buscar(null, null);

        assertThat(polizas).extracting(Poliza::getId).containsExactly(1L, 2L, 3L, 4L, 5L, 6L, 7L, 8L);
    }

    @Test
    void filtraPorTipo() {
        assertThat(polizaRepository.buscar(TipoPoliza.COLECTIVA, null))
                .extracting(Poliza::getId).containsExactly(4L, 5L, 6L, 7L);
    }

    @Test
    void filtraPorEstado() {
        assertThat(polizaRepository.buscar(null, EstadoPoliza.CANCELADA))
                .extracting(Poliza::getId).containsExactly(3L, 6L);
    }

    @Test
    void filtraPorTipoYEstado() {
        assertThat(polizaRepository.buscar(TipoPoliza.INDIVIDUAL, EstadoPoliza.ACTIVA))
                .extracting(Poliza::getId).containsExactly(1L, 8L);
    }

    @Test
    void listaLosRiesgosDeUnaPoliza() {
        assertThat(riesgoRepository.findByPolizaIdOrderByIdAsc(4L))
                .extracting(Riesgo::getId).containsExactly(4L, 5L, 6L);
    }

    @Test
    void elConsecutivoDeNumeroEsIncremental() {
        long primero = polizaRepository.siguienteConsecutivoNumero();
        long segundo = polizaRepository.siguienteConsecutivoNumero();

        assertThat(primero).isGreaterThanOrEqualTo(1000);
        assertThat(segundo).isEqualTo(primero + 1);
    }

    @Test
    void persisteUnaPolizaConSusRiesgosEnCascadaYAuditoria() {
        Poliza poliza = Poliza.crear("POL-TEST", TipoPoliza.COLECTIVA, "Tomador", LocalDate.of(2026, 1, 1), 12,
                new BigDecimal("1000000"), List.of(Riesgo.nuevo("Dirección", "Arrendatario", "Arrendador")));

        Poliza guardada = polizaRepository.saveAndFlush(poliza);
        entityManager.clear();

        Poliza leida = polizaRepository.findById(guardada.getId()).orElseThrow();
        assertThat(leida.getId()).isGreaterThanOrEqualTo(1000);
        assertThat(leida.getValorPrima()).isEqualByComparingTo("12000000.00");
        assertThat(leida.getVersion()).isZero();
        assertThat(leida.getFechaCreacion()).isNotNull();
        assertThat(leida.getFechaActualizacion()).isNotNull();
        assertThat(leida.getRiesgos()).hasSize(1);
    }
}
