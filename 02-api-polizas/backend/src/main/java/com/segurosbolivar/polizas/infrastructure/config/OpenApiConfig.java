package com.segurosbolivar.polizas.infrastructure.config;

import com.segurosbolivar.polizas.infrastructure.security.ApiKeyFilter;
import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Documentación OpenAPI. Declara el esquema de API key para poder usar "Authorize" en Swagger UI.
 */
@Configuration
public class OpenApiConfig {

    private static final String ESQUEMA = "apiKey";

    @Bean
    public OpenAPI openApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("API de Pólizas de Arrendamiento")
                        .version("1.0.0")
                        .description("Prueba técnica Seguros Bolívar. Todas las operaciones requieren el header "
                                + ApiKeyFilter.HEADER + "."))
                .components(new Components().addSecuritySchemes(ESQUEMA, new SecurityScheme()
                        .type(SecurityScheme.Type.APIKEY)
                        .in(SecurityScheme.In.HEADER)
                        .name(ApiKeyFilter.HEADER)))
                .addSecurityItem(new SecurityRequirement().addList(ESQUEMA));
    }
}
