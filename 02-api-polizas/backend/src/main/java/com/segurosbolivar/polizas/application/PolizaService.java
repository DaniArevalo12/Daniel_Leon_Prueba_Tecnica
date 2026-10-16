package com.segurosbolivar.polizas.application;

import com.segurosbolivar.polizas.application.command.CrearPolizaCommand;
import com.segurosbolivar.polizas.application.command.CrearRiesgoCommand;
import com.segurosbolivar.polizas.domain.event.PolizaCreadaEvent;
import com.segurosbolivar.polizas.domain.event.PolizaRenovadaEvent;
import com.segurosbolivar.polizas.domain.exception.RecursoNoEncontradoException;
import com.segurosbolivar.polizas.domain.model.EstadoPoliza;
import com.segurosbolivar.polizas.domain.model.Poliza;
import com.segurosbolivar.polizas.domain.model.Riesgo;
import com.segurosbolivar.polizas.domain.model.TipoPoliza;
import com.segurosbolivar.polizas.domain.port.CorePort;
import com.segurosbolivar.polizas.domain.port.EventoCore;
import com.segurosbolivar.polizas.domain.port.OperacionCore;
import com.segurosbolivar.polizas.infrastructure.persistence.PolizaRepository;
import com.segurosbolivar.polizas.infrastructure.persistence.RiesgoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Casos de uso de pólizas. Orquesta transacción, persistencia, notificación al CORE y eventos de dominio;
 * las reglas de negocio viven en {@link Poliza}.
 * <p>
 * Se hace {@code saveAndFlush} antes de llamar al CORE para que los errores de base de datos
 * (restricciones, bloqueo optimista) aparezcan antes de notificar una operación que no se completaría.
 */
@Service
@Transactional
public class PolizaService {

    private static final Logger log = LoggerFactory.getLogger(PolizaService.class);
    private static final String FORMATO_NUMERO = "POL-%06d";

    private final PolizaRepository polizaRepository;
    private final RiesgoRepository riesgoRepository;
    private final CorePort corePort;
    private final ApplicationEventPublisher eventPublisher;
    private final RenovacionProperties renovacionProperties;

    public PolizaService(PolizaRepository polizaRepository, RiesgoRepository riesgoRepository, CorePort corePort,
                         ApplicationEventPublisher eventPublisher, RenovacionProperties renovacionProperties) {
        this.polizaRepository = polizaRepository;
        this.riesgoRepository = riesgoRepository;
        this.corePort = corePort;
        this.eventPublisher = eventPublisher;
        this.renovacionProperties = renovacionProperties;
    }

    @Transactional(readOnly = true)
    public List<Poliza> listar(TipoPoliza tipo, EstadoPoliza estado) {
        return polizaRepository.buscar(tipo, estado);
    }

    @Transactional(readOnly = true)
    public Poliza obtener(Long id) {
        return polizaRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("póliza", id));
    }

    @Transactional(readOnly = true)
    public List<Riesgo> listarRiesgos(Long polizaId) {
        obtener(polizaId);
        return riesgoRepository.findByPolizaIdOrderByIdAsc(polizaId);
    }

    public Poliza crear(CrearPolizaCommand command) {
        String numero = FORMATO_NUMERO.formatted(polizaRepository.siguienteConsecutivoNumero());
        List<Riesgo> riesgos = command.riesgos().stream().map(PolizaService::aRiesgo).toList();

        Poliza poliza = polizaRepository.saveAndFlush(Poliza.crear(numero, command.tipo(), command.tomador(),
                command.fechaInicioVigencia(), command.mesesVigencia(), command.valorCanon(), riesgos));
        log.info("Póliza creada id={} numero={} tipo={} riesgos={}",
                poliza.getId(), poliza.getNumero(), poliza.getTipo(), riesgos.size());

        corePort.notificar(EventoCore.actualizacion(OperacionCore.CREACION, poliza.getId()));
        eventPublisher.publishEvent(new PolizaCreadaEvent(poliza.getId(), poliza.getNumero(), poliza.getTipo()));
        return poliza;
    }

    public Poliza renovar(Long id) {
        Poliza poliza = obtener(id);
        poliza.renovar(renovacionProperties.ipc());
        polizaRepository.saveAndFlush(poliza);
        log.info("Póliza renovada id={} ipc={} nuevaFechaFin={}",
                poliza.getId(), renovacionProperties.ipc(), poliza.getFechaFinVigencia());

        corePort.notificar(EventoCore.actualizacion(OperacionCore.RENOVACION, poliza.getId()));
        eventPublisher.publishEvent(new PolizaRenovadaEvent(poliza.getId(), poliza.getNumero(),
                poliza.getValorCanon(), poliza.getValorPrima(), poliza.getFechaFinVigencia()));
        return poliza;
    }

    public Poliza cancelar(Long id) {
        Poliza poliza = obtener(id);
        poliza.cancelar();
        polizaRepository.saveAndFlush(poliza);
        log.info("Póliza cancelada id={} junto con sus riesgos activos", poliza.getId());

        corePort.notificar(EventoCore.actualizacion(OperacionCore.CANCELACION, poliza.getId()));
        return poliza;
    }

    public Riesgo agregarRiesgo(Long polizaId, CrearRiesgoCommand command) {
        Poliza poliza = obtener(polizaId);
        Riesgo riesgo = aRiesgo(command);
        poliza.agregarRiesgo(riesgo);
        // Se persiste el riesgo directamente: hacer save de la póliza ya gestionada ejecuta un merge,
        // y la cascada persistiría una copia del riesgo en lugar de esta instancia (quedaría sin id).
        riesgoRepository.saveAndFlush(riesgo);
        log.info("Riesgo agregado id={} polizaId={}", riesgo.getId(), poliza.getId());

        corePort.notificar(EventoCore.actualizacion(OperacionCore.RIESGO_AGREGADO, poliza.getId()));
        return riesgo;
    }

    private static Riesgo aRiesgo(CrearRiesgoCommand command) {
        return Riesgo.nuevo(command.direccionInmueble(), command.arrendatario(), command.arrendador());
    }
}
