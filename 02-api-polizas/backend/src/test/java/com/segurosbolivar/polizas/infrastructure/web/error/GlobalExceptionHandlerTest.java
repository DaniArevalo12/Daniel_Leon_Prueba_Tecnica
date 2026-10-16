package com.segurosbolivar.polizas.infrastructure.web.error;

import com.segurosbolivar.polizas.domain.model.Poliza;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ProblemDetail;
import org.springframework.orm.ObjectOptimisticLockingFailureException;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Casos difíciles de provocar vía HTTP de forma determinista (concurrencia, errores inesperados).
 */
class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void bloqueoOptimistaEs409() {
        ProblemDetail problema = handler.manejarConcurrencia(new ObjectOptimisticLockingFailureException(Poliza.class, 1L));

        assertThat(problema.getStatus()).isEqualTo(409);
        assertThat(problema.getTitle()).isEqualTo("Modificación concurrente");
    }

    @Test
    void violacionDeIntegridadEs409SinDetallesInternos() {
        ProblemDetail problema = handler.manejarIntegridad(
                new DataIntegrityViolationException("ORA-00001: unique constraint (UK_POLIZA_NUMERO) violated"));

        assertThat(problema.getStatus()).isEqualTo(409);
        assertThat(problema.getDetail()).doesNotContain("ORA-", "UK_POLIZA_NUMERO");
    }

    @Test
    void errorInesperadoEs500SinExponerElMensajeInterno() {
        ProblemDetail problema = handler.manejarInesperado(new IllegalStateException("password=secreto"));

        assertThat(problema.getStatus()).isEqualTo(500);
        assertThat(problema.getDetail()).doesNotContain("secreto");
        assertThat(problema.getProperties()).containsKey("timestamp");
    }
}
