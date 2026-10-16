package com.segurosbolivar.polizas.application;

import jakarta.validation.constraints.NotNull;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import java.math.BigDecimal;

/**
 * Parámetros de renovación configurables en application.yml ({@code polizas.renovacion.*}).
 *
 * @param ipc IPC expresado como fracción (0.0520 = 5.20 %)
 */
@Validated
@ConfigurationProperties(prefix = "polizas.renovacion")
public record RenovacionProperties(@NotNull BigDecimal ipc) {
}
