package com.segurosbolivar.polizas.infrastructure.security;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import java.util.List;

/**
 * Configuración de seguridad ({@code seguridad.*}). La API key se toma de la variable de entorno
 * API_KEY cuando existe, para no depender del valor de ejemplo en ambientes reales.
 */
@Validated
@ConfigurationProperties(prefix = "seguridad")
public record SeguridadProperties(@NotBlank String apiKey, @Valid @NotNull Cors cors) {

    public record Cors(@NotEmpty List<String> origenesPermitidos) {
    }
}
