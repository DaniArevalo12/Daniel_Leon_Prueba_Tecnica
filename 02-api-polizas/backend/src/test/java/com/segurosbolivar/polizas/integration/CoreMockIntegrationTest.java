package com.segurosbolivar.polizas.integration;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.http.MediaType;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(OutputCaptureExtension.class)
class CoreMockIntegrationTest extends AbstractIntegrationTest {

    @Test
    void registraEnLogsElEventoDelEnunciado(CapturedOutput output) throws Exception {
        mockMvc.perform(post("/core-mock/evento").header(API_KEY_HEADER, API_KEY)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"evento\":\"ACTUALIZACION\",\"polizaId\":555}"))
                .andExpect(status().isAccepted());

        assertThat(output).contains("[CORE-MOCK] Se intentó enviar la operación al CORE evento=ACTUALIZACION")
                .contains("polizaId=555");
    }

    @Test
    void eventoSinPolizaIdEs400() throws Exception {
        mockMvc.perform(post("/core-mock/evento").header(API_KEY_HEADER, API_KEY)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"evento\":\"ACTUALIZACION\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void eventoConCaracteresNoPermitidosEs400ParaEvitarInyeccionEnLogs() throws Exception {
        mockMvc.perform(post("/core-mock/evento").header(API_KEY_HEADER, API_KEY)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"evento\":\"ACTUALIZACION\r\nFALSO\",\"polizaId\":555}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void requiereApiKey() throws Exception {
        mockMvc.perform(post("/core-mock/evento")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"evento\":\"ACTUALIZACION\",\"polizaId\":555}"))
                .andExpect(status().isUnauthorized());
    }
}
