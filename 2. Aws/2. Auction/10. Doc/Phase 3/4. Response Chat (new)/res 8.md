# Main Problem
Your Spring Boot JAR needs production configuration, but passwords must not be stored inside:
```
application.yaml
application-prod.yaml
Git
the JAR file
```
For your first EC2 deployment, use this structure:
```
application.yaml
→ shared safe configuration
application-prod.yaml
→ production behavior and environment-variable placeholders
/etc/pet-shop/pet-shop.env
→ real production values and passwords
systemd service
→ loads pet-shop.env and starts the JAR
```
Spring Boot supports environment variables and profile-specific configuration as external configuration sources.

---
## Problem 1: Configure `application.yaml`
## Solution
On your development computer, open:
```
src/main/resources/application.yaml
```
Use:
```
spring:
  application:
    name: pet-shop
  profiles:
    default: local
```
This means:
```
No profile specified
→ Spring Boot uses local
SPRING_PROFILES_ACTIVE=prod
→ Spring Boot uses production settings
```
Do not put database passwords in this file.

---
## Problem 2: Configure `application-prod.yaml`
## Solution
Create or update:
```
src/main/resources/application-prod.yaml
```
Use this configuration:
```
spring:
  datasource:
    url: jdbc:mysql://${DB_HOST}:${DB_PORT:3306}/${DB_NAME}
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
    driver-class-name: com.mysql.cj.jdbc.Driver
    hikari:
      maximum-pool-size: 5
      minimum-idle: 1
      connection-timeout: 30000
  flyway:
    enabled: true
    url: jdbc:mysql://${DB_HOST}:${DB_PORT:3306}/${DB_NAME}
    user: ${DB_MIGRATION_USERNAME}
    password: ${DB_MIGRATION_PASSWORD}
    locations: classpath:db/migration
  jpa:
    hibernate:
      ddl-auto: validate
    open-in-view: false
    properties:
      hibernate:
        format_sql: false
  sql:
    init:
      mode: never
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
Spring Boot loads `application-prod.yaml` when the `prod` profile is active, and environment variables can override the configuration values.
### What the datasource section does
```
spring:
  datasource:
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
```
This is the normal application connection:
```
pet_shop_app
→ SELECT
→ INSERT
→ UPDATE
→ DELETE
```
### What the Flyway section does
```
spring:
  flyway:
    user: ${DB_MIGRATION_USERNAME}
    password: ${DB_MIGRATION_PASSWORD}
```
This is the migration connection:
```
pet_shop_migration
→ CREATE
→ ALTER
→ DROP
→ INDEX
```
Therefore, Spring Boot uses two different database accounts:
```
Spring Data JPA
→ pet_shop_app
Flyway
→ pet_shop_migration
```

---
## Problem 3: Prevent Hibernate from changing the database
## Solution
Keep:
```
spring:
  jpa:
    hibernate:
      ddl-auto: validate
```
The behavior is:
```
Flyway
→ owns schema changes
Hibernate
→ checks that entity mappings match the database
pet_shop_app
→ does not need CREATE, ALTER or DROP
```
Do not use these in AWS:
```
ddl-auto: create
```
```
ddl-auto: create-drop
```
They can delete and recreate database tables.
Also avoid:
```
ddl-auto: update
```
because it allows Hibernate to make uncontrolled schema changes instead of using versioned Flyway migration files.

---
## Problem 4: Disable Open Session in View
## Solution
Keep:
```
spring:
  jpa:
    open-in-view: false
```
With this disabled, database work should occur inside your service-layer transactions rather than remaining open while the HTTP response is being generated.
Your intended application flow becomes:
```
Controller
→ Service transaction
→ Repository
→ MySQL
→ Transaction closes
→ Response is generated
```
This setting can reveal lazy-loading problems that were previously hidden. Fetch required relationships inside the service transaction or use DTO projections instead of accessing unloaded relationships from the controller.

---
## Problem 5: Bind Spring Boot only to localhost
## Solution
Use:
```
server:
  address: ${SERVER_ADDRESS:127.0.0.1}
  port: ${SERVER_PORT:8080}
