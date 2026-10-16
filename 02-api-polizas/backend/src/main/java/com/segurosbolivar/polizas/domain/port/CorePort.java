package com.segurosbolivar.polizas.domain.port;

/**
 * Puerto de salida hacia el sistema CORE de la compañía.
 * <p>
 * Contrato: la implementación NO debe lanzar excepciones. Un fallo de comunicación con el CORE
 * se registra en logs y no revierte la operación de negocio (ver DECISIONES.md).
 */
public interface CorePort {

    void notificar(EventoCore evento);
}
