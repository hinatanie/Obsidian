# Main Problem
Yes — the important part is now working:
```
LISTEN ... 127.0.0.1:8080 ... java
```
That means your Spring Boot app is successfully running and listening on port `8080`.
So this part is fixed:
```
systemd → Spring Boot → Tomcat → port 8080 ✅
```
The remaining issue is only this:
```
GET /actuator/health
→ 404
```
## Problem 1: Why `/actuator/health` returns 404
## Solution
A `404` means Spring Boot is reachable, but that endpoint is not currently exposed at that path.
Common causes are:
```
spring-boot-starter-actuator is not included
```
or:
```
management.endpoints.web.exposure.include
```
does not include `health`.
Check your `pom.xml` for:
```
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```
Then in `application-prod.yaml`, use something like:
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
After rebuilding and redeploying, this should work:
```
curl -i http://127.0.0.1:8080/actuator/health
```
Expected:
```
HTTP/1.1 200
Content-Type: application/json
{"status":"UP"}
```
## Problem 2: Your curl command formatting
In the terminal, use the raw URL:
```
curl -i http://127.0.0.1:8080/actuator/health
```
Not the Markdown-style form:
```
[http://127.0.0.1:8080/actuator/health](http://127.0.0.1:8080/actuator/health)
```
So right now your status is:
```
Spring Boot running ✅
Port 8080 listening ✅
RDS/Flyway issue fixed ✅
Actuator health endpoint ❌ 404
```
That is a much smaller problem now. If you paste your `pom.xml` Actuator dependency and your `application-prod.yaml`, I can tell you exactly what needs changing.