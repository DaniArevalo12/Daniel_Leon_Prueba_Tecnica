package com.segurosbolivar.polizas.infrastructure.web.dto;

import com.segurosbolivar.polizas.domain.model.EstadoRiesgo;

import java.time.LocalDateTime;

public record RiesgoResponse(
        Long id,
        Long polizaId,
        String direccionInmueble,
        String arrendatario,
        String arrendador,
        EstadoRiesgo estado,
        LocalDateTime fechaCreacion,
        LocalDateTime fechaActualizacion) {
}
