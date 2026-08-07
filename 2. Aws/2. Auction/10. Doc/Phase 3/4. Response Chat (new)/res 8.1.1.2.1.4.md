# Main Problem
You need to confirm that the Spring Boot service is actually running and listening only on:
```
127.0.0.1:8080
```
Then you test the Actuator health endpoint.
## Problem 1: Connect to the EC2 terminal
Open:
```
EC2
→ Instances
→ pet-shop-backend-ec2
→ Connect
→ Session Manager
→ Connect
```
## Problem 2: Check the service first
Run:
```
sudo systemctl status pet-shop --no-pager
```
You want to see:
```
Active: active (running)
```
If it is not running, start it:
```
sudo systemctl start pet-shop
```
Then check again:
```
sudo systemctl status pet-shop --no-pager
```
## Problem 3: Check port 8080
Run:
```
sudo ss -lntp | grep ':8080'
```
A correct result should look similar to:
```
LISTEN 0 100 127.0.0.1:8080 0.0.0.0:* users:(("java",pid=1234,fd=42))
```
The important part is:
```
127.0.0.1:8080
```
That means Spring Boot is only accessible from inside the EC2 server.
If you see:
```
0.0.0.0:8080
```
then Spring Boot is listening on every network interface. Check that `/etc/pet-shop/pet-shop.env` contains:
```
SERVER_ADDRESS=127.0.0.1
SERVER_PORT=8080
```
Then restart:
```
sudo systemctl restart pet-shop
```
## Problem 4: Test the health endpoint
Run:
```
curl -i http://127.0.0.1:8080/actuator/health
```
Expected response:
```
HTTP/1.1 200
```
and:
```
{"status":"UP"}
```
You can also run the shorter version:
```
curl http://127.0.0.1:8080/actuator/health
```
## Problem 5: If nothing appears for port 8080
If this command returns no output:
```
sudo ss -lntp | grep ':8080'
```
then Spring Boot is not listening.
Check the logs:
```
sudo journalctl -u pet-shop -n 150 --no-pager
```
Common causes are:
```
Wrong database password
Wrong RDS endpoint
Flyway migration error
JAR file missing
Java version mismatch
Environment file permission problem
```
## Problem 6: If curl says connection refused
Example:
```
curl: (7) Failed to connect to 127.0.0.1 port 8080
```
That means the application did not start successfully.
Run:
```
sudo systemctl status pet-shop --no-pager
sudo journalctl -u pet-shop -n 150 --no-pager
```
## Problem 7: If Actuator returns 404
Check that the project includes:
```
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```
Also confirm `application-prod.yaml` contains:
```
management:
  endpoints:
    web:
      exposure:
        include: health,info
```
Then rebuild the JAR, upload it again, and restart the service.
## Run these commands now
```
sudo systemctl status pet-shop --no-pager
sudo ss -lntp | grep ':8080'
curl -i http://127.0.0.1:8080/actuator/health
```
The final successful result is:
```
Active: active (running)
127.0.0.1:8080
HTTP/1.1 200
{"status":"UP"}
```