package com.segurosbolivar.polizas.infrastructure.notificacion;

import com.segurosbolivar.polizas.domain.event.PolizaCreadaEvent;
import com.segurosbolivar.polizas.domain.event.PolizaRenovadaEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Simula el envío de correo y SMS al tomador ante eventos de dominio.
 * <p>
 * Escucha en AFTER_COMMIT: solo se notifica al cliente si la operación quedó realmente persistida.
 * Los logs registran identificadores, nunca datos de contacto del tomador.
 */
@Service
public class NotificacionService {

    private static final Logger log = LoggerFactory.getLogger(NotificacionService.class);

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void alCrearPoliza(PolizaCreadaEvent evento) {
        enviar("CREACION", evento.polizaId(), evento.numero());
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void alRenovarPoliza(PolizaRenovadaEvent evento) {
        enviar("RENOVACION", evento.polizaId(), evento.numero());
    }

    private void enviar(String motivo, Long polizaId, String numero) {
        log.info("[SIMULADO] Correo enviado al tomador motivo={} polizaId={} numero={}", motivo, polizaId, numero);
        log.info("[SIMULADO] SMS enviado al tomador motivo={} polizaId={} numero={}", motivo, polizaId, numero);
    }
}
