package com.segurosbolivar.polizas.infrastructure.web.controller;

import com.segurosbolivar.polizas.application.RiesgoService;
import com.segurosbolivar.polizas.infrastructure.web.dto.RiesgoResponse;
import com.segurosbolivar.polizas.infrastructure.web.mapper.RiesgoMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/riesgos")
@Tag(name = "Riesgos", description = "Operaciones sobre riesgos individuales")
public class RiesgoController {

    private final RiesgoService riesgoService;

    public RiesgoController(RiesgoService riesgoService) {
        this.riesgoService = riesgoService;
    }

    @PostMapping("/{id}/cancelar")
    @Operation(summary = "Cancela un riesgo")
    public RiesgoResponse cancelar(@PathVariable Long id) {
        return RiesgoMapper.aResponse(riesgoService.cancelar(id));
    }
}
