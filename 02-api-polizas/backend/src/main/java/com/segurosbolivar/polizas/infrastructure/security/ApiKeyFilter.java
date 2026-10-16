package com.segurosbolivar.polizas.infrastructure.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.segurosbolivar.polizas.infrastructure.config.CorrelationIdFilter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.OffsetDateTime;
import java.util.List;

/**
 * Exige el header {@code x-api-key} en todas las rutas salvo la documentación (Swagger),
 * la consola H2 y los preflight CORS. Si falta o no coincide responde 401 en formato ProblemDetail.
 */
public class ApiKeyFilter extends OncePerRequestFilter {

    public static final String HEADER = "x-api-key";

    private static final Logger log = LoggerFactory.getLogger(ApiKeyFilter.class);
    private static final List<String> RUTAS_PUBLICAS = List.of(
            "/swagger-ui", "/v3/api-docs", "/h2-console");

    private final byte[] apiKeyEsperada;
    private final ObjectMapper objectMapper;

    public ApiKeyFilter(String apiKeyEsperada, ObjectMapper objectMapper) {
        this.apiKeyEsperada = apiKeyEsperada.getBytes(StandardCharsets.UTF_8);
        this.objectMapper = objectMapper;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        if (HttpMethod.OPTIONS.matches(request.getMethod())) {
            return true;
        }
        String ruta = request.getRequestURI().substring(request.getContextPath().length());
        return RUTAS_PUBLICAS.stream().anyMatch(ruta::startsWith);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String recibida = request.getHeader(HEADER);
        if (esValida(recibida)) {
            chain.doFilter(request, response);
            return;
        }
        // Nunca se registra el valor recibido: podría ser una credencial válida de otro sistema
        log.warn("Petición rechazada por API key {} metodo={} ruta={}",
                recibida == null ? "ausente" : "incorrecta", request.getMethod(), request.getRequestURI());
        responderNoAutorizado(request, response);
    }

    /** Comparación en tiempo constante para no filtrar información por diferencias de tiempo de respuesta. */
    private boolean esValida(String recibida) {
        return recibida != null
                && MessageDigest.isEqual(apiKeyEsperada, recibida.getBytes(StandardCharsets.UTF_8));
    }

    private void responderNoAutorizado(HttpServletRequest request, HttpServletResponse response) throws IOException {
        ProblemDetail problema = ProblemDetail.forStatusAndDetail(HttpStatus.UNAUTHORIZED,
                "Debe enviar un header '%s' válido.".formatted(HEADER));
        problema.setTitle("No autorizado");
        problema.setInstance(URI.create(request.getRequestURI()));
        problema.setProperty("timestamp", OffsetDateTime.now());
        problema.setProperty(CorrelationIdFilter.MDC_KEY, MDC.get(CorrelationIdFilter.MDC_KEY));

        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        objectMapper.writeValue(response.getOutputStream(), problema);
    }
}
