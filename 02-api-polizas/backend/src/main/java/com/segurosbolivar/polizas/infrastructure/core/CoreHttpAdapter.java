package com.segurosbolivar.polizas.infrastructure.core;

import com.segurosbolivar.polizas.domain.port.CorePort;
import com.segurosbolivar.polizas.domain.port.EventoCore;
import com.segurosbolivar.polizas.infrastructure.config.CorrelationIdFilter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * Adaptador HTTP del puerto CORE. Envía el evento a {@code POST /core-mock/evento}.
 * <p>
 * Cumple el contrato del puerto: ningún error (timeout, conexión rechazada, 4xx/5xx) se propaga.
 * Se registra en logs con el correlationId de la petición para poder reprocesarlo.
 */
@Component
public class CoreHttpAdapter implements CorePort {

    static final String RUTA_EVENTO = "/core-mock/evento";
    private static final Logger log = LoggerFactory.getLogger(CoreHttpAdapter.class);

    private final RestClient coreRestClient;

    public CoreHttpAdapter(RestClient coreRestClient) {
        this.coreRestClient = coreRestClient;
    }

    @Override
    public void notificar(EventoCore evento) {
        try {
            coreRestClient.post()
                    .uri(RUTA_EVENTO)
                    .contentType(MediaType.APPLICATION_JSON)
                    .headers(headers -> {
                        String correlationId = MDC.get(CorrelationIdFilter.MDC_KEY);
                        if (correlationId != null) {
                            headers.set(CorrelationIdFilter.HEADER, correlationId);
                        }
                    })
                    .body(evento)
                    .retrieve()
                    .toBodilessEntity();
            log.info("Evento enviado al CORE operacion={} polizaId={}", evento.operacion(), evento.polizaId());
        } catch (RuntimeException ex) {
            log.warn("No fue posible notificar al CORE operacion={} polizaId={} causa={}: {}",
                    evento.operacion(), evento.polizaId(), ex.getClass().getSimpleName(), ex.getMessage());
        }
    }
}
