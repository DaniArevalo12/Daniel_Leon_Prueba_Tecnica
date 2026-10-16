package com.segurosbolivar.polizas.infrastructure.web.mapper;

import com.segurosbolivar.polizas.application.command.CrearPolizaCommand;
import com.segurosbolivar.polizas.application.command.CrearRiesgoCommand;
import com.segurosbolivar.polizas.domain.model.Poliza;
import com.segurosbolivar.polizas.infrastructure.web.dto.CrearPolizaRequest;
import com.segurosbolivar.polizas.infrastructure.web.dto.PolizaResponse;

import java.util.List;

/**
 * Mapeo manual entre la capa web y la de aplicación: explícito, sin reflexión y fácil de depurar.
 */
public final class PolizaMapper {

    private PolizaMapper() {
    }

    public static CrearPolizaCommand aCommand(CrearPolizaRequest request) {
        List<CrearRiesgoCommand> riesgos = request.riesgos() == null
                ? List.of()
                : request.riesgos().stream().map(RiesgoMapper::aCommand).toList();
        return new CrearPolizaCommand(request.tipo(), request.tomador().strip(), request.fechaInicioVigencia(),
                request.mesesVigencia(), request.valorCanon(), riesgos);
    }

    public static PolizaResponse aResponse(Poliza poliza) {
        return new PolizaResponse(
                poliza.getId(),
                poliza.getNumero(),
                poliza.getTipo(),
                poliza.getEstado(),
                poliza.getTomador(),
                poliza.getFechaInicioVigencia(),
                poliza.getFechaFinVigencia(),
                poliza.getMesesVigencia(),
                poliza.getValorCanon(),
                poliza.getValorPrima(),
                poliza.getVersion(),
                poliza.getFechaCreacion(),
                poliza.getFechaActualizacion());
    }

    public static List<PolizaResponse> aResponse(List<Poliza> polizas) {
        return polizas.stream().map(PolizaMapper::aResponse).toList();
    }
}
