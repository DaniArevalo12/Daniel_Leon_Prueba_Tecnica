package com.segurosbolivar.polizas.domain.model;

import com.segurosbolivar.polizas.domain.exception.ConflictoEstadoException;
import com.segurosbolivar.polizas.domain.exception.ReglaNegocioException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PolizaTest {

    private static final LocalDate INICIO = LocalDate.of(2026, 1, 1);

    private static Riesgo riesgo() {
        return Riesgo.nuevo("Calle 1 # 2-3", "Arrendatario", "Arrendador");
    }

    private static Poliza individual() {
        return Poliza.crear("POL-1", TipoPoliza.INDIVIDUAL, "Tomador", INICIO, 12,
                new BigDecimal("1500000"), List.of(riesgo()));
    }

    private static Poliza colectiva() {
        return Poliza.crear("POL-2", TipoPoliza.COLECTIVA, "Tomador", INICIO, 6,
                new BigDecimal("2000000"), List.of());
    }

    @Nested
    @DisplayName("crear")
    class Crear {

        @Test
        void calculaPrimaComoCanonPorMesesYVigencia() {
            Poliza poliza = individual();

            assertThat(poliza.getEstado()).isEqualTo(EstadoPoliza.ACTIVA);
            assertThat(poliza.getValorCanon()).isEqualByComparingTo("1500000.00");
            assertThat(poliza.getValorPrima()).isEqualTo(new BigDecimal("18000000.00"));
            assertThat(poliza.getFechaFinVigencia()).isEqualTo(LocalDate.of(2027, 1, 1));
            assertThat(poliza.getRiesgos()).hasSize(1);
            assertThat(poliza.getRiesgos().get(0).getPoliza()).isSameAs(poliza);
        }

        @Test
        void redondeaElCanonADosDecimales() {
            Poliza poliza = Poliza.crear("POL-3", TipoPoliza.COLECTIVA, "Tomador", INICIO, 3,
                    new BigDecimal("1000.005"), List.of());

            assertThat(poliza.getValorCanon()).isEqualTo(new BigDecimal("1000.00"));
            assertThat(poliza.getValorPrima()).isEqualTo(new BigDecimal("3000.00"));
        }

        @Test
        void individualSinRiesgoEsRechazada() {
            assertThatThrownBy(() -> Poliza.crear("POL-1", TipoPoliza.INDIVIDUAL, "Tomador", INICIO, 12,
                    BigDecimal.TEN, List.of()))
                    .isInstanceOf(ReglaNegocioException.class);
        }

        @Test
        void individualConVariosRiesgosEsRechazada() {
            assertThatThrownBy(() -> Poliza.crear("POL-1", TipoPoliza.INDIVIDUAL, "Tomador", INICIO, 12,
                    BigDecimal.TEN, List.of(riesgo(), riesgo())))
                    .isInstanceOf(ReglaNegocioException.class);
        }

        @Test
        void colectivaAdmiteVariosRiesgosIniciales() {
            Poliza poliza = Poliza.crear("POL-1", TipoPoliza.COLECTIVA, "Tomador", INICIO, 12,
                    BigDecimal.TEN, List.of(riesgo(), riesgo()));

            assertThat(poliza.getRiesgos()).hasSize(2);
        }

        @Test
        void mesesDeVigenciaDebenSerPositivos() {
            assertThatThrownBy(() -> Poliza.crear("POL-1", TipoPoliza.COLECTIVA, "Tomador", INICIO, 0,
                    BigDecimal.TEN, List.of()))
                    .isInstanceOf(ReglaNegocioException.class);
        }

        @Test
        void canonDebeSerPositivo() {
            assertThatThrownBy(() -> Poliza.crear("POL-1", TipoPoliza.COLECTIVA, "Tomador", INICIO, 12,
                    BigDecimal.ZERO, List.of()))
                    .isInstanceOf(ReglaNegocioException.class);
        }

        @Test
        void losRiesgosNoSePuedenModificarDesdeFuera() {
            Poliza poliza = colectiva();

            assertThatThrownBy(() -> poliza.getRiesgos().add(riesgo()))
                    .isInstanceOf(UnsupportedOperationException.class);
        }
    }

    @Nested
    @DisplayName("renovar")
    class Renovar {

        @Test
        void aplicaIpcRecalculaPrimaYAbreNuevaVigencia() {
            Poliza poliza = individual();

            poliza.renovar(new BigDecimal("0.0520"));

            assertThat(poliza.getEstado()).isEqualTo(EstadoPoliza.RENOVADA);
            assertThat(poliza.getValorCanon()).isEqualTo(new BigDecimal("1578000.00"));
            assertThat(poliza.getValorPrima()).isEqualTo(new BigDecimal("18936000.00"));
            assertThat(poliza.getFechaInicioVigencia()).isEqualTo(LocalDate.of(2027, 1, 1));
            assertThat(poliza.getFechaFinVigencia()).isEqualTo(LocalDate.of(2028, 1, 1));
            assertThat(poliza.getMesesVigencia()).isEqualTo(12);
        }

        @Test
        void redondeaElNuevoCanonConRedondeoBancario() {
            Poliza poliza = Poliza.crear("POL-3", TipoPoliza.COLECTIVA, "Tomador", INICIO, 1,
                    new BigDecimal("100.50"), List.of());

            poliza.renovar(new BigDecimal("0.05"));

            // 100.50 × 1.05 = 105.525 → HALF_EVEN → 105.52
            assertThat(poliza.getValorCanon()).isEqualTo(new BigDecimal("105.52"));
        }

        @Test
        void unaPolizaRenovadaPuedeRenovarseDeNuevo() {
            Poliza poliza = colectiva();
            poliza.renovar(new BigDecimal("0.10"));

            poliza.renovar(new BigDecimal("0.10"));

            assertThat(poliza.getValorCanon()).isEqualTo(new BigDecimal("2420000.00"));
            assertThat(poliza.getFechaInicioVigencia()).isEqualTo(LocalDate.of(2027, 1, 1));
        }

        @Test
        void noSePuedeRenovarUnaPolizaCancelada() {
            Poliza poliza = individual();
            poliza.cancelar();

            assertThatThrownBy(() -> poliza.renovar(new BigDecimal("0.05")))
                    .isInstanceOf(ConflictoEstadoException.class);
        }
    }

    @Nested
    @DisplayName("cancelar")
    class Cancelar {

        @Test
        void cancelaLaPolizaYTodosSusRiesgos() {
            Poliza poliza = Poliza.crear("POL-1", TipoPoliza.COLECTIVA, "Tomador", INICIO, 12,
                    BigDecimal.TEN, List.of(riesgo(), riesgo()));

            poliza.cancelar();

            assertThat(poliza.getEstado()).isEqualTo(EstadoPoliza.CANCELADA);
            assertThat(poliza.getRiesgos()).allMatch(Riesgo::estaCancelado);
        }

        @Test
        void ignoraLosRiesgosQueYaEstabanCancelados() {
            Poliza poliza = Poliza.crear("POL-1", TipoPoliza.COLECTIVA, "Tomador", INICIO, 12,
                    BigDecimal.TEN, List.of(riesgo(), riesgo()));
            poliza.getRiesgos().get(0).cancelar();

            poliza.cancelar();

            assertThat(poliza.getRiesgos()).allMatch(Riesgo::estaCancelado);
        }

        @Test
        void cancelarDosVecesEsUnConflicto() {
            Poliza poliza = individual();
            poliza.cancelar();

            assertThatThrownBy(poliza::cancelar).isInstanceOf(ConflictoEstadoException.class);
        }
    }

    @Nested
    @DisplayName("agregarRiesgo")
    class AgregarRiesgo {

        @Test
        void agregaRiesgoAPolizaColectiva() {
            Poliza poliza = colectiva();
            Riesgo nuevo = riesgo();

            poliza.agregarRiesgo(nuevo);

            assertThat(poliza.getRiesgos()).containsExactly(nuevo);
            assertThat(nuevo.getPoliza()).isSameAs(poliza);
        }

        @Test
        void agregaRiesgoAPolizaColectivaRenovada() {
            Poliza poliza = colectiva();
            poliza.renovar(new BigDecimal("0.05"));

            poliza.agregarRiesgo(riesgo());

            assertThat(poliza.getRiesgos()).hasSize(1);
        }

        @Test
        void rechazaRiesgoEnPolizaIndividual() {
            Poliza poliza = individual();

            assertThatThrownBy(() -> poliza.agregarRiesgo(riesgo()))
                    .isInstanceOf(ReglaNegocioException.class);
        }

        @Test
        void rechazaRiesgoEnPolizaCancelada() {
            Poliza poliza = colectiva();
            poliza.cancelar();

            assertThatThrownBy(() -> poliza.agregarRiesgo(riesgo()))
                    .isInstanceOf(ConflictoEstadoException.class);
        }
    }
}
