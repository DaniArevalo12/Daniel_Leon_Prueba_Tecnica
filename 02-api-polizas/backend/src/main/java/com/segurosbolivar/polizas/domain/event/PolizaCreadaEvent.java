package com.segurosbolivar.polizas.domain.event;

import com.segurosbolivar.polizas.domain.model.TipoPoliza;

/**
 * Evento de dominio publicado cuando se crea una póliza.
 * Solo transporta identificadores: los datos personales no viajan en eventos ni en logs.
 */
public record PolizaCreadaEvent(Long polizaId, String numero, TipoPoliza tipo) {
}
