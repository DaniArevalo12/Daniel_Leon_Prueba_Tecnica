package com.segurosbolivar.polizas.application;

import com.segurosbolivar.polizas.domain.exception.ConflictoEstadoException;
import com.segurosbolivar.polizas.domain.exception.RecursoNoEncontradoException;
import com.segurosbolivar.polizas.domain.model.EstadoPoliza;
import com.segurosbolivar.polizas.domain.model.EstadoRiesgo;
import com.segurosbolivar.polizas.domain.model.Poliza;
import com.segurosbolivar.polizas.domain.model.Riesgo;
import com.segurosbolivar.polizas.domain.model.TipoPoliza;
import com.segurosbolivar.polizas.domain.port.CorePort;
import com.segurosbolivar.polizas.domain.port.EventoCore;
import com.segurosbolivar.polizas.domain.port.OperacionCore;
import com.segurosbolivar.polizas.infrastructure.persistence.RiesgoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RiesgoServiceTest {

    @Mock
    private RiesgoRepository riesgoRepository;
    @Mock
    private CorePort corePort;

    private RiesgoService service;
    private Poliza poliza;
    private Riesgo riesgo;

    @BeforeEach
    void setUp() {
        service = new RiesgoService(riesgoRepository, corePort);
        riesgo = Riesgo.nuevo("Dirección", "Arrendatario", "Arrendador");
        ReflectionTestUtils.setField(riesgo, "id", 10L);
        poliza = Poliza.crear("POL-000001", TipoPoliza.INDIVIDUAL, "Tomador", LocalDate.of(2026, 1, 1), 12,
                BigDecimal.TEN, List.of(riesgo));
        ReflectionTestUtils.setField(poliza, "id", 1L);
    }

    @Test
    void cancelaElRiesgoYNotificaAlCoreConElIdDeLaPoliza() {
        when(riesgoRepository.findById(10L)).thenReturn(Optional.of(riesgo));

        Riesgo cancelado = service.cancelar(10L);

        assertThat(cancelado.getEstado()).isEqualTo(EstadoRiesgo.CANCELADO);
        assertThat(poliza.getEstado()).isEqualTo(EstadoPoliza.ACTIVA);
        verify(riesgoRepository).saveAndFlush(riesgo);
        verify(corePort).notificar(EventoCore.actualizacion(OperacionCore.RIESGO_CANCELADO, 1L));
    }

    @Test
    void cancelarUnRiesgoYaCanceladoEsConflicto() {
        riesgo.cancelar();
        when(riesgoRepository.findById(10L)).thenReturn(Optional.of(riesgo));

        assertThatThrownBy(() -> service.cancelar(10L)).isInstanceOf(ConflictoEstadoException.class);
        verifyNoInteractions(corePort);
    }

    @Test
    void cancelarUnRiesgoInexistenteEsNoEncontrado() {
        when(riesgoRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.cancelar(99L)).isInstanceOf(RecursoNoEncontradoException.class);
        verifyNoInteractions(corePort);
    }
}
