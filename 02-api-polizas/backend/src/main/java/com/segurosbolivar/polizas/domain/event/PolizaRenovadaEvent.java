package com.segurosbolivar.polizas.domain.event;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Evento de dominio publicado cuando se renueva una póliza.
 */
public record PolizaRenovadaEvent(Long polizaId, String numero, BigDecimal nuevoCanon,
                                  BigDecimal nuevaPrima, LocalDate nuevaFechaFinVigencia) {
}
