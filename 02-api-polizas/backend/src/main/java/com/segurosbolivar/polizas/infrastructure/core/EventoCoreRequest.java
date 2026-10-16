package com.segurosbolivar.polizas.infrastructure.core;

import com.segurosbolivar.polizas.domain.port.OperacionCore;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Cuerpo recibido por el mock del CORE. {@code operacion} es opcional para aceptar también
 * el contrato mínimo del enunciado: {"evento":"ACTUALIZACION","polizaId":555}.
 * {@code evento} solo admite mayúsculas y guion bajo: se escribe en logs y no debe permitir inyección (CRLF).
 */
public record EventoCoreRequest(
        @Schema(example = "ACTUALIZACION") @NotBlank @Size(max = 50) @Pattern(regexp = "^[A-Z_]+$") String evento,
        @Schema(example = "RENOVACION") OperacionCore operacion,
        @Schema(example = "555") @NotNull Long polizaId) {
}
