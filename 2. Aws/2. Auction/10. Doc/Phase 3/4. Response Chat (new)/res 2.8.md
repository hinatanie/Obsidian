Use this structure:
```
src/main/resources/
├── application.yaml
├── application-local.yaml
└── application-prod.yaml
```
Spring Boot loads `application.yaml` first, then overrides it with the active profile file, such as `application-local.yaml` or `application-prod.yaml`. Environment variables can override YAML values at runtime.
# `application.yaml`
Put only settings shared by every environment here.
```
spring:
  application:
    name: pet-shop-backend
  jpa:
    open-in-view: false
    properties:
      hibernate:
        format_sql: true
server:
  port: ${SERVER_PORT:8080}
  address: ${SERVER_ADDRESS:127.0.0.1}
```
### Important
This line:
```
address: ${SERVER_ADDRESS:127.0.0.1}
```
means Spring Boot listens only on the EC2 machine itself by default:
```
127.0.0.1:8080
```
That matches your architecture:
```
Internet
→ Nginx on ports 80/443
→ Spring Boot on 127.0.0.1:8080
```
For local development, `application-local.yaml` will override it to `0.0.0.0`.

---
# `application-local.yaml`
Use this profile when running MySQL locally, such as through Docker Compose.
```
spring:
  datasource:
    url: jdbc:mysql://${DB_HOST:localhost}:${DB_PORT:3306}/${DB_NAME:pet_shop}
    username: ${DB_USERNAME:root}
    password: ${DB_PASSWORD:root}
    driver-class-name: com.mysql.cj.jdbc.Driver
  jpa:
    hibernate:
      ddl-auto: update
    show-sql: true
server:
  address: ${SERVER_ADDRESS:0.0.0.0}
```
The defaults mean:
```
DB host: localhost
DB port: 3306
Database: pet_shop
Username: root
Password: root
```
Change the local defaults if your Docker MySQL credentials are different.
For example, when Docker Compose exposes MySQL to your computer:
```
localhost:3306
```
this profile will work with:
```
jdbc:mysql://localhost:3306/pet_shop
```
## Security note
A local development password in this profile is acceptable only when it is a disposable local password and not reused anywhere else.
Do not place the RDS password here.

---
# `application-prod.yaml`
Use this profile on EC2 when Spring Boot connects to RDS.
```
spring:
  datasource:
    url: jdbc:mysql://${DB_HOST}:${DB_PORT:3306}/${DB_NAME}
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
    driver-class-name: com.mysql.cj.jdbc.Driver
    hikari:
      maximum-pool-size: ${DB_MAX_POOL_SIZE:10}
      minimum-idle: ${DB_MIN_IDLE:2}
      connection-timeout: ${DB_CONNECTION_TIMEOUT_MS:30000}
      idle-timeout: ${DB_IDLE_TIMEOUT_MS:600000}
      max-lifetime: ${DB_MAX_LIFETIME_MS:1800000}
  jpa:
    hibernate:
      ddl-auto: validate
    show-sql: false
server:
  address: ${SERVER_ADDRESS:127.0.0.1}
```
This profile has no default values for:
```
DB_HOST
DB_NAME
DB_USERNAME
DB_PASSWORD
```
That is intentional. Production startup should fail when required database configuration is missing rather than accidentally using local credentials.
At runtime, the URL becomes:
```
jdbc:mysql://pet-shop-mysql.cho2uq2auqbz.ap-southeast-1.rds.amazonaws.com:3306/pet_shop
```

---
# Environment variables on EC2
Your EC2 environment should provide:
```
DB_HOST=pet-shop-mysql.cho2uq2auqbz.ap-southeast-1.rds.amazonaws.com
DB_PORT=3306
DB_NAME=pet_shop
DB_USERNAME=pet_shop_admin
DB_PASSWORD=YOUR_REAL_RDS_PASSWORD
SPRING_PROFILES_ACTIVE=prod
```
Do not include:
```
https://
```
in `DB_HOST`.

---
# Start locally
For local development, activate the `local` profile:
```
SPRING_PROFILES_ACTIVE=local ./mvnw spring-boot:run
```
On Windows PowerShell:
```
$env:SPRING_PROFILES_ACTIVE = "local"
.\mvnw.cmd spring-boot:run
```
You can also set your local database values:
```
$env:DB_HOST = "localhost"
$env:DB_PORT = "3306"
$env:DB_NAME = "pet_shop"
$env:DB_USERNAME = "root"
$env:DB_PASSWORD = "root"
$env:SPRING_PROFILES_ACTIVE = "local"
.\mvnw.cmd spring-boot:run
```

---
# Start on EC2
Set:
```
export SPRING_PROFILES_ACTIVE=prod
export DB_HOST='pet-shop-mysql.cho2uq2auqbz.ap-southeast-1.rds.amazonaws.com'
export DB_PORT='3306'
export DB_NAME='pet_shop'
export DB_USERNAME='pet_shop_admin'
export DB_PASSWORD='YOUR_REAL_RDS_PASSWORD'
```
Then run:
```
java -jar pet-shop-backend.jar
```
For a permanent deployment, place those variables in a protected environment file used by `systemd`, not in your Git repository.

---
# Important correction about `ddl-auto`
Use:
```
ddl-auto: update
```
only for temporary local development.
Use:
```
ddl-auto: validate
```
in production when Flyway or Liquibase creates and updates the schema.
If you do not yet have migrations, `validate` will fail because the required tables do not exist. In that temporary situation, you can initially use this in `application-prod.yaml`:
```
spring:
  jpa:
    hibernate:
      ddl-auto: update
```
After adding migrations, change it to:
```
ddl-auto: validate
```
# Final files
## `application.yaml`
```
spring:
  application:
    name: pet-shop-backend
  jpa:
    open-in-view: false
    properties:
      hibernate:
        format_sql: true
server:
  port: ${SERVER_PORT:8080}
  address: ${SERVER_ADDRESS:127.0.0.1}
```
## `application-local.yaml`
```
spring:
  datasource:
    url: jdbc:mysql://${DB_HOST:localhost}:${DB_PORT:3306}/${DB_NAME:pet_shop}
    username: ${DB_USERNAME:root}
    password: ${DB_PASSWORD:root}
    driver-class-name: com.mysql.cj.jdbc.Driver
  jpa:
    hibernate:
      ddl-auto: update
    show-sql: true
server:
  address: ${SERVER_ADDRESS:0.0.0.0}
```
## `application-prod.yaml`
```
spring:
  datasource:
    url: jdbc:mysql://${DB_HOST}:${DB_PORT:3306}/${DB_NAME}
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
    driver-class-name: com.mysql.cj.jdbc.Driver
    hikari:
      maximum-pool-size: ${DB_MAX_POOL_SIZE:10}
      minimum-idle: ${DB_MIN_IDLE:2}
      connection-timeout: ${DB_CONNECTION_TIMEOUT_MS:30000}
      idle-timeout: ${DB_IDLE_TIMEOUT_MS:600000}
      max-lifetime: ${DB_MAX_LIFETIME_MS:1800000}
  jpa:
    hibernate:
      ddl-auto: validate
    show-sql: false
server:
  address: ${SERVER_ADDRESS:127.0.0.1}
```
Do not set `spring.profiles.active` inside `application-local.yaml` or `application-prod.yaml`. Activate the profile using `SPRING_PROFILES_ACTIVE` or a command-line argument.