# ---------- Etapa 1: compilación ----------
FROM eclipse-temurin:17-jdk AS build
WORKDIR /app

# Primero solo lo necesario para resolver dependencias: esta capa se cachea mientras no cambie el pom
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw -B -q dependency:go-offline

COPY src/ src/
# Las pruebas se ejecutan en el pipeline (./mvnw verify), no al construir la imagen
RUN ./mvnw -B -q package -DskipTests

# ---------- Etapa 2: ejecución ----------
FROM eclipse-temurin:17-jre
WORKDIR /app

# Zona horaria del negocio: las fechas de auditoría (LocalDateTime) se registran en hora de Colombia
ENV TZ=America/Bogota

# Usuario sin privilegios: el proceso no corre como root dentro del contenedor
RUN groupadd --system app && useradd --system --gid app --no-create-home app
COPY --from=build --chown=app:app /app/target/api-polizas-*.jar app.jar
USER app

EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]
