package com.segurosbolivar.polizas.integration;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasLength;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class SeguridadIntegrationTest extends AbstractIntegrationTest {

    private static final String ORIGEN_FRONTEND = "http://localhost:4200";

    @Test
    void sinApiKeyEs401EnJson() throws Exception {
        mockMvc.perform(get("/polizas"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.title").value("No autorizado"))
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.correlationId").exists());
    }

    @Test
    void apiKeyIncorrectaEs401() throws Exception {
        mockMvc.perform(post("/polizas/1/cancelar").header(API_KEY_HEADER, "000000"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void laDocumentacionEsPublicaYDeclaraElEsquemaApiKey() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.components.securitySchemes.apiKey.type").value("apiKey"))
                .andExpect(jsonPath("$.components.securitySchemes.apiKey.in").value("header"))
                .andExpect(jsonPath("$.components.securitySchemes.apiKey.name").value(API_KEY_HEADER));
    }

    @Test
    void reutilizaElCorrelationIdRecibido() throws Exception {
        mockMvc.perform(get("/polizas/1").header(API_KEY_HEADER, API_KEY).header("X-Correlation-Id", "abc-123"))
                .andExpect(header().string("X-Correlation-Id", "abc-123"));
    }

    @Test
    void reemplazaUnCorrelationIdConFormatoInvalido() throws Exception {
        mockMvc.perform(get("/polizas/1").header(API_KEY_HEADER, API_KEY).header("X-Correlation-Id", "x".repeat(65)))
                .andExpect(header().string("X-Correlation-Id", hasLength(36)));
    }

    @Test
    void preflightCorsDelFrontendNoRequiereApiKey() throws Exception {
        mockMvc.perform(options("/polizas")
                        .header(HttpHeaders.ORIGIN, ORIGEN_FRONTEND)
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, API_KEY_HEADER))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, ORIGEN_FRONTEND))
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_HEADERS, containsString(API_KEY_HEADER)));
    }

    @Test
    void elRechazoPorApiKeyIncluyeCabecerasCors() throws Exception {
        mockMvc.perform(get("/polizas").header(HttpHeaders.ORIGIN, ORIGEN_FRONTEND))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, ORIGEN_FRONTEND));
    }

    @Test
    void origenNoPermitidoEsRechazado() throws Exception {
        mockMvc.perform(options("/polizas")
                        .header(HttpHeaders.ORIGIN, "http://sitio-malicioso.com")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "GET"))
                .andExpect(status().isForbidden())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, not(containsString("malicioso"))));
    }

    @Test
    void rutaInexistenteEs404ProblemDetail() throws Exception {
        mockMvc.perform(get("/no-existe").header(API_KEY_HEADER, API_KEY))
                .andExpect(status().isNotFound())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.correlationId").exists());
    }
}
