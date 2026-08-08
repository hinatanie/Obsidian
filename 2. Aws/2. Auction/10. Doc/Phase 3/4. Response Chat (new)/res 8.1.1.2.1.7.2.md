# Main Problem
Your output is actually **not wrong yet**.
The important clue is here:
```
Active: active (running) since Fri 2026-08-07 04:10:42 UTC; 2s ago
```
You checked the service only **2 seconds after it started**.
At that moment, Spring Boot was still starting:
```
:: Spring Boot :: (v4.0.1)
... The following 1 profile is active: "prod"
```
It had **not reached the point where the embedded web server opened port 8080 yet**.
That is why this returned nothing:
```
sudo ss -lntp | grep ':8080'
```
## Problem 1: `systemctl active` does not mean Spring Boot is ready
## Solution
`systemd` considers the application running as soon as this process exists:
```
/usr/bin/java -jar /opt/pet-shop/pet-shop.jar
```
So:
```
Active: active (running)
```
means:
```
Java process exists
```
It does **not** necessarily mean:
```
Spring Boot startup completed
Database connected
Flyway finished
Tomcat started
Port 8080 listening
Application ready
```
Your startup sequence currently looks like this:
```
systemd starts Java
        ↓
Spring Boot starts
        ↓
prod profile loads
        ↓
datasource configuration loads
        ↓
connect to RDS
        ↓
Flyway migrations run
        ↓
JPA initializes
        ↓
Tomcat starts
        ↓
8080 begins listening
```
You checked here:
```
systemd starts Java
        ↓
Spring Boot starting    ← you are here
```
but you expected:
```
Tomcat started
        ↓
8080 listening
```

---
# Problem 2: Watch the application finish starting
## Solution
Run this:
```
sudo journalctl -u pet-shop -f
```
This follows the Spring Boot logs live.
You want eventually to see something similar to:
```
Tomcat started on port 8080 (http)
```
and:
```
Started PetShopApplication in X.XXX seconds
```
Because your production configuration binds Spring Boot to localhost, you may see something mentioning:
```
127.0.0.1:8080
```
Once you see the final `Started ...` line, press:
```
Ctrl+C
```
This **does not stop your Spring Boot application**. It only stops following the logs.
Then run:
```
sudo ss -lntp | grep ':8080'
```
The expected result should look roughly like:
```
LISTEN 0 100 127.0.0.1:8080 0.0.0.0:* users:(("java",pid=8434,fd=...))
```

---
# Problem 3: The application may fail after the log you showed
There is another possibility.
Your current output stops around:
```
The following 1 profile is active: "prod"
```
Spring Boot may continue starting successfully, **or it may encounter an error after this point**.
For example:
```
Cannot connect to RDS
Access denied for MySQL user
Flyway migration failed
Environment variable missing
Hibernate validation failed
Port already in use
```
So check the complete logs with:
```
sudo journalctl -u pet-shop -n 100 --no-pager
```
I recommend using `-l` too because your current output says:
```
Hint: Some lines were ellipsized
```
Run:
```
sudo systemctl status pet-shop --no-pager -l
```
and:
```
sudo journalctl -u pet-shop -n 100 --no-pager
```

---
# Problem 4: Check whether the Java process remains alive
Wait a few seconds and run:
```
sudo systemctl status pet-shop --no-pager -l
```
There are two important outcomes.
### Good
```
Active: active (running)
```
and logs eventually contain:
```
Started PetShopApplication
```
Then:
```
sudo ss -lntp | grep ':8080'
```
should show the Java process.
### Bad
You may instead see:
```
Active: failed
```
or:
```
activating (auto-restart)
```
or the PID keeps changing.
That means Spring Boot starts, crashes, and `systemd` attempts to restart it.

---
# What I want you to do now
Run this first:
```
sudo journalctl -u pet-shop -n 100 --no-pager
```
Look especially at the **bottom 20–30 lines**.
If startup is successful, you should eventually have:
```
Spring Boot
   ↓
RDS connection OK
   ↓
Flyway OK
   ↓
JPA OK
   ↓
Tomcat started on 8080
   ↓
Started PetShopApplication
```
Then:
```
sudo ss -lntp | grep ':8080'
```
will no longer be empty.
If you paste the output of:
```
sudo journalctl -u pet-shop -n 100 --no-pager
```
I can identify exactly where your Pet Shop startup is stopping.