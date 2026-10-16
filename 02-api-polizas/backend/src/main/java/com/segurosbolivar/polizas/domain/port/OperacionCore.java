package com.segurosbolivar.polizas.domain.port;

/**
 * Operación concreta que originó la notificación al CORE.
 */
public enum OperacionCore {
    CREACION,
    RENOVACION,
    CANCELACION,
    RIESGO_AGREGADO,
    RIESGO_CANCELADO
}
