package com.segurosbolivar.polizas.infrastructure.core;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Simula el CORE de la compañía: solo registra en logs que se intentó enviar la operación.
 */
@RestController
@RequestMapping("/core-mock")
@Tag(name = "CORE (mock)", description = "Simulación del sistema CORE")
public class CoreMockController {

    private static final Logger log = LoggerFactory.getLogger(CoreMockController.class);

    @PostMapping("/evento")
    @ResponseStatus(HttpStatus.ACCEPTED)
    @Operation(summary = "Recibe un evento de actualización destinado al CORE")
    public void recibirEvento(@Valid @RequestBody EventoCoreRequest request) {
        log.info("[CORE-MOCK] Se intentó enviar la operación al CORE evento={} operacion={} polizaId={}",
                request.evento(), request.operacion(), request.polizaId());
    }
}
