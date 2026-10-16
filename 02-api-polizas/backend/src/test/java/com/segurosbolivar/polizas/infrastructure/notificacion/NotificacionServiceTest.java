package com.segurosbolivar.polizas.infrastructure.notificacion;

import com.segurosbolivar.polizas.domain.event.PolizaCreadaEvent;
import com.segurosbolivar.polizas.domain.event.PolizaRenovadaEvent;
import com.segurosbolivar.polizas.domain.model.TipoPoliza;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(OutputCaptureExtension.class)
class NotificacionServiceTest {

    private final NotificacionService service = new NotificacionService();

    @Test
    void simulaCorreoYSmsAlCrear(CapturedOutput output) {
        service.alCrearPoliza(new PolizaCreadaEvent(7L, "POL-000007", TipoPoliza.COLECTIVA));

        assertThat(output).contains("Correo enviado al tomador motivo=CREACION polizaId=7")
                .contains("SMS enviado al tomador motivo=CREACION polizaId=7");
    }

    @Test
    void simulaCorreoYSmsAlRenovar(CapturedOutput output) {
        service.alRenovarPoliza(new PolizaRenovadaEvent(2L, "POL-000002", BigDecimal.TEN, BigDecimal.TEN,
                LocalDate.of(2027, 1, 1)));

        assertThat(output).contains("Correo enviado al tomador motivo=RENOVACION polizaId=2")
                .contains("SMS enviado al tomador motivo=RENOVACION polizaId=2");
    }
}
