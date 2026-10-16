package com.segurosbolivar.polizas.infrastructure.web.controller;

import com.segurosbolivar.polizas.application.PolizaService;
import com.segurosbolivar.polizas.domain.model.EstadoPoliza;
import com.segurosbolivar.polizas.domain.model.Poliza;
import com.segurosbolivar.polizas.domain.model.TipoPoliza;
import com.segurosbolivar.polizas.infrastructure.web.dto.CrearPolizaRequest;
import com.segurosbolivar.polizas.infrastructure.web.dto.CrearRiesgoRequest;
import com.segurosbolivar.polizas.infrastructure.web.dto.PolizaResponse;
import com.segurosbolivar.polizas.infrastructure.web.dto.RiesgoResponse;
import com.segurosbolivar.polizas.infrastructure.web.mapper.PolizaMapper;
import com.segurosbolivar.polizas.infrastructure.web.mapper.RiesgoMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/polizas")
@Tag(name = "Pólizas", description = "Gestión de pólizas de arrendamiento")
public class PolizaController {

    private final PolizaService polizaService;

    public PolizaController(PolizaService polizaService) {
        this.polizaService = polizaService;
    }

    @GetMapping
    @Operation(summary = "Lista pólizas con filtros opcionales por tipo y estado")
    public List<PolizaResponse> listar(@RequestParam(required = false) TipoPoliza tipo,
                                       @RequestParam(required = false) EstadoPoliza estado) {
        return PolizaMapper.aResponse(polizaService.listar(tipo, estado));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Consulta una póliza por id")
    public PolizaResponse obtener(@PathVariable Long id) {
        return PolizaMapper.aResponse(polizaService.obtener(id));
    }

    @PostMapping
    @Operation(summary = "Crea una póliza con sus riesgos iniciales")
    public ResponseEntity<PolizaResponse> crear(@Valid @RequestBody CrearPolizaRequest request) {
        Poliza poliza = polizaService.crear(PolizaMapper.aCommand(request));
        URI ubicacion = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}").buildAndExpand(poliza.getId()).toUri();
        return ResponseEntity.created(ubicacion).body(PolizaMapper.aResponse(poliza));
    }

    @GetMapping("/{id}/riesgos")
    @Operation(summary = "Lista los riesgos de una póliza")
    public List<RiesgoResponse> listarRiesgos(@PathVariable Long id) {
        return RiesgoMapper.aResponse(polizaService.listarRiesgos(id));
    }

    @PostMapping("/{id}/renovar")
    @Operation(summary = "Renueva la póliza aplicando el IPC configurado al canon")
    public PolizaResponse renovar(@PathVariable Long id) {
        return PolizaMapper.aResponse(polizaService.renovar(id));
    }

    @PostMapping("/{id}/cancelar")
    @Operation(summary = "Cancela la póliza y todos sus riesgos")
    public PolizaResponse cancelar(@PathVariable Long id) {
        return PolizaMapper.aResponse(polizaService.cancelar(id));
    }

    @PostMapping("/{id}/riesgos")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Agrega un riesgo a una póliza colectiva")
    public RiesgoResponse agregarRiesgo(@PathVariable Long id, @Valid @RequestBody CrearRiesgoRequest request) {
        return RiesgoMapper.aResponse(polizaService.agregarRiesgo(id, RiesgoMapper.aCommand(request)));
    }
}
