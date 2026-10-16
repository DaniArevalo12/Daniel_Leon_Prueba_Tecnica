package com.segurosbolivar.polizas.infrastructure.core;

import com.segurosbolivar.polizas.domain.port.EventoCore;
import com.segurosbolivar.polizas.domain.port.OperacionCore;
import com.segurosbolivar.polizas.infrastructure.config.CorrelationIdFilter;
import com.segurosbolivar.polizas.infrastructure.security.SeguridadProperties;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.slf4j.MDC;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.net.InetSocketAddress;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

@ExtendWith(OutputCaptureExtension.class)
class CoreHttpAdapterTest {

    private static final EventoCore EVENTO = EventoCore.actualizacion(OperacionCore.RENOVACION, 1L);

    @AfterEach
    void limpiarMdc() {
        MDC.clear();
    }

    @Test
    void enviaElEventoConElContratoDelEnunciadoYElCorrelationId(CapturedOutput output) {
        RestClient.Builder builder = RestClient.builder().baseUrl("http://core");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("http://core/core-mock/evento"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header(CorrelationIdFilter.HEADER, "cid-1"))
                .andExpect(content().json("""
                        {"evento":"ACTUALIZACION","operacion":"RENOVACION","polizaId":1}
                        """, true))
                .andRespond(withSuccess());
        MDC.put(CorrelationIdFilter.MDC_KEY, "cid-1");

        new CoreHttpAdapter(builder.build()).notificar(EVENTO);

        server.verify();
        assertThat(output).contains("Evento enviado al CORE operacion=RENOVACION polizaId=1");
    }

    @Test
    void unErrorDelCoreSeRegistraYNoSePropaga(CapturedOutput output) {
        RestClient.Builder builder = RestClient.builder().baseUrl("http://core");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("http://core/core-mock/evento"))
                .andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE));

        assertThatCode(() -> new CoreHttpAdapter(builder.build()).notificar(EVENTO)).doesNotThrowAnyException();
        assertThat(output).contains("No fue posible notificar al CORE operacion=RENOVACION polizaId=1");
    }

    @Test
    void elClienteConfiguradoEnviaLaApiKeyAlCore() throws Exception {
        AtomicReference<String> apiKeyRecibida = new AtomicReference<>();
        HttpServer core = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
        core.createContext("/core-mock/evento", exchange -> {
            apiKeyRecibida.set(exchange.getRequestHeaders().getFirst("x-api-key"));
            exchange.sendResponseHeaders(202, -1);
            exchange.close();
        });
        core.start();
        try {
            CoreProperties coreProperties = new CoreProperties(
                    "http://localhost:" + core.getAddress().getPort(), Duration.ofSeconds(1), Duration.ofSeconds(1));
            SeguridadProperties seguridad = new SeguridadProperties("clave-de-prueba",
                    new SeguridadProperties.Cors(List.of("http://localhost:4200")));
            RestClient restClient = new CoreClientConfig().coreRestClient(RestClient.builder(), coreProperties, seguridad);

            new CoreHttpAdapter(restClient).notificar(EVENTO);

            assertThat(apiKeyRecibida.get()).isEqualTo("clave-de-prueba");
        } finally {
            core.stop(0);
        }
    }

    @Test
    void unCoreLentoSeCortaPorTimeoutSinPropagarError(CapturedOutput output) throws Exception {
        HttpServer servidorLento = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
        servidorLento.createContext("/core-mock/evento", exchange -> {
            try {
                Thread.sleep(2_000);
                exchange.sendResponseHeaders(202, -1);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            } finally {
                exchange.close();
            }
        });
        servidorLento.start();
        try {
            CoreProperties properties = new CoreProperties(
                    "http://localhost:" + servidorLento.getAddress().getPort(),
                    Duration.ofMillis(500), Duration.ofMillis(300));
            RestClient restClient = RestClient.builder()
                    .baseUrl(properties.baseUrl())
                    .requestFactory(CoreClientConfig.requestFactory(properties))
                    .build();

            long inicio = System.nanoTime();
            new CoreHttpAdapter(restClient).notificar(EVENTO);
            Duration duracion = Duration.ofNanos(System.nanoTime() - inicio);

            assertThat(duracion).isLessThan(Duration.ofMillis(1_500));
            assertThat(output).contains("No fue posible notificar al CORE");
        } finally {
            servidorLento.stop(0);
        }
    }
}
