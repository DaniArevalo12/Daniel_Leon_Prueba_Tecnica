package com.segurosbolivar.polizas.domain.model;

import com.segurosbolivar.polizas.domain.exception.ConflictoEstadoException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class RiesgoTest {

    @Test
    void nuevoRiesgoNaceActivo() {
        Riesgo riesgo = Riesgo.nuevo("Calle 1 # 2-3", "Arrendatario", "Arrendador");

        assertThat(riesgo.getEstado()).isEqualTo(EstadoRiesgo.ACTIVO);
        assertThat(riesgo.getDireccionInmueble()).isEqualTo("Calle 1 # 2-3");
        assertThat(riesgo.getArrendatario()).isEqualTo("Arrendatario");
        assertThat(riesgo.getArrendador()).isEqualTo("Arrendador");
    }

    @Test
    void cancelarCambiaElEstado() {
        Riesgo riesgo = Riesgo.nuevo("Calle 1 # 2-3", "Arrendatario", "Arrendador");

        riesgo.cancelar();

        assertThat(riesgo.getEstado()).isEqualTo(EstadoRiesgo.CANCELADO);
    }

    @Test
    void cancelarDosVecesEsUnConflicto() {
        Riesgo riesgo = Riesgo.nuevo("Calle 1 # 2-3", "Arrendatario", "Arrendador");
        riesgo.cancelar();

        assertThatThrownBy(riesgo::cancelar).isInstanceOf(ConflictoEstadoException.class);
    }
}
