package com.segurosbolivar.polizas.integration;

import com.segurosbolivar.polizas.domain.port.EventoCore;
import com.segurosbolivar.polizas.domain.port.OperacionCore;
import org.junit.jupiter.api.Test;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class RiesgoApiIntegrationTest extends AbstractIntegrationTest {

    @Test
    void cancelaElRiesgoSinCambiarLaPolizaYNotificaConElIdDeLaPoliza() throws Exception {
        mockMvc.perform(post("/riesgos/1/cancelar").header(API_KEY_HEADER, API_KEY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("CANCELADO"))
                .andExpect(jsonPath("$.polizaId").value(1));

        mockMvc.perform(get("/polizas/1").header(API_KEY_HEADER, API_KEY))
                .andExpect(jsonPath("$.estado").value("ACTIVA"));
        verify(corePort).notificar(EventoCore.actualizacion(OperacionCore.RIESGO_CANCELADO, 1L));
    }

    @Test
    void yaCanceladoEs409() throws Exception {
        mockMvc.perform(post("/riesgos/6/cancelar").header(API_KEY_HEADER, API_KEY))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("El riesgo 6 ya está cancelado"));
        verify(corePort, never()).notificar(any());
    }

    @Test
    void inexistenteEs404() throws Exception {
        mockMvc.perform(post("/riesgos/999/cancelar").header(API_KEY_HEADER, API_KEY))
                .andExpect(status().isNotFound());
    }

    @Test
    void idNoNumericoEs400() throws Exception {
        mockMvc.perform(post("/riesgos/abc/cancelar").header(API_KEY_HEADER, API_KEY))
                .andExpect(status().isBadRequest());
    }
}
