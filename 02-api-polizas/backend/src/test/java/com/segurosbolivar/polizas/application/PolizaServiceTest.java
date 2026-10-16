package com.segurosbolivar.polizas.application;

import com.segurosbolivar.polizas.application.command.CrearPolizaCommand;
import com.segurosbolivar.polizas.application.command.CrearRiesgoCommand;
import com.segurosbolivar.polizas.domain.event.PolizaCreadaEvent;
import com.segurosbolivar.polizas.domain.event.PolizaRenovadaEvent;
import com.segurosbolivar.polizas.domain.exception.ConflictoEstadoException;
import com.segurosbolivar.polizas.domain.exception.RecursoNoEncontradoException;
import com.segurosbolivar.polizas.domain.exception.ReglaNegocioException;
import com.segurosbolivar.polizas.domain.model.EstadoPoliza;
import com.segurosbolivar.polizas.domain.model.EstadoRiesgo;
import com.segurosbolivar.polizas.domain.model.Poliza;
import com.segurosbolivar.polizas.domain.model.Riesgo;
import com.segurosbolivar.polizas.domain.model.TipoPoliza;
import com.segurosbolivar.polizas.domain.port.CorePort;
import com.segurosbolivar.polizas.domain.port.EventoCore;
import com.segurosbolivar.polizas.domain.port.OperacionCore;
import com.segurosbolivar.polizas.infrastructure.persistence.PolizaRepository;
import com.segurosbolivar.polizas.infrastructure.persistence.RiesgoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.mockito.AdditionalAnswers.returnsFirstArg;

@ExtendWith(MockitoExtension.class)
class PolizaServiceTest {

    private static final BigDecimal IPC = new BigDecimal("0.05");

    @Mock
    private PolizaRepository polizaRepository;
    @Mock
    private RiesgoRepository riesgoRepository;
    @Mock
    private CorePort corePort;
    @Mock
    private ApplicationEventPublisher eventPublisher;

    private PolizaService service;

    @BeforeEach
    void setUp() {
        service = new PolizaService(polizaRepository, riesgoRepository, corePort, eventPublisher,
                new RenovacionProperties(IPC));
    }

    private static Poliza poliza(Long id, TipoPoliza tipo) {
        List<Riesgo> riesgos = tipo == TipoPoliza.INDIVIDUAL
                ? List.of(Riesgo.nuevo("Dirección", "Arrendatario", "Arrendador"))
                : List.of();
        Poliza poliza = Poliza.crear("POL-%06d".formatted(id), tipo, "Tomador", LocalDate.of(2026, 1, 1), 12,
                new BigDecimal("1000000"), riesgos);
        ReflectionTestUtils.setField(poliza, "id", id);
        return poliza;
    }

    private static CrearRiesgoCommand riesgoCommand() {
        return new CrearRiesgoCommand("Calle 1 # 2-3", "Arrendatario", "Arrendador");
    }

    @Test
    void listarDelegaEnElRepositorioConLosFiltros() {
        List<Poliza> esperadas = List.of(poliza(1L, TipoPoliza.COLECTIVA));
        when(polizaRepository.buscar(TipoPoliza.COLECTIVA, EstadoPoliza.ACTIVA)).thenReturn(esperadas);

        assertThat(service.listar(TipoPoliza.COLECTIVA, EstadoPoliza.ACTIVA)).isSameAs(esperadas);
    }

    @Test
    void obtenerLanzaNoEncontradoSiNoExiste() {
        when(polizaRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.obtener(99L)).isInstanceOf(RecursoNoEncontradoException.class);
    }

    @Test
    void listarRiesgosValidaQueExistaLaPoliza() {
        when(polizaRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.listarRiesgos(99L)).isInstanceOf(RecursoNoEncontradoException.class);
        verifyNoInteractions(riesgoRepository);
    }

    @Test
    void listarRiesgosDevuelveLosDeLaPoliza() {
        Poliza poliza = poliza(1L, TipoPoliza.INDIVIDUAL);
        when(polizaRepository.findById(1L)).thenReturn(Optional.of(poliza));
        when(riesgoRepository.findByPolizaIdOrderByIdAsc(1L)).thenReturn(poliza.getRiesgos());

        assertThat(service.listarRiesgos(1L)).hasSize(1);
    }

    @Test
    void crearAsignaNumeroNotificaAlCoreYPublicaEvento() {
        when(polizaRepository.siguienteConsecutivoNumero()).thenReturn(1000L);
        when(polizaRepository.saveAndFlush(any(Poliza.class))).thenAnswer(returnsFirstArg());
        CrearPolizaCommand command = new CrearPolizaCommand(TipoPoliza.INDIVIDUAL, "Tomador",
                LocalDate.of(2026, 1, 1), 12, new BigDecimal("1000000"), List.of(riesgoCommand()));

        Poliza creada = service.crear(command);

        assertThat(creada.getNumero()).isEqualTo("POL-001000");
        assertThat(creada.getEstado()).isEqualTo(EstadoPoliza.ACTIVA);
        assertThat(creada.getRiesgos()).hasSize(1);
        verify(corePort).notificar(EventoCore.actualizacion(OperacionCore.CREACION, creada.getId()));
        verify(eventPublisher).publishEvent(new PolizaCreadaEvent(creada.getId(), "POL-001000", TipoPoliza.INDIVIDUAL));
    }

