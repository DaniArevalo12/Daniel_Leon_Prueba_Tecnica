package com.segurosbolivar.polizas.infrastructure.web.dto;

import com.segurosbolivar.polizas.domain.model.EstadoPoliza;
import com.segurosbolivar.polizas.domain.model.TipoPoliza;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record PolizaResponse(
        Long id,
        String numero,
        TipoPoliza tipo,
        EstadoPoliza estado,
        String tomador,
        LocalDate fechaInicioVigencia,
        LocalDate fechaFinVigencia,
        Integer mesesVigencia,
        BigDecimal valorCanon,
        BigDecimal valorPrima,
        Long version,
        LocalDateTime fechaCreacion,
        LocalDateTime fechaActualizacion) {
}
