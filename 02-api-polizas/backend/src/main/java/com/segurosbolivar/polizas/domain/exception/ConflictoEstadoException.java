package com.segurosbolivar.polizas.domain.exception;

/**
 * La operación no es posible por el estado actual del recurso
 * (p. ej. cancelar algo ya cancelado o renovar una póliza cancelada). Se traduce a HTTP 409.
 */
public class ConflictoEstadoException extends RuntimeException {

    public ConflictoEstadoException(String mensaje) {
        super(mensaje);
    }
}
