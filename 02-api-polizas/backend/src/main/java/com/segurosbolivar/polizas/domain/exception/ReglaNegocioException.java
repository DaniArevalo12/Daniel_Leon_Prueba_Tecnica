package com.segurosbolivar.polizas.domain.exception;

/**
 * La petición es sintácticamente válida pero viola una regla de negocio
 * independiente del estado (p. ej. agregar un riesgo a una póliza individual). Se traduce a HTTP 422.
 */
public class ReglaNegocioException extends RuntimeException {

    public ReglaNegocioException(String mensaje) {
        super(mensaje);
    }
}