```
On EC2, set:
```
SERVER_ADDRESS=127.0.0.1
SERVER_PORT=8080
```
This creates the following path:
```
Internet
    ↓
Nginx: port 80 or 443
    ↓
127.0.0.1:8080
    ↓
Spring Boot
```
Spring Boot will not listen directly on the EC2 public network interface.
You should therefore not add this security-group rule:
```
Custom TCP
Port: 8080
Source: 0.0.0.0/0
```
Nginx and Spring Boot are on the same server, so Nginx can reach `127.0.0.1:8080` without exposing it publicly.

---
## Problem 6: Configure the Actuator endpoints
## Solution
Keep:
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
This exposes only:
```
/actuator/health
/actuator/info
```
It does not expose endpoints such as:
```
/actuator/env
/actuator/beans
/actuator/configprops
/actuator/mappings
```
Those can reveal sensitive application details.
The health endpoint can later be used by:
```
Nginx checks
deployment verification
CloudWatch monitoring
an Application Load Balancer
```

---
## Problem 7: Permit the health endpoint in Spring Security
## Solution
When Spring Security protects all requests, `/actuator/health` might return:
```
401 Unauthorized
```
Update your existing `SecurityFilterChain`. Do not create a second competing security configuration.
A typical configuration is:
```
import org.springframework.boot.actuate.autoconfigure.security.servlet.EndpointRequest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
@Configuration
public class SecurityConfig {
    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(authorize -> authorize
                .requestMatchers(EndpointRequest.to("health", "info"))
                    .permitAll()
                .requestMatchers("/api/auth/**")
                    .permitAll()
                .anyRequest()
                    .authenticated()
            );
        return http.build();
    }
}
```
Merge this rule into your existing JWT or session-based security configuration.
Do not copy this example in a way that removes your existing:
```
JWT filter
CORS configuration
CSRF decision
role authorization
exception handling
```

---
## Problem 8: Create the secret directory on EC2
## Solution
Connect through Session Manager:
```
EC2
→ Instances
→ pet-shop-backend-ec2
→ Connect
→ Session Manager
→ Connect
```
Create a dedicated operating-system account for the application:
```
sudo useradd \
  --system \
  --home /opt/pet-shop \
  --shell /usr/sbin/nologin \
  petshop
