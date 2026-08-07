# Main Problem
Your Pet Shop project must include the libraries required to:
```
Receive HTTP requests
Authenticate users
Read and write MySQL data
Run Flyway migrations
Expose health information for AWS
Build and run with Java 21
```
You should update the project’s existing build file:
```
Maven project → pom.xml
Gradle project → build.gradle or build.gradle.kts
```
Do not create a second build system.
Spring Boot manages compatible versions for most supported dependencies, so you normally should **not add individual version numbers** to Spring Boot starters, MySQL Connector/J, or Flyway modules.

---
## Problem 1: Identify your existing build tool
## Solution
Open the project root directory.
Use Maven when you see:
```
pom.xml
mvnw
mvnw.cmd
```
Use Gradle when you see:
```
build.gradle
```
or:
```
build.gradle.kts
gradlew
gradlew.bat
```
Do not change:
```
Maven → Gradle
```
or:
```
Gradle → Maven
```
just for deployment.
The EC2 server does not care whether Maven or Gradle built the application. It receives the final executable JAR and runs:
```
java -jar pet-shop.jar
```
Spring Boot supports creating standalone applications that run through `java -jar`.

---
# Maven Instructions
Continue with this section when your project contains `pom.xml`.
## Problem 2: Configure Java 21 in Maven
## Solution
Open:
```
pom.xml
```
Confirm that the project inherits from Spring Boot:
```
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>21</version>
    <relativePath/>
</parent>
```
Keep the project’s existing supported Spring Boot version unless you are deliberately performing an upgrade.
Configure Java 21:
```
<properties>
    <java.version>21</java.version>
</properties>
```
Java 21 is supported by current Spring Boot generations, although the exact compatibility range depends on your Spring Boot version.

---
## Problem 3: Add the Maven dependencies
## Solution
Inside:
```
<dependencies>
    ...
</dependencies>
```
add or verify the following dependencies:
```
<dependencies>
    <!-- REST controllers and embedded web server -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <!-- Authentication and authorization -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-security</artifactId>
    </dependency>
    <!-- JPA, Hibernate and repository support -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>
    <!-- MySQL JDBC driver -->
    <dependency>
        <groupId>com.mysql</groupId>
        <artifactId>mysql-connector-j</artifactId>
        <scope>runtime</scope>
    </dependency>
    <!-- Flyway migration engine -->
    <dependency>
        <groupId>org.flywaydb</groupId>
        <artifactId>flyway-core</artifactId>
    </dependency>
    <!-- MySQL database support for modern Flyway versions -->
    <dependency>
        <groupId>org.flywaydb</groupId>
        <artifactId>flyway-mysql</artifactId>
    </dependency>
    <!-- Health checks and operational endpoints -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-actuator</artifactId>
    </dependency>
    <!-- Tests -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-test</artifactId>
        <scope>test</scope>
    </dependency>
    <!-- Spring Security testing utilities -->
    <dependency>
        <groupId>org.springframework.security</groupId>
        <artifactId>spring-security-test</artifactId>
        <scope>test</scope>
    </dependency>
</dependencies>
```
For MySQL, current Spring Boot documentation says to include the corresponding Flyway database module, `flyway-mysql`, so Flyway can support MySQL migrations.
Actuator should be added using `spring-boot-starter-actuator`; it provides production-oriented endpoints such as application health information.

---
## Problem 4: Confirm the Maven build plugin
## Solution
Under:
```
<build>
```
confirm:
```
<build>
    <plugins>
        <plugin>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-maven-plugin</artifactId>
        </plugin>
    </plugins>
</build>
```
This plugin creates an executable Spring Boot JAR containing the application and required runtime dependencies.

---
## Complete Maven example
Your relevant `pom.xml` sections should look similar to:
```
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="
             http://maven.apache.org/POM/4.0.0
             https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>YOUR_EXISTING_SPRING_BOOT_VERSION</version>
        <relativePath/>
    </parent>
    <groupId>com.example</groupId>
    <artifactId>pet-shop</artifactId>
    <version>0.0.1-SNAPSHOT</version>
    <name>pet-shop</name>
    <properties>
        <java.version>21</java.version>
    </properties>
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-security</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </dependency>
        <dependency>
            <groupId>com.mysql</groupId>
            <artifactId>mysql-connector-j</artifactId>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>org.flywaydb</groupId>
            <artifactId>flyway-core</artifactId>
        </dependency>
        <dependency>
            <groupId>org.flywaydb</groupId>
            <artifactId>flyway-mysql</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-actuator</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.springframework.security</groupId>
            <artifactId>spring-security-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>
    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>
</project>
```
Replace:
```
YOUR_EXISTING_SPRING_BOOT_VERSION
```
with the version already used by your project. Do not blindly replace it with the newest release because major-version upgrades can require code and configuration changes.

