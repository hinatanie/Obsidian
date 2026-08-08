# Main Problem
If you cannot use CloudFront, you still have a good alternative:
```
Internet
   ↓
EC2 public/Elastic IP
   ↓
Nginx
   ↓
127.0.0.1:8080
   ↓
Spring Boot
```
For HTTPS, you now have **two realistic choices**:
1. Use your own domain + Certbot.
2. Use your EC2 public/Elastic IP directly with a short-lived Let’s Encrypt IP certificate.
As of January 2026, Let’s Encrypt supports publicly trusted IPv4/IPv6 certificates, and Certbot 5.3+ can request them. These IP certificates are short-lived, around six days, so automatic renewal is essential.
## Problem 1: Best alternative if you do not want CloudFront
## Solution
For your learning project, you can use:
```
https://YOUR_ELASTIC_IP
```
instead of:
```
https://api.your-domain.com
```
For example:
```
https://54.169.10.25
```
Architecture:
```
Browser
   |
   | HTTPS
   ↓
54.169.10.25
   ↓
EC2 Security Group :443
   ↓
Nginx
   ↓
127.0.0.1:8080
   ↓
Spring Boot
   ↓
RDS
```
This means you do **not** need:
```
CloudFront
Route 53
custom domain
```
for this learning setup.

---
# Problem 2: Use an Elastic IP first
You should not build HTTPS around a normal auto-assigned EC2 public IP, because that IP can change after stop/start.
Go to:
```
AWS Console
→ EC2
→ Network & Security
→ Elastic IP addresses
→ Allocate Elastic IP address
```
Then:
```
Actions
→ Associate Elastic IP address
```
Choose:
```
Resource type: Instance
Instance: pet-shop-backend-ec2
```
Suppose your Elastic IP becomes:
```
54.169.10.25
```
From now on use that address.
Remember that AWS charges for public IPv4 addresses, so for a learning account you should keep an eye on cost.

---
# Problem 3: Make sure the Security Group allows HTTPS
Your `pet-shop-backend-sg` should have:
```
HTTP    TCP 80    0.0.0.0/0
HTTPS   TCP 443   0.0.0.0/0
SSH     TCP 22    Your IP only
```
Do not expose:
```
8080
```
Spring Boot should remain:
```
127.0.0.1:8080
```

