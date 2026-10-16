package com.segurosbolivar.polizas.domain.exception;

/**
 * El recurso solicitado no existe. Se traduce a HTTP 404.
 */
public class RecursoNoEncontradoException extends RuntimeException {

    public RecursoNoEncontradoException(String recurso, Long id) {
        super("No existe %s con id %d".formatted(recurso, id));
    }
}
