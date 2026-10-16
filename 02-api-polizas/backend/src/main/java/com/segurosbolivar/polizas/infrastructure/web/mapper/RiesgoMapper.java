package com.segurosbolivar.polizas.infrastructure.web.mapper;

import com.segurosbolivar.polizas.application.command.CrearRiesgoCommand;
import com.segurosbolivar.polizas.domain.model.Riesgo;
import com.segurosbolivar.polizas.infrastructure.web.dto.CrearRiesgoRequest;
import com.segurosbolivar.polizas.infrastructure.web.dto.RiesgoResponse;

import java.util.List;

public final class RiesgoMapper {

    private RiesgoMapper() {
    }

    public static CrearRiesgoCommand aCommand(CrearRiesgoRequest request) {
        return new CrearRiesgoCommand(request.direccionInmueble().strip(), request.arrendatario().strip(),
                request.arrendador().strip());
    }

    public static RiesgoResponse aResponse(Riesgo riesgo) {
        return new RiesgoResponse(
                riesgo.getId(),
                riesgo.getPoliza().getId(),
                riesgo.getDireccionInmueble(),
                riesgo.getArrendatario(),
                riesgo.getArrendador(),
                riesgo.getEstado(),
                riesgo.getFechaCreacion(),
                riesgo.getFechaActualizacion());
    }

    public static List<RiesgoResponse> aResponse(List<Riesgo> riesgos) {
        return riesgos.stream().map(RiesgoMapper::aResponse).toList();
    }
}
