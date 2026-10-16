package com.segurosbolivar.polizas.domain.port;

/**
 * Mensaje enviado al CORE. El campo {@code evento} siempre es "ACTUALIZACION" para respetar
 * el contrato del enunciado; {@code operacion} detalla qué cambió.
 */
public record EventoCore(String evento, OperacionCore operacion, Long polizaId) {

    public static final String ACTUALIZACION = "ACTUALIZACION";

    public static EventoCore actualizacion(OperacionCore operacion, Long polizaId) {
        return new EventoCore(ACTUALIZACION, operacion, polizaId);
    }
}
