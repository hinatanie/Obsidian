# Main Problem
Your React frontend and Spring Boot backend are on different origins.
For example:
```
Frontend:
http://localhost:5173
Backend:
http://localhost:8080
```
and in production:
```
Frontend:
https://main.xxxxx.amplifyapp.com
Backend:
https://YOUR_BACKEND
```
Because the scheme/host/port are different, the browser enforces CORS.
You need Spring Boot to explicitly allow requests from your trusted frontend origins.
## Problem 1: Configure CORS in Spring Boot
## Solution
If you use Spring Security, the cleanest setup is to configure CORS centrally.
Create something like:
```
package com.funcoders.happy_pet_shop.config;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.cors.CorsConfigurationSource;
import java.util.List;
@Configuration
public class CorsConfig {
    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of(
                "http://localhost:5173",
                "https://new-main.d213ba06r4edsz.amplifyapp.com/"
        ));
        configuration.setAllowedMethods(List.of(
                "GET",
                "POST",
                "PUT",
                "PATCH",
                "DELETE",
                "OPTIONS"
        ));
        configuration.setAllowedHeaders(List.of(
                "Authorization",
                "Content-Type"
        ));
        configuration.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source =
                new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
```
use with my Amplify frontend URL.
```
https://new-main.d213ba06r4edsz.amplifyapp.com/
```
## Problem 2: Enable CORS in Spring Security
## Solution
In your `SecurityConfig`, make sure CORS is enabled.
Conceptually:
```
@Bean
SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    http
        .cors(cors -> {})
        .csrf(csrf -> csrf.disable());
    return http.build();
}
```
If you already have a larger security configuration, keep your existing authorization rules and just make sure this exists:
```
.cors(cors -> {})
```
The flow becomes:
```
Browser
   ↓
Spring Security
   ↓
CorsConfigurationSource
   ↓
trusted origin?
   ↓
yes → continue
no  → reject
```

---
# Problem 3: Why not use `"*"`?
Avoid this:
```
configuration.setAllowedOrigins(List.of("*"));
```
especially when you use:
```
configuration.setAllowCredentials(true);
```
A wildcard origin and credentialed requests are not a good combination.
Use explicit origins:
```
"http://localhost:5173"
"https://main.xxxxx.amplifyapp.com"
```
That means:
```
Your frontend ✅
Random website ❌
```

---
# Problem 4: If you use JWT in the Authorization header
Your frontend probably sends something like:
```
Authorization: Bearer eyJ...
```
So this must be allowed:
```
configuration.setAllowedHeaders(List.of(
    "Authorization",
    "Content-Type"
));
```
Otherwise the browser's preflight request can fail before your actual API request is sent.

---
# Problem 5: Understand the preflight request
Suppose React sends:
```
POST /api/v1/auth/login
Content-Type: application/json
```
or a request with:
```
Authorization: Bearer ...
```
The browser may first send:
```
OPTIONS /api/v1/...
```
This asks:
```
Can https://main.xxxxx.amplifyapp.com
send POST requests
with Authorization/Content-Type?
```
Spring Boot must answer with appropriate CORS headers.

---
# Problem 6: Test CORS from EC2
You can manually test the preflight request.
For development:
```
curl -i -X OPTIONS http://127.0.0.1:8080/api/v1/auth/login \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type"
```
You want headers similar to:
```
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Methods: GET,POST,PUT,PATCH,DELETE,OPTIONS
Access-Control-Allow-Credentials: true
```
For production, test your Amplify origin:
```
curl -i -X OPTIONS http://127.0.0.1:8080/api/v1/auth/login \
  -H "Origin: https://https://new-main.d213ba06r4edsz.amplifyapp.com/" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type"
```
Replace the Amplify URL with your real one.

---
# Problem 7: Better configuration for local vs production
Instead of hardcoding both URLs forever, you can put allowed origins in configuration.
For example in `application-local.yaml`:
```
app:
  cors:
    allowed-origins:
      - http://localhost:5173
```
and in `application-prod.yaml`:
```
app:
  cors:
    allowed-origins:
      - https://main.xxxxx.amplifyapp.com
```
Then bind that config into your CORS bean.
That is cleaner because:
```
local profile
→ localhost frontend
prod profile
→ Amplify frontend
```
and production does not need to allow localhost.
## Recommended final behavior
Development:
```
http://localhost:5173
        ↓ allowed
Spring Boot
```
Production:
```
https://main.xxxxx.amplifyapp.com
        ↓ allowed
Spring Boot
```
Everything else:
```
https://random-site.com
        ↓ rejected
Spring Boot
```
For your current Pet Shop setup, the most important thing is to replace:
```
https://shop.your-domain.example
```
with your actual Amplify URL.