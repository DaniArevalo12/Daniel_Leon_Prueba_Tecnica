package com.segurosbolivar.polizas.infrastructure.core;

import com.segurosbolivar.polizas.infrastructure.security.ApiKeyFilter;
import com.segurosbolivar.polizas.infrastructure.security.SeguridadProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.net.http.HttpClient;

/**
 * Cliente HTTP dedicado al CORE con timeouts explícitos: una dependencia lenta no debe
 * bloquear indefinidamente los hilos de la API.
 */
@Configuration
public class CoreClientConfig {

    @Bean
    public RestClient coreRestClient(RestClient.Builder builder, CoreProperties core, SeguridadProperties seguridad) {
        return builder
                .baseUrl(core.baseUrl())
                .requestFactory(requestFactory(core))
                .defaultHeader(ApiKeyFilter.HEADER, seguridad.apiKey())
                .build();
    }

    static JdkClientHttpRequestFactory requestFactory(CoreProperties core) {
        HttpClient httpClient = HttpClient.newBuilder()
                .connectTimeout(core.timeoutConexion())
                .build();
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(httpClient);
        factory.setReadTimeout(core.timeoutLectura());
        return factory;
    }
}
