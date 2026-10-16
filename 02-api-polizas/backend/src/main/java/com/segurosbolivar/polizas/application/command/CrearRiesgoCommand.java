package com.segurosbolivar.polizas.application.command;

/**
 * Datos para crear un riesgo. Desacopla los casos de uso de los DTOs de la capa web.
 */
public record CrearRiesgoCommand(String direccionInmueble, String arrendatario, String arrendador) {
}
