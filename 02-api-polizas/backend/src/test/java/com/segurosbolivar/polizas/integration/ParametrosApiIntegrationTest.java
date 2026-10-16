package com.segurosbolivar.polizas.integration;

import org.junit.jupiter.api.Test;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ParametrosApiIntegrationTest extends AbstractIntegrationTest {

    @Test
    void devuelveElIpcDeApplicationYml() throws Exception {
        mockMvc.perform(get("/parametros/renovacion").header(API_KEY_HEADER, API_KEY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ipc").value(0.0520));
    }

    @Test
    void requiereApiKey() throws Exception {
        mockMvc.perform(get("/parametros/renovacion"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void apareceEnLaDocumentacionOpenApi() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paths['/parametros/renovacion'].get").exists());
    }
}
