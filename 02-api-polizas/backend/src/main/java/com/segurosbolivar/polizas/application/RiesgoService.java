package com.segurosbolivar.polizas.application;

import com.segurosbolivar.polizas.domain.exception.RecursoNoEncontradoException;
import com.segurosbolivar.polizas.domain.model.Riesgo;
import com.segurosbolivar.polizas.domain.port.CorePort;
import com.segurosbolivar.polizas.domain.port.EventoCore;
import com.segurosbolivar.polizas.domain.port.OperacionCore;
import com.segurosbolivar.polizas.infrastructure.persistence.RiesgoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Casos de uso sobre riesgos individuales.
 */
@Service
@Transactional
public class RiesgoService {

    private static final Logger log = LoggerFactory.getLogger(RiesgoService.class);

    private final RiesgoRepository riesgoRepository;
    private final CorePort corePort;

    public RiesgoService(RiesgoRepository riesgoRepository, CorePort corePort) {
        this.riesgoRepository = riesgoRepository;
        this.corePort = corePort;
    }

    /**
     * Cancela un riesgo. No altera el estado de la póliza, aunque fuera su único riesgo activo
     * (el enunciado no define esa regla; ver DECISIONES.md).
     */
    public Riesgo cancelar(Long riesgoId) {
        Riesgo riesgo = riesgoRepository.findById(riesgoId)
                .orElseThrow(() -> new RecursoNoEncontradoException("riesgo", riesgoId));
        riesgo.cancelar();
        riesgoRepository.saveAndFlush(riesgo);

        Long polizaId = riesgo.getPoliza().getId();
        log.info("Riesgo cancelado id={} polizaId={}", riesgo.getId(), polizaId);

        corePort.notificar(EventoCore.actualizacion(OperacionCore.RIESGO_CANCELADO, polizaId));
        return riesgo;
    }
}