---
# Gradle Groovy Instructions
Use this section only when your project contains:
```
build.gradle
```
## Problem 5: Configure Java 21 in Gradle
## Solution
Use a Java toolchain:
```
java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}
```
Then configure dependencies:
```
dependencies {
    implementation 'org.springframework.boot:spring-boot-starter-web'
    implementation 'org.springframework.boot:spring-boot-starter-security'
    implementation 'org.springframework.boot:spring-boot-starter-data-jpa'
    runtimeOnly 'com.mysql:mysql-connector-j'
    implementation 'org.flywaydb:flyway-core'
    implementation 'org.flywaydb:flyway-mysql'
    implementation 'org.springframework.boot:spring-boot-starter-actuator'
    testImplementation 'org.springframework.boot:spring-boot-starter-test'
    testImplementation 'org.springframework.security:spring-security-test'
}
```
A typical relevant `build.gradle` configuration is:
```
plugins {
    id 'java'
    id 'org.springframework.boot' version 'YOUR_EXISTING_SPRING_BOOT_VERSION'
    id 'io.spring.dependency-management' version 'YOUR_EXISTING_DEPENDENCY_MANAGEMENT_VERSION'
}
group = 'com.example'
version = '0.0.1-SNAPSHOT'
java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}
repositories {
    mavenCentral()
}
dependencies {
    implementation 'org.springframework.boot:spring-boot-starter-web'
    implementation 'org.springframework.boot:spring-boot-starter-security'
    implementation 'org.springframework.boot:spring-boot-starter-data-jpa'
    runtimeOnly 'com.mysql:mysql-connector-j'
    implementation 'org.flywaydb:flyway-core'
    implementation 'org.flywaydb:flyway-mysql'
    implementation 'org.springframework.boot:spring-boot-starter-actuator'
    testImplementation 'org.springframework.boot:spring-boot-starter-test'
    testImplementation 'org.springframework.security:spring-security-test'
}
tasks.named('test') {
    useJUnitPlatform()
}
```
Keep your existing plugin versions instead of copying placeholders literally.

---
# Gradle Kotlin Instructions
Use this section when the project contains:
```
build.gradle.kts
```
Configure:
```
java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}
dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    runtimeOnly("com.mysql:mysql-connector-j")
    implementation("org.flywaydb:flyway-core")
    implementation("org.flywaydb:flyway-mysql")
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.security:spring-security-test")
}
```

---
## Problem 6: Understand what every dependency does
## Solution
### Spring Web
```
spring-boot-starter-web
```
Provides:
```
@RestController
@RequestMapping
JSON request and response support
Embedded Tomcat by default
HTTP endpoint handling
```
You need it for endpoints such as:
```
GET /api/pets
POST /api/orders
POST /api/auth/login
```
### Spring Security
```
spring-boot-starter-security
```
Provides:
```
Authentication
Authorization
Security filter chain
Password encoding
Protected endpoints
```
Include it when your Pet Shop application has login, JWT authentication, roles, or protected endpoints.
Be aware that merely adding Spring Security protects web endpoints by default. If the project does not yet contain a `SecurityFilterChain`, requests may start returning:
```
401 Unauthorized
```
or redirect to a login page.
That does not mean the dependency is broken; it means security configuration is now active.
### Spring Data JPA
```
spring-boot-starter-data-jpa
```
Provides:
```
JPA
Hibernate
Entity mapping
Repository interfaces
Transactions
```
It allows code such as:
```
public interface PetRepository extends JpaRepository<Pet, Long> {
}
```
Spring Boot’s SQL documentation describes JPA and Spring Data repositories as standard supported approaches for relational database access.
### MySQL Connector/J
```
com.mysql:mysql-connector-j
```
This is the JDBC driver that allows Java to communicate with RDS MySQL.
Without it, Spring Boot may fail with errors similar to:
```
Cannot load driver class: com.mysql.cj.jdbc.Driver
```
Use:
```
<scope>runtime</scope>
```
in Maven or:
```
runtimeOnly
```
in Gradle because application code generally does not directly compile against driver implementation classes.
### Flyway Core
```
org.flywaydb:flyway-core
```
Provides the migration engine that reads files such as:
```
src/main/resources/db/migration/V1__create_users.sql
src/main/resources/db/migration/V2__create_pets.sql
```
### Flyway MySQL
```
org.flywaydb:flyway-mysql
```
Provides MySQL-specific Flyway database support.
For modern Flyway versions, using only `flyway-core` may produce a database-support error. Spring Boot’s database initialization documentation explicitly identifies `flyway-mysql` as the module for MySQL.
### Spring Boot Actuator
```
spring-boot-starter-actuator
```
Provides operational endpoints such as:
```
/actuator/health
/actuator/info
/actuator/metrics
```
The health endpoint reports basic application health and can later be used by monitoring or a load balancer.
Do not expose every Actuator endpoint publicly.