---
# Problem 4: Configure Nginx first
On EC2:
```
sudo nano /etc/nginx/sites-available/pet-shop
```
Before HTTPS, use:
```
server {
    listen 80;
    listen [::]:80;
    server_name _;
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
Then:
```
sudo nginx -t
```
You want:
```
syntax is ok
test is successful
```
Then:
```
sudo systemctl reload nginx
```
Test:
```
curl -i http://127.0.0.1/actuator/health
```
Expected:
```
HTTP/1.1 200
```
and:
```
{"groups":["liveness","readiness"],"status":"UP"}
```
Then test the Elastic IP:
```
curl -i http://54.169.10.25/actuator/health
```
Replace the example IP with yours.

---
# Problem 5: Install a recent Certbot
This is important because IP certificate support is new.
Let’s Encrypt says Certbot 5.3 introduced `--ip-address`, and recommends 5.4+ when using the `webroot` flow.
Check:
```
certbot --version
```
If it is old, install/update Certbot using Snap:
```
sudo snap install --classic certbot
```
or:
```
sudo snap refresh certbot
```
Then:
```
certbot --version
```
You want a sufficiently recent version, preferably 5.4+.

---
# Problem 6: Prepare a webroot for Let's Encrypt
Create:
```
sudo mkdir -p /var/www/certbot/.well-known/acme-challenge
```
Give Nginx access:
```
sudo chown -R www-data:www-data /var/www/certbot
```
Now modify:
```
sudo nano /etc/nginx/sites-available/pet-shop
```
Use:
```
server {
    listen 80;
    listen [::]:80;
    server_name _;
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
Then:
```
sudo nginx -t
sudo systemctl reload nginx
```

---
# Problem 7: Test the ACME path before requesting the certificate
Create a test file:
```
echo hello | sudo tee /var/www/certbot/.well-known/acme-challenge/test
```
Then from EC2:
```
curl http://YOUR_ELASTIC_IP/.well-known/acme-challenge/test
```
Example:
```
curl http://54.169.10.25/.well-known/acme-challenge/test
```
Expected:
```
hello
```
This proves Let’s Encrypt should be able to reach:
```
YOUR_IP:80
```

---
# Problem 8: Request an IP certificate
Let’s Encrypt's current Certbot guidance for IP certificates uses the short-lived profile and `--ip-address`.
First, I recommend testing against staging:
```
sudo certbot certonly \
  --staging \
  --preferred-profile shortlived \
  --webroot \
  --webroot-path /var/www/certbot \
  --ip-address YOUR_ELASTIC_IP
```
For example:
```
sudo certbot certonly \
  --staging \
  --preferred-profile shortlived \
  --webroot \
  --webroot-path /var/www/certbot \
  --ip-address 54.169.10.25
```
If staging succeeds, request the real certificate:
```
sudo certbot certonly \
  --preferred-profile shortlived \
  --webroot \
  --webroot-path /var/www/certbot \
  --ip-address YOUR_ELASTIC_IP
```

---
# Problem 9: Find the generated certificate paths
After success, run:
```
sudo certbot certificates
```
It will show the certificate and private-key paths.
You will need those exact paths for Nginx.
They may look conceptually like:
```
Certificate Path:
/etc/letsencrypt/live/54.169.10.25/fullchain.pem
Private Key Path:
/etc/letsencrypt/live/54.169.10.25/privkey.pem
```
Use whatever Certbot actually reports.

---
# Problem 10: Enable HTTPS in Nginx
Edit:
```
sudo nano /etc/nginx/sites-available/pet-shop
```
Conceptually configure:
```
server {
    listen 80;
    listen [::]:80;
    server_name _;
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    location / {
        return 301 https://$host$request_uri;
    }
}
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name _;
    ssl_certificate /etc/letsencrypt/live/YOUR_IP/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/YOUR_IP/privkey.pem;
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
Use the exact paths returned by:
```
sudo certbot certificates
```
Then:
```
sudo nginx -t
```
Expected:
```
syntax is ok
test is successful
```
Then:
```
sudo systemctl reload nginx
```

---
# Problem 11: Test HTTPS
Run:
```
curl -i https://YOUR_ELASTIC_IP/actuator/health
```
For example:
```
curl -i https://54.169.10.25/actuator/health
```
You want:
```
HTTP/1.1 200
```
and:
```
{"groups":["liveness","readiness"],"status":"UP"}
```
Your final flow is then:
```
https://54.169.10.25
        ↓
Nginx :443
        ↓
127.0.0.1:8080
        ↓
Spring Boot
```

---
# Problem 12: Automatic renewal is especially important
This part matters more than with normal Let's Encrypt certificates.
Let's Encrypt IP certificates are currently short-lived certificates, valid for roughly six days.
So you must ensure Certbot renewal works.
Test:
```
sudo certbot renew --dry-run
```
Also check the timer:
```
systemctl list-timers | grep certbot
```
Because the certificates are short-lived, I would not use this setup unless renewal is fully automated and tested.

---
# Which option I recommend
For your current Pet Shop learning project:
```
If you can buy/use a domain
→ domain + Nginx + Certbot
→ simplest long-term approach
If you cannot use a domain
and cannot use CloudFront
→ Elastic IP + Nginx + Let's Encrypt IP certificate
→ works, but certificates are short-lived
```
I would choose the **Elastic IP + Let's Encrypt IP certificate** route for now if you genuinely cannot use either a custom domain or CloudFront. It keeps your architecture simple:
```
Internet
   ↓ HTTPS
Elastic IP
   ↓
Nginx
   ↓
Spring Boot
```
and avoids adding an ALB solely for HTTPS. An ALB is useful later for scaling/high availability, but AWS's normal HTTPS listener model expects a certificate matching a custom domain; the ALB's default `amazonaws.com` DNS name isn't something you can obtain a public ACM certificate for.