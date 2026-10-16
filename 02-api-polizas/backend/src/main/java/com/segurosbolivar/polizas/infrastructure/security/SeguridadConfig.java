package com.segurosbolivar.polizas.infrastructure.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.segurosbolivar.polizas.infrastructure.config.CorrelationIdFilter;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.time.Duration;
import java.util.List;

/**
 * Registra los filtros de seguridad con un orden explícito:
 * correlationId → CORS → API key.
 * <p>
 * CORS va como filtro (y no en WebMvcConfigurer) para que también los 401 del filtro de API key
 * lleven las cabeceras CORS; si no, el navegador mostraría un error de CORS en lugar del 401.
 */
@Configuration
public class SeguridadConfig {

    static final int ORDEN_CORS = Ordered.HIGHEST_PRECEDENCE + 1;
    static final int ORDEN_API_KEY = Ordered.HIGHEST_PRECEDENCE + 2;

    @Bean
    public FilterRegistrationBean<CorsFilter> corsFilter(SeguridadProperties seguridad) {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(seguridad.cors().origenesPermitidos());
        config.setAllowedMethods(List.of("GET", "POST", "OPTIONS"));
        config.setAllowedHeaders(List.of(HttpHeaders.CONTENT_TYPE, ApiKeyFilter.HEADER, CorrelationIdFilter.HEADER));
        config.setExposedHeaders(List.of(HttpHeaders.LOCATION, CorrelationIdFilter.HEADER));
        config.setMaxAge(Duration.ofHours(1));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);

        FilterRegistrationBean<CorsFilter> registro = new FilterRegistrationBean<>(new CorsFilter(source));
        registro.setOrder(ORDEN_CORS);
        return registro;
    }

    @Bean
    public FilterRegistrationBean<ApiKeyFilter> apiKeyFilter(SeguridadProperties seguridad, ObjectMapper objectMapper) {
        FilterRegistrationBean<ApiKeyFilter> registro =
                new FilterRegistrationBean<>(new ApiKeyFilter(seguridad.apiKey(), objectMapper));
        registro.setOrder(ORDEN_API_KEY);
        return registro;
    }
}
