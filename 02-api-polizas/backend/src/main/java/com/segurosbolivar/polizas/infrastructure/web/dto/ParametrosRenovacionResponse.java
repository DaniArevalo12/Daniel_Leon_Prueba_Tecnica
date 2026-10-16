package com.segurosbolivar.polizas.infrastructure.web.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;

public record ParametrosRenovacionResponse(
        @Schema(description = "IPC aplicado al canon al renovar, como fracción (0.0520 = 5,20 %)", example = "0.0520")
        BigDecimal ipc) {
}
