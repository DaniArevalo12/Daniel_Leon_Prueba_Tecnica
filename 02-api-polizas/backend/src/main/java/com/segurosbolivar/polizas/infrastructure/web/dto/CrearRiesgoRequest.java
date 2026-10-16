package com.segurosbolivar.polizas.infrastructure.web.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "Datos del inmueble arrendado a asegurar")
public record CrearRiesgoRequest(
        @Schema(example = "Calle 100 # 15-20 Apto 301, Bogotá")
        @NotBlank @Size(max = 200) String direccionInmueble,

        @Schema(example = "María Fernanda Ruiz")
        @NotBlank @Size(max = 150) String arrendatario,

        @Schema(description = "Arrendador (beneficiario)", example = "Inmobiliaria Andina S.A.S.")
        @NotBlank @Size(max = 150) String arrendador) {
}