    @Test
    void crearIndividualSinRiesgoNoPersisteNiNotifica() {
        when(polizaRepository.siguienteConsecutivoNumero()).thenReturn(1000L);
        CrearPolizaCommand command = new CrearPolizaCommand(TipoPoliza.INDIVIDUAL, "Tomador",
                LocalDate.of(2026, 1, 1), 12, new BigDecimal("1000000"), null);

        assertThatThrownBy(() -> service.crear(command)).isInstanceOf(ReglaNegocioException.class);
        verify(polizaRepository, never()).saveAndFlush(any());
        verifyNoInteractions(corePort, eventPublisher);
    }

    @Test
    void renovarAplicaElIpcConfiguradoNotificaYPublicaEvento() {
        Poliza poliza = poliza(1L, TipoPoliza.INDIVIDUAL);
        when(polizaRepository.findById(1L)).thenReturn(Optional.of(poliza));

        Poliza renovada = service.renovar(1L);

        assertThat(renovada.getEstado()).isEqualTo(EstadoPoliza.RENOVADA);
        assertThat(renovada.getValorCanon()).isEqualTo(new BigDecimal("1050000.00"));
        verify(polizaRepository).saveAndFlush(poliza);
        verify(corePort).notificar(EventoCore.actualizacion(OperacionCore.RENOVACION, 1L));
        ArgumentCaptor<PolizaRenovadaEvent> evento = ArgumentCaptor.forClass(PolizaRenovadaEvent.class);
        verify(eventPublisher).publishEvent(evento.capture());
        assertThat(evento.getValue().nuevaPrima()).isEqualTo(new BigDecimal("12600000.00"));
        assertThat(evento.getValue().nuevaFechaFinVigencia()).isEqualTo(LocalDate.of(2028, 1, 1));
    }

    @Test
    void renovarUnaCanceladaEsConflictoYNoNotifica() {
        Poliza poliza = poliza(1L, TipoPoliza.INDIVIDUAL);
        poliza.cancelar();
        when(polizaRepository.findById(1L)).thenReturn(Optional.of(poliza));

        assertThatThrownBy(() -> service.renovar(1L)).isInstanceOf(ConflictoEstadoException.class);
        verifyNoInteractions(corePort, eventPublisher);
    }

    @Test
    void cancelarCancelaPolizaYRiesgosYNotificaAlCore() {
        Poliza poliza = poliza(1L, TipoPoliza.INDIVIDUAL);
        when(polizaRepository.findById(1L)).thenReturn(Optional.of(poliza));

        Poliza cancelada = service.cancelar(1L);

        assertThat(cancelada.getEstado()).isEqualTo(EstadoPoliza.CANCELADA);
        assertThat(cancelada.getRiesgos()).extracting(Riesgo::getEstado).containsOnly(EstadoRiesgo.CANCELADO);
        verify(corePort).notificar(EventoCore.actualizacion(OperacionCore.CANCELACION, 1L));
        verifyNoInteractions(eventPublisher);
    }

    @Test
    void cancelarNoExistenteEsNoEncontrado() {
        when(polizaRepository.findById(anyLong())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.cancelar(5L)).isInstanceOf(RecursoNoEncontradoException.class);
        verifyNoInteractions(corePort);
    }

    @Test
    void agregarRiesgoAColectivaNotificaAlCore() {
        Poliza poliza = poliza(4L, TipoPoliza.COLECTIVA);
        when(polizaRepository.findById(4L)).thenReturn(Optional.of(poliza));

        Riesgo riesgo = service.agregarRiesgo(4L, riesgoCommand());

        assertThat(riesgo.getPoliza()).isSameAs(poliza);
        assertThat(poliza.getRiesgos()).containsExactly(riesgo);
        verify(riesgoRepository).saveAndFlush(riesgo);
        verify(corePort).notificar(EventoCore.actualizacion(OperacionCore.RIESGO_AGREGADO, 4L));
    }

    @Test
    void agregarRiesgoAIndividualEsReglaDeNegocioYNoNotifica() {
        when(polizaRepository.findById(1L)).thenReturn(Optional.of(poliza(1L, TipoPoliza.INDIVIDUAL)));

        assertThatThrownBy(() -> service.agregarRiesgo(1L, riesgoCommand()))
                .isInstanceOf(ReglaNegocioException.class);
        verifyNoInteractions(corePort);
    }
}