```
If it says the user already exists, do not create it again.
Create the required directories:
```
sudo mkdir -p /opt/pet-shop
sudo mkdir -p /etc/pet-shop
sudo mkdir -p /var/log/pet-shop
```
Assign ownership:
```
sudo chown -R petshop:petshop /opt/pet-shop
sudo chown -R petshop:petshop /var/log/pet-shop
```
Keep the configuration directory controlled by root:
```
sudo chown root:root /etc/pet-shop
sudo chmod 750 /etc/pet-shop
```
The structure will be:
```
/opt/pet-shop
→ application JAR
/etc/pet-shop
→ environment configuration
/var/log/pet-shop
→ optional application logs
```

---
## Problem 9: Create `/etc/pet-shop/pet-shop.env`
## Solution
Use the root account through `sudo` to create the file:
```
sudo nano /etc/pet-shop/pet-shop.env
```
Add:
```
SPRING_PROFILES_ACTIVE=prod
DB_HOST=YOUR_RDS_ENDPOINT
DB_PORT=3306
DB_NAME=pet_shop
DB_USERNAME=pet_shop_app
DB_PASSWORD=REPLACE_WITH_APP_PASSWORD
DB_MIGRATION_USERNAME=pet_shop_migration
DB_MIGRATION_PASSWORD=REPLACE_WITH_MIGRATION_PASSWORD
SERVER_ADDRESS=127.0.0.1
SERVER_PORT=8080
```
Replace:
```
YOUR_RDS_ENDPOINT
REPLACE_WITH_APP_PASSWORD
REPLACE_WITH_MIGRATION_PASSWORD
```
with your real values.
Example endpoint format:
```
pet-shop-mysql.abcdefghijkl.ap-southeast-1.rds.amazonaws.com
```
Do not include:
```
https://
jdbc:mysql://
:3306
```
in `DB_HOST`.
Save in Nano:
```
Ctrl + O
Enter
Ctrl + X
```

---
## Problem 10: Protect the environment file
## Solution
Set ownership so root controls the file and the application’s group can read it:
```
sudo chown root:petshop /etc/pet-shop/pet-shop.env
```
Set permissions:
```
sudo chmod 640 /etc/pet-shop/pet-shop.env
```
Verify:
```
sudo ls -l /etc/pet-shop/pet-shop.env
```
Expected:
```
-rw-r----- 1 root petshop ... /etc/pet-shop/pet-shop.env
```
This means:
```
root
→ read and write
petshop group
→ read only
everyone else
→ no access
```
Do not use:
```
sudo chmod 644 /etc/pet-shop/pet-shop.env
```
That would allow every local user to read the database passwords.
You could use stricter `600` permissions:
```
sudo chmod 600 /etc/pet-shop/pet-shop.env
```
but then only root could read the file. For a systemd service running as `petshop`, `640` with group `petshop` is a practical approach.

---
## Problem 11: Check the environment file safely
## Solution
Do not run:
```
cat /etc/pet-shop/pet-shop.env
```
in screenshots, recordings, logs, or shared terminals because it displays the passwords.
Check only the file metadata:
```
sudo stat /etc/pet-shop/pet-shop.env
```
Check the variable names while hiding values:
```
sudo sed 's/=.*/=********/' /etc/pet-shop/pet-shop.env
```
Expected:
```
SPRING_PROFILES_ACTIVE=********
DB_HOST=********
DB_PORT=********
DB_NAME=********
DB_USERNAME=********
DB_PASSWORD=********
DB_MIGRATION_USERNAME=********
DB_MIGRATION_PASSWORD=********
SERVER_ADDRESS=********
SERVER_PORT=********
```

---
## Problem 12: Understand environment-file syntax
## Solution
For a systemd `EnvironmentFile`, use:
```
NAME=value
```
Do not write:
```
export DB_HOST=...
```
Do not add spaces around `=`:
```
DB_PORT = 3306
```
Use:
```
DB_PORT=3306
```
When a value contains spaces or special characters, quoting may be necessary:
```
DB_PASSWORD="your password"
```
However, passwords containing complex quoting characters can be awkward inside environment files. Generate strong random passwords, but test carefully when they contain:
```
"
\
$
```
A password does not need to be typed into SQL again after the MySQL account is created. It only needs to exactly match the account password.

---
## Problem 13: Create the systemd service
## Solution
After uploading the JAR to:
```
/opt/pet-shop/pet-shop.jar
```
set its ownership:
```
sudo chown petshop:petshop /opt/pet-shop/pet-shop.jar
sudo chmod 550 /opt/pet-shop/pet-shop.jar
```
Create the service file:
```
sudo nano /etc/systemd/system/pet-shop.service
```
Add:
```
[Unit]
Description=Pet Shop Spring Boot application
After=network-online.target
Wants=network-online.target
[Service]
Type=simple
User=petshop
Group=petshop
WorkingDirectory=/opt/pet-shop
EnvironmentFile=/etc/pet-shop/pet-shop.env
ExecStart=/usr/bin/java -jar /opt/pet-shop/pet-shop.jar
Restart=on-failure
RestartSec=10
SuccessExitStatus=143
NoNewPrivileges=true
PrivateTmp=true
[Install]
WantedBy=multi-user.target
```
Save and exit.
### Why this is safer
```
User=petshop
→ application does not run as root
EnvironmentFile
→ credentials remain outside the JAR
Restart=on-failure
→ systemd restarts the application after an unexpected failure
NoNewPrivileges=true
→ process cannot gain additional privileges
```

---
## Problem 14: Validate the systemd configuration
## Solution
Run:
```
sudo systemd-analyze verify /etc/systemd/system/pet-shop.service
```
No output normally means systemd found no syntax errors.
Reload systemd:
```
sudo systemctl daemon-reload
```
Enable the service at boot:
```
sudo systemctl enable pet-shop
```
Do not start it until:
```
The JAR exists
The database users exist
The environment values are correct
The Flyway migration files are included
```
Then start:
```
sudo systemctl start pet-shop
```
Check status:
```
sudo systemctl status pet-shop --no-pager
```

---
## Problem 15: Check startup logs
## Solution
Read the latest logs:
```
sudo journalctl -u pet-shop -n 100 --no-pager
```
Follow logs live:
```
sudo journalctl -u pet-shop -f
```
Stop following with:
```
Ctrl + C
```
Look for:
```
Active profile: prod
Flyway migration completed
Tomcat started on port 8080
Started PetShopApplication
```
Do not paste logs publicly before checking whether they contain:
```
database endpoints
usernames
tokens
passwords
stack traces with configuration
```
Spring Boot normally masks many sensitive values, but you should still review logs before sharing them.

---
## Problem 16: Verify that Spring Boot listens only locally
## Solution
Run:
```
sudo ss -lntp | grep ':8080'
```
Correct:
```
LISTEN ... 127.0.0.1:8080
```
Incorrect:
```
LISTEN ... 0.0.0.0:8080
```
Test from inside EC2:
```
curl -i http://127.0.0.1:8080/actuator/health
```
Expected:
```
{"status":"UP"}
```
You can also confirm the `prod` profile through the logs:
```
sudo journalctl -u pet-shop --no-pager |
grep -i "profile"
```

---
## Problem 17: Confirm that the database accounts are separated
## Solution
Check the service’s configured variable names without displaying their values:
```
sudo grep -E \
'^(DB_USERNAME|DB_MIGRATION_USERNAME)=' \
/etc/pet-shop/pet-shop.env
```
Expected:
```
DB_USERNAME=pet_shop_app
DB_MIGRATION_USERNAME=pet_shop_migration
```
Do not use:
```
DB_USERNAME=pet_shop_admin
```
The RDS master or administration account should not be permanently available to the running application.

---
## Problem 18: Handle a Flyway startup failure
## Solution
When Spring Boot starts, Flyway runs before Hibernate completes startup.
A typical sequence is:
```
Spring Boot starts
→ Flyway connects as pet_shop_migration
→ Flyway applies migrations
→ Hibernate validates the schema
→ application starts
```
When Flyway fails, inspect:
```
sudo journalctl -u pet-shop -n 150 --no-pager
```
Common causes include:
```
Wrong migration password
Missing migration permissions
Incorrect RDS endpoint
Invalid migration SQL
Checksum mismatch
Database unavailable
```
After correcting the problem:
```
sudo systemctl restart pet-shop
```

---
## Problem 19: Handle Hibernate validation failure
## Solution
You may see an error similar to:
```
Schema-validation: missing table
```
This means:
```
Your JPA entities expect a database structure
but
Flyway has not created the matching structure
```
Do not fix this by changing:
```
ddl-auto: validate
```
to:
```
ddl-auto: update
```
Instead, create or correct the appropriate Flyway migration:
```
src/main/resources/db/migration/
```
For example:
```
V1__create_users_table.sql
V2__create_products_table.sql
```
Then rebuild and redeploy the JAR.

---
## Problem 20: Configure Nginx for the local application port
## Solution
Nginx should forward public requests to:
```
127.0.0.1:8080
```
A basic server block will later contain:
```
server {
    listen 80;
    server_name _;
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
The resulting path is:
```
Browser
→ EC2 port 80
→ Nginx
→ 127.0.0.1:8080
→ Spring Boot
```

---
# Initial production configuration
Your first deployment should use:
```
/etc/pet-shop/pet-shop.env
```
with:
```
Owner: root
Group: petshop
Permissions: 640
Not stored in Git
Loaded by systemd
```
This is acceptable for an initial single-server learning deployment, but it is still a local secret file. Anyone with sufficient root-level access can read it.

---
# Next improvement: Parameter Store
AWS Systems Manager Parameter Store supports hierarchical names, IAM-based access and encrypted `SecureString` values. `SecureString` values are encrypted through AWS KMS.
A suitable parameter path is:
```
/pet-shop/prod/
```
For example:
```
/pet-shop/prod/db-host
/pet-shop/prod/db-port
/pet-shop/prod/db-name
/pet-shop/prod/db-app-username
/pet-shop/prod/db-app-password
/pet-shop/prod/db-migration-username
/pet-shop/prod/db-migration-password
```
Use `SecureString` for:
```
db-app-password
db-migration-password
```
Use `String` for non-secret values such as:
```
db-host
db-port
db-name
```
Parameter Store values are regional, so create them in the same Region as the EC2 instance, such as `ap-southeast-1`.
The EC2 role should receive only the required read actions and exact parameter resources—not access to every parameter in the account. Be careful when granting `GetParametersByPath`: permission on a parent path can expose all parameters below that path.

---
# Later improvement: Secrets Manager
AWS Secrets Manager is useful when you need managed secret rotation. Depending on the secret type, rotation may use managed rotation or a Lambda rotation function.
Use it later when you need:
```
Automatic RDS credential rotation
rotation schedules
secret version management
stronger managed-secret workflows
```
For your current learning server, complete the local protected environment-file method first.
# Final files
## `application.yaml`
```
spring:
  application:
    name: pet-shop
  profiles:
    default: local
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
      maximum-pool-size: 5
      minimum-idle: 1
      connection-timeout: 30000
  flyway:
    enabled: true
    url: jdbc:mysql://${DB_HOST}:${DB_PORT:3306}/${DB_NAME}
    user: ${DB_MIGRATION_USERNAME}
    password: ${DB_MIGRATION_PASSWORD}
    locations: classpath:db/migration
  jpa:
    hibernate:
      ddl-auto: validate
    open-in-view: false
  sql:
    init:
      mode: never
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
## `/etc/pet-shop/pet-shop.env`
```
SPRING_PROFILES_ACTIVE=prod
DB_HOST=YOUR_RDS_ENDPOINT
DB_PORT=3306
DB_NAME=pet_shop
DB_USERNAME=pet_shop_app
DB_PASSWORD=YOUR_APP_PASSWORD
DB_MIGRATION_USERNAME=pet_shop_migration
DB_MIGRATION_PASSWORD=YOUR_MIGRATION_PASSWORD
SERVER_ADDRESS=127.0.0.1
SERVER_PORT=8080
```
## Final checklist
```
[ ] Create application-prod.yaml
[ ] Use pet_shop_app for the main datasource
[ ] Use pet_shop_migration for Flyway
[ ] Set ddl-auto to validate
[ ] Disable open-in-view
[ ] Disable SQL initialization
[ ] Bind Spring Boot to 127.0.0.1:8080
[ ] Expose only Actuator health and info
[ ] Create the petshop Linux user
[ ] Create /etc/pet-shop/pet-shop.env
[ ] Set ownership to root:petshop
[ ] Set permissions to 640
[ ] Do not commit the environment file
[ ] Load it through systemd
[ ] Verify port 8080 listens only on 127.0.0.1
[ ] Test /actuator/health
[ ] Do not use pet_shop_admin in Spring Boot
[ ] Move secrets to Parameter Store in the next improvement
```