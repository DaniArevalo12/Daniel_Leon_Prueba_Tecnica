package com.segurosbolivar.polizas.infrastructure.web.dto;

import com.segurosbolivar.polizas.domain.model.TipoPoliza;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Schema(description = "Datos para crear una póliza. INDIVIDUAL exige exactamente un riesgo; COLECTIVA admite cero o más.")
public record CrearPolizaRequest(
        @Schema(example = "INDIVIDUAL")
        @NotNull TipoPoliza tipo,

        @Schema(example = "Inmobiliaria Andina S.A.S.")
        @NotBlank @Size(max = 150) String tomador,

        @Schema(example = "2026-11-01")
        @NotNull LocalDate fechaInicioVigencia,

        @Schema(example = "12")
        @NotNull @Min(1) @Max(120) Integer mesesVigencia,

        @Schema(description = "Canon mensual de arrendamiento", example = "1800000.00")
        @NotNull @DecimalMin(value = "0.01") @Digits(integer = 13, fraction = 2) BigDecimal valorCanon,

        @Size(max = 100) List<@Valid @NotNull CrearRiesgoRequest> riesgos) {
}
