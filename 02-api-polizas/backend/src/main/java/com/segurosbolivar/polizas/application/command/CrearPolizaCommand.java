package com.segurosbolivar.polizas.application.command;

import com.segurosbolivar.polizas.domain.model.TipoPoliza;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Datos para crear una póliza junto con sus riesgos iniciales.
 */
public record CrearPolizaCommand(TipoPoliza tipo, String tomador, LocalDate fechaInicioVigencia,
                                 int mesesVigencia, BigDecimal valorCanon, List<CrearRiesgoCommand> riesgos) {

    public CrearPolizaCommand {
        riesgos = riesgos == null ? List.of() : List.copyOf(riesgos);
    }
}
