package com.segurosbolivar.polizas.integration;

import com.segurosbolivar.polizas.domain.port.EventoCore;
import com.segurosbolivar.polizas.domain.port.OperacionCore;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.endsWith;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(OutputCaptureExtension.class)
class PolizaApiIntegrationTest extends AbstractIntegrationTest {

    private static final String RIESGO_JSON = """
            {"direccionInmueble":"Calle 100 # 15-20","arrendatario":"María Ruiz","arrendador":"Inmobiliaria Andina"}
            """;

    private static MockHttpServletRequestBuilder conKey(MockHttpServletRequestBuilder request) {
        return request.header(API_KEY_HEADER, API_KEY);
    }

    private static MockHttpServletRequestBuilder postJson(String url, String json) {
        return conKey(post(url)).contentType(MediaType.APPLICATION_JSON).content(json);
    }

    @Nested
    class Listar {

        @Test
        void sinFiltrosDevuelveTodas() throws Exception {
            mockMvc.perform(conKey(get("/polizas")))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(8)))
                    .andExpect(jsonPath("$[0].numero").value("POL-000001"))
                    .andExpect(jsonPath("$[0].valorPrima").value(18000000.00));
        }

        @Test
        void filtraPorTipoYEstado() throws Exception {
            mockMvc.perform(conKey(get("/polizas").param("tipo", "COLECTIVA").param("estado", "ACTIVA")))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[*].id", is(java.util.List.of(4, 7))));
        }

        @Test
        void valorDeFiltroInvalidoEs400ConValoresPermitidos() throws Exception {
            mockMvc.perform(conKey(get("/polizas").param("tipo", "XX")))
                    .andExpect(status().isBadRequest())
                    .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                    .andExpect(jsonPath("$.detail", containsString("INDIVIDUAL, COLECTIVA")))
                    .andExpect(jsonPath("$.correlationId", notNullValue()));
        }
    }

    @Nested
    class Obtener {

        @Test
        void devuelveLaPoliza() throws Exception {
            mockMvc.perform(conKey(get("/polizas/5")))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.tipo").value("COLECTIVA"))
                    .andExpect(jsonPath("$.estado").value("RENOVADA"));
        }

        @Test
        void inexistenteEs404ProblemDetail() throws Exception {
            mockMvc.perform(conKey(get("/polizas/999")))
                    .andExpect(status().isNotFound())
                    .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                    .andExpect(jsonPath("$.title").value("Recurso no encontrado"))
                    .andExpect(jsonPath("$.instance").value("/polizas/999"))
                    .andExpect(jsonPath("$.trace").doesNotExist());
        }

        @Test
        void listaSusRiesgos() throws Exception {
            mockMvc.perform(conKey(get("/polizas/4/riesgos")))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(3)))
                    .andExpect(jsonPath("$[*].polizaId", everyItem(is(4))));
        }

        @Test
        void riesgosDePolizaInexistenteEs404() throws Exception {
            mockMvc.perform(conKey(get("/polizas/999/riesgos"))).andExpect(status().isNotFound());
        }
    }

    @Nested
    class Crear {

        @Test
        void creaIndividualConSuRiesgoNotificaCoreYEnviaNotificaciones(CapturedOutput output) throws Exception {
            String json = """
                    {"tipo":"INDIVIDUAL","tomador":"Inmobiliaria Andina","fechaInicioVigencia":"2026-11-01",
                     "mesesVigencia":12,"valorCanon":1800000,"riesgos":[%s]}
                    """.formatted(RIESGO_JSON);

            mockMvc.perform(postJson("/polizas", json))
                    .andExpect(status().isCreated())
                    .andExpect(header().string("Location", endsWith("/polizas/1000")))
                    .andExpect(jsonPath("$.numero").value("POL-001000"))
                    .andExpect(jsonPath("$.estado").value("ACTIVA"))
                    .andExpect(jsonPath("$.fechaFinVigencia").value("2027-11-01"))
                    .andExpect(jsonPath("$.valorPrima").value(21600000.00));

            mockMvc.perform(conKey(get("/polizas/1000/riesgos"))).andExpect(jsonPath("$", hasSize(1)));
            verify(corePort).notificar(EventoCore.actualizacion(OperacionCore.CREACION, 1000L));
            assertThat(output).contains("[SIMULADO] Correo enviado al tomador motivo=CREACION polizaId=1000");
        }

        @Test
        void creaColectivaSinRiesgos() throws Exception {
            String json = """
                    {"tipo":"COLECTIVA","tomador":"Administradora","fechaInicioVigencia":"2026-11-01",
                     "mesesVigencia":6,"valorCanon":1000000.50}
                    """;

            mockMvc.perform(postJson("/polizas", json))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.valorPrima").value(6000003.00));
        }

        @Test
        void individualSinRiesgoEs422YNoNotifica() throws Exception {
            String json = """
                    {"tipo":"INDIVIDUAL","tomador":"Tomador","fechaInicioVigencia":"2026-11-01",
                     "mesesVigencia":12,"valorCanon":1800000,"riesgos":[]}
                    """;

            mockMvc.perform(postJson("/polizas", json))
                    .andExpect(status().isUnprocessableEntity())
                    .andExpect(jsonPath("$.title").value("Regla de negocio violada"));
            verify(corePort, never()).notificar(any());
        }

        @Test
        void camposInvalidosSon400ConDetallePorCampo() throws Exception {
            mockMvc.perform(postJson("/polizas", """
                            {"tipo":"INDIVIDUAL","tomador":"","mesesVigencia":0,"valorCanon":-5}
                            """))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.errores.tomador", notNullValue()))
                    .andExpect(jsonPath("$.errores.mesesVigencia", notNullValue()))
                    .andExpect(jsonPath("$.errores.valorCanon", notNullValue()))
                    .andExpect(jsonPath("$.errores.fechaInicioVigencia", notNullValue()));
        }

        @Test
        void jsonMalFormadoEs400() throws Exception {
            mockMvc.perform(postJson("/polizas", "{oops"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.detail", containsString("JSON")));
        }
    }

    @Nested
    class Renovar {

        @Test
        void aplicaIpcConfiguradoYNotifica(CapturedOutput output) throws Exception {
            mockMvc.perform(conKey(post("/polizas/1/renovar")))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.estado").value("RENOVADA"))
                    .andExpect(jsonPath("$.valorCanon").value(1578000.00))
                    .andExpect(jsonPath("$.valorPrima").value(18936000.00))
                    .andExpect(jsonPath("$.fechaInicioVigencia").value("2027-01-01"))
                    .andExpect(jsonPath("$.fechaFinVigencia").value("2028-01-01"))
                    .andExpect(jsonPath("$.version").value(1));

            verify(corePort).notificar(EventoCore.actualizacion(OperacionCore.RENOVACION, 1L));
            assertThat(output).contains("[SIMULADO] SMS enviado al tomador motivo=RENOVACION polizaId=1");
        }

        @Test
        void polizaCanceladaEs409() throws Exception {
            mockMvc.perform(conKey(post("/polizas/3/renovar")))
                    .andExpect(status().isConflict())
                    .andExpect(jsonPath("$.title").value("Conflicto de estado"));
            verify(corePort, never()).notificar(any());
        }
    }

    @Nested
    class Cancelar {

        @Test
        void cancelaPolizaYTodosSusRiesgos() throws Exception {
            mockMvc.perform(conKey(post("/polizas/4/cancelar")))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.estado").value("CANCELADA"));

            mockMvc.perform(conKey(get("/polizas/4/riesgos")))
                    .andExpect(jsonPath("$[*].estado", everyItem(is("CANCELADO"))));
            verify(corePort).notificar(EventoCore.actualizacion(OperacionCore.CANCELACION, 4L));
        }

        @Test
        void yaCanceladaEs409() throws Exception {
            mockMvc.perform(conKey(post("/polizas/6/cancelar"))).andExpect(status().isConflict());
        }
    }

    @Nested
    class AgregarRiesgo {

        @Test
        void agregaAColectiva() throws Exception {
            mockMvc.perform(postJson("/polizas/7/riesgos", RIESGO_JSON))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.id").value(1000))
                    .andExpect(jsonPath("$.polizaId").value(7))
                    .andExpect(jsonPath("$.estado").value("ACTIVO"))
                    .andExpect(jsonPath("$.fechaCreacion", notNullValue()));

            verify(corePort).notificar(EventoCore.actualizacion(OperacionCore.RIESGO_AGREGADO, 7L));
        }

        @Test
        void aIndividualEs422() throws Exception {
            mockMvc.perform(postJson("/polizas/1/riesgos", RIESGO_JSON))
                    .andExpect(status().isUnprocessableEntity());
        }

        @Test
        void aColectivaCanceladaEs409() throws Exception {
            mockMvc.perform(postJson("/polizas/6/riesgos", RIESGO_JSON))
                    .andExpect(status().isConflict());
        }

        @Test
        void aPolizaInexistenteEs404() throws Exception {
            mockMvc.perform(postJson("/polizas/999/riesgos", RIESGO_JSON))
                    .andExpect(status().isNotFound());
        }

        @Test
        void datosInvalidosSon400() throws Exception {
            mockMvc.perform(postJson("/polizas/7/riesgos", "{\"direccionInmueble\":\"\"}"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.errores.arrendatario", notNullValue()));
        }
    }
}
