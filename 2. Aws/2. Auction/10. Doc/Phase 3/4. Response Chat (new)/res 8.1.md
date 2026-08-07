# Main Problem
You want Spring Boot to expose only safe operational endpoints:
```
/actuator/health
/actuator/info
```
This lets you confirm that the Pet Shop backend is running without exposing detailed internal configuration.
Spring Boot maps Actuator endpoints under `/actuator` by default. The `health` endpoint therefore becomes `/actuator/health`.
## Problem 1: Confirm the Actuator dependency exists
## Solution
Open your existing build file.
For Maven, confirm `pom.xml` contains:
```
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```
For Gradle:
```
implementation 'org.springframework.boot:spring-boot-starter-actuator'
```
Without this dependency, `/actuator/health` will not exist.

---
## Problem 2: Add the production Actuator configuration
## Solution
Open:
```
src/main/resources/application-prod.yaml
```
Add:
```
management:
  endpoints:
    web:
      exposure:
        include: health,info
  endpoint:
    health:
      show-details: never
```
Make sure the indentation is exactly like this:
```
management
├── endpoints
│   └── web
│       └── exposure
│           └── include
└── endpoint
    └── health
        └── show-details
```
Do not place `endpoint` inside `endpoints`.
### Complete example
Your `application-prod.yaml` may look like:
```
spring:
  datasource:
    url: jdbc:mysql://${DB_HOST}:${DB_PORT:3306}/${DB_NAME}
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
  flyway:
    enabled: true
    url: jdbc:mysql://${DB_HOST}:${DB_PORT:3306}/${DB_NAME}
    user: ${DB_MIGRATION_USERNAME}
    password: ${DB_MIGRATION_PASSWORD}
  jpa:
    hibernate:
      ddl-auto: validate
    open-in-view: false
server:
  address: ${SERVER_ADDRESS:127.0.0.1}
  port: ${SERVER_PORT:8080}
management:
  endpoints:
    web:
      exposure:
        include: health,info
  endpoint:
    health:
      show-details: never
```
Spring Boot normally exposes only `health` over HTTP by default. Setting `include: health,info` explicitly exposes those two endpoints and no others. Spring also warns that additional Actuator endpoints may contain sensitive information and should be protected carefully.

---
## Problem 3: Build and run with the `prod` profile
## Solution
On your development computer, build the JAR.
For Maven:
```
.\mvnw.cmd clean package
```
For Gradle:
```
.\gradlew.bat clean bootJar
```
Then make sure EC2 uses:
```
SPRING_PROFILES_ACTIVE=prod
```
In:
```
/etc/pet-shop/pet-shop.env
```
you should have:
```
SPRING_PROFILES_ACTIVE=prod
```
After deploying the new JAR, restart the application:
```
sudo systemctl restart pet-shop
```
Check its status:
```
sudo systemctl status pet-shop --no-pager
```

---
## Problem 4: Test the health endpoint from EC2
## Solution
Because Spring Boot is listening on:
```
127.0.0.1:8080
```
test it from the EC2 terminal:
```
curl -i http://127.0.0.1:8080/actuator/health
```
Expected response:
```
HTTP/1.1 200
Content-Type: application/vnd.spring-boot.actuator.v3+json
```
```
{"status":"UP"}
```
The health endpoint is intended for monitoring whether the application is operational.
You can also test only the response body:
```
curl http://127.0.0.1:8080/actuator/health
```
Expected:
```
{"status":"UP"}
```

---
## Problem 5: Test the info endpoint
## Solution
Run:
```
curl -i http://127.0.0.1:8080/actuator/info
```
You may receive:
```
{}
```
That is normal.
The endpoint exists, but you have not added any application information yet.
The `info` endpoint is intended to return general application information.
You can optionally add safe information:
```
info:
  app:
    name: Pet Shop Backend
    description: Pet Shop Spring Boot API
```
Then `/actuator/info` may return:
```
{
  "app": {
    "name": "Pet Shop Backend",
    "description": "Pet Shop Spring Boot API"
  }
}
```
Do not put secrets, database passwords, private endpoints, access keys, or tokens in the `info` section.

---
## Problem 6: Confirm unsafe endpoints are not exposed
## Solution
Test:
```
curl -i http://127.0.0.1:8080/actuator/env
```
Also test:
```
curl -i http://127.0.0.1:8080/actuator/beans
curl -i http://127.0.0.1:8080/actuator/configprops
curl -i http://127.0.0.1:8080/actuator/mappings
```
Because those endpoints are not included, you should normally receive:
```
HTTP/1.1 404
```
or another unavailable/not-found response.
This confirms that only:
```
health
info
```
are exposed over HTTP.