---
## Problem 7: Avoid duplicate or obsolete dependencies
## Solution
Search your build file for old MySQL coordinates.
Replace this older coordinate:
```
<dependency>
    <groupId>mysql</groupId>
    <artifactId>mysql-connector-java</artifactId>
</dependency>
```
with:
```
<dependency>
    <groupId>com.mysql</groupId>
    <artifactId>mysql-connector-j</artifactId>
    <scope>runtime</scope>
</dependency>
```
Do not include both.
Also avoid adding these when Spring Data JPA is already present:
```
spring-jdbc
hibernate-core
jakarta.persistence-api
```
unless the project has a specific reason. `spring-boot-starter-data-jpa` already brings the necessary JPA and Hibernate stack.
Do not manually specify arbitrary versions like:
```
<version>latest</version>
```
or:
```
<version>8.4.0</version>
```
for every dependency. Let the Spring Boot dependency-management model choose mutually compatible versions.

---
## Problem 8: Build and verify the Maven project
## Solution
On your development computer, not EC2, run:
### Windows PowerShell
```
.\mvnw.cmd clean test
```
Then build:
```
.\mvnw.cmd clean package
```
### Linux, macOS, Git Bash or WSL
```
./mvnw clean test
./mvnw clean package
```
If your project does not contain the Maven Wrapper but Maven is installed:
```
mvn clean test
mvn clean package
```
The generated JAR should appear under:
```
target/
```
For example:
```
target/pet-shop-0.0.1-SNAPSHOT.jar
```
Check the Java bytecode version if needed:
```
javap -verbose -classpath target/pet-shop-0.0.1-SNAPSHOT.jar \
  com.example.petshop.PetShopApplication | grep "major version"
```
Java 21 normally produces:
```
major version: 65
```

---
## Problem 9: Build and verify the Gradle project
## Solution
On Windows:
```
.\gradlew.bat clean test
.\gradlew.bat clean bootJar
```
On Linux, macOS, Git Bash or WSL:
```
./gradlew clean test
./gradlew clean bootJar
```
The JAR should appear under:
```
build/libs/
```
For example:
```
build/libs/pet-shop-0.0.1-SNAPSHOT.jar
```

---
## Problem 10: Run the JAR locally before deploying
## Solution
Run the JAR using the production-like profile and environment variables.
For Maven output:
```
java -jar target/pet-shop-0.0.1-SNAPSHOT.jar
```
For Gradle output:
```
java -jar build/libs/pet-shop-0.0.1-SNAPSHOT.jar
```
When the database configuration is required, provide environment variables first.
Linux or macOS:
```
export DB_HOST="your-rds-endpoint"
export DB_PORT="3306"
export DB_NAME="pet_shop"
export DB_APP_USERNAME="pet_shop_app"
export DB_APP_PASSWORD="your-app-password"
export DB_MIGRATION_USERNAME="pet_shop_migration"
export DB_MIGRATION_PASSWORD="your-migration-password"
export SPRING_PROFILES_ACTIVE="prod"
java -jar target/pet-shop-0.0.1-SNAPSHOT.jar
```
Do not commit the real values into the build file.

---
## Problem 11: Configure a safe Actuator baseline
## Solution
Add this to `application-prod.yaml`:
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
It does not expose all operational endpoints.
Later, test locally:
```
curl http://localhost:8080/actuator/health
```
Expected:
```
{
  "status": "UP"
}
```
Depending on your security configuration, you may also need to explicitly permit `/actuator/health` in the Spring Security filter chain.

---
# Recommended Maven dependency baseline
For your Pet Shop deployment, the baseline is:
```
Java 21
spring-boot-starter-web
spring-boot-starter-security
spring-boot-starter-data-jpa
mysql-connector-j
flyway-core
flyway-mysql
spring-boot-starter-actuator
spring-boot-starter-test
spring-security-test
```
Add Spring Security only when authentication or authorization exists. Because your requirements mention separate database users and a production deployment, Actuator, Flyway, JPA, and the MySQL driver are appropriate.
## Completion checklist
```
[ ] Identify whether the project uses Maven or Gradle
[ ] Keep the existing build tool
[ ] Confirm the project targets Java 21
[ ] Add Spring Web
[ ] Add Spring Security when authentication exists
[ ] Add Spring Data JPA
[ ] Add MySQL Connector/J using com.mysql:mysql-connector-j
[ ] Add Flyway Core
[ ] Add Flyway MySQL
[ ] Add Spring Boot Actuator
[ ] Do not specify unnecessary dependency versions
[ ] Remove duplicate or obsolete MySQL drivers
[ ] Run clean test
[ ] Build the executable JAR locally
[ ] Run the JAR locally before uploading it to EC2
[ ] Do not install Maven or Gradle permanently on EC2
```