package com.segurosbolivar.polizas.infrastructure.web.controller;

import com.segurosbolivar.polizas.application.RenovacionProperties;
import com.segurosbolivar.polizas.infrastructure.web.dto.ParametrosRenovacionResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Expone los parámetros de negocio que la interfaz necesita mostrar, para que la configuración
 * tenga una única fuente de verdad (application.yml) y no se duplique en el frontend.
 */
@RestController
@RequestMapping("/parametros")
@Tag(name = "Parámetros", description = "Parámetros de negocio vigentes")
public class ParametrosController {

    private final RenovacionProperties renovacionProperties;

    public ParametrosController(RenovacionProperties renovacionProperties) {
        this.renovacionProperties = renovacionProperties;
    }

    @GetMapping("/renovacion")
    @Operation(summary = "Consulta el IPC vigente que se aplicará al renovar una póliza")
    public ParametrosRenovacionResponse renovacion() {
        return new ParametrosRenovacionResponse(renovacionProperties.ipc());
    }
}