---
## Problem 7: Handle Spring Security
## Solution
Because your Pet Shop project uses Spring Security, `/actuator/health` may return:
```
401 Unauthorized
```
or:
```
403 Forbidden
```
When your application defines its own `SecurityFilterChain`, Spring Boot stops applying its default Actuator security rules, so your application must explicitly decide which Actuator endpoints are public.
Add the health endpoint to your existing security configuration.
For a normal path-based configuration:
```
@Bean
SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    http
        .authorizeHttpRequests(auth -> auth
            .requestMatchers("/actuator/health").permitAll()
            .requestMatchers("/actuator/info").permitAll()
            .requestMatchers("/api/auth/**").permitAll()
            .anyRequest().authenticated()
        );
    return http.build();
}
```
Do not create a second `SecurityFilterChain` without understanding its ordering. Add these matchers to your existing configuration.
### Safer alternative
You can make only health public:
```
.requestMatchers("/actuator/health").permitAll()
.requestMatchers("/actuator/info").authenticated()
```
For your first deployment, exposing only health publicly is usually enough.

---
## Problem 8: Test through Nginx
## Solution
After Nginx is configured to forward traffic to Spring Boot, test from your browser:
```
http://YOUR_EC2_PUBLIC_IP/actuator/health
```
Expected:
```
{"status":"UP"}
```
The request path is:
```
Browser
   ↓
EC2 port 80
   ↓
Nginx
   ↓
127.0.0.1:8080
   ↓
Spring Boot Actuator
```
Before testing publicly, confirm locally first:
```
curl http://127.0.0.1:8080/actuator/health
```
Then test through Nginx from EC2:
```
curl http://127.0.0.1/actuator/health
```
Finally test using the public IP.

---
## Problem 9: Understand `show-details: never`
## Solution
This configuration:
```
management:
  endpoint:
    health:
      show-details: never
```
prevents detailed component information from being returned.
A safe public response is:
```
{"status":"UP"}
```
Without restricting details, health information could reveal components such as:
```
Database type
Disk information
Redis status
Mail status
External service status
Internal component names
```
The overall status is enough for:
```
Deployment checks
Nginx checks
CloudWatch checks
Load balancer health checks
```

---
## Problem 10: Troubleshoot common results
## Solution
### `404 Not Found`
Check that Actuator is included:
```
<artifactId>spring-boot-starter-actuator</artifactId>
```
Check that the `prod` profile is active:
```
sudo journalctl -u pet-shop -n 100 --no-pager | grep -i profile
```
Check the application is running on port `8080`:
```
sudo ss -lntp | grep ':8080'
```
### `401 Unauthorized`
Your Spring Security configuration is protecting the endpoint.
Permit:
```
.requestMatchers("/actuator/health").permitAll()
```
Then rebuild and redeploy.
### `503 Service Unavailable`
The application is running, but one of its health components is unhealthy.
Check:
```
sudo journalctl -u pet-shop -n 150 --no-pager
```
Common causes include:
```
RDS connection failure
Incorrect database password
Flyway failure
Database unavailable
Disk-space problem
```
### Connection refused
Example:
```
curl: (7) Failed to connect to 127.0.0.1 port 8080
```
This means Spring Boot is not listening.
Check:
```
sudo systemctl status pet-shop --no-pager
sudo journalctl -u pet-shop -n 150 --no-pager
```

---
# Final configuration
Use this in `application-prod.yaml`:
```
management:
  endpoints:
    web:
      exposure:
        include: health,info
  endpoint:
    health:
      show-details: never
```
Then test:
```
curl -i http://127.0.0.1:8080/actuator/health
curl -i http://127.0.0.1:8080/actuator/info
curl -i http://127.0.0.1:8080/actuator/env
```
Expected:
```
/actuator/health → 200, {"status":"UP"}
/actuator/info   → 200, possibly {}
/actuator/env    → 404 or unavailable
```
## Checklist
```
[ ] Add spring-boot-starter-actuator
[ ] Add Actuator settings to application-prod.yaml
[ ] Expose only health and info
[ ] Set show-details to never
[ ] Activate the prod profile
[ ] Rebuild and redeploy the JAR
[ ] Restart the pet-shop service
[ ] Test /actuator/health locally
[ ] Test /actuator/info locally
[ ] Confirm /actuator/env is unavailable
[ ] Permit /actuator/health in Spring Security
[ ] Test through Nginx after the local test succeeds
```