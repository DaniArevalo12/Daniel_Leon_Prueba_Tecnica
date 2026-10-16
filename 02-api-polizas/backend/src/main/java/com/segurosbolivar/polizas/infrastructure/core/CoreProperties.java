package com.segurosbolivar.polizas.infrastructure.core;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import java.time.Duration;

/**
 * Conexión con el CORE ({@code core.*}).
 */
@Validated
@ConfigurationProperties(prefix = "core")
public record CoreProperties(@NotBlank String baseUrl, @NotNull Duration timeoutConexion,
                             @NotNull Duration timeoutLectura) {
}
