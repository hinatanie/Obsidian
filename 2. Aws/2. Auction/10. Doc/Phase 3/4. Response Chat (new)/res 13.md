# Main Problem
Your Spring Boot app is currently running only on:
```
127.0.0.1:8080
```
That is good because users on the internet should **not** connect directly to Spring Boot.
The production-style flow for your current learning architecture should be:
```
Internet
   ↓
https://api.your-domain.com
   ↓
EC2 Security Group :443
   ↓
Nginx
   ↓
http://127.0.0.1:8080
   ↓
Spring Boot
```
For HTTPS, Nginx will hold the TLS certificate. Certbot can obtain a free Let's Encrypt certificate and update Nginx automatically. Certbot's official Nginx instructions support `certbot --nginx`, and Let's Encrypt recommends keeping port 80 available so HTTP can redirect to HTTPS.
## Problem 1: You need a domain name
## Solution
You cannot normally get a standard Let's Encrypt certificate for an EC2 IP address alone.
You need something like:
```
your-domain.com
```
and then create a subdomain:
```
api.your-domain.com
```
For example, if you owned:
```
happy-pet-shop.com
```
you could use:
```
api.happy-pet-shop.com
```
You can buy/manage the domain using Route 53 or another DNS provider such as Cloudflare or Namecheap.

---
## Problem 2: Your EC2 public IP should be stable
Your domain needs to point to the EC2 public address.
But AWS normally gives an EC2 instance a new public IPv4 address after a stop/start cycle.
So this is risky:
```
api.your-domain.com
       ↓
13.212.x.x
stop EC2
start EC2
       ↓
new IP 54.x.x.x
DNS still points to old IP ❌
```
For a domain-backed direct-EC2 setup, use an **Elastic IP**.
In AWS Console:
```
EC2
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
After association, record the Elastic IP, for example:
```
54.169.10.25
```
That becomes the stable address for your API.

---
## Problem 3: Create the DNS record
## Solution
In the DNS provider that manages your domain, create an `A` record.
For example:
```
Type: A
Name: api
Value: 54.169.10.25
TTL: 300
```
Then:
```
api.your-domain.com
        ↓
54.169.10.25
        ↓
pet-shop-backend-ec2
```
If you're using Route 53:
```
Route 53
→ Hosted zones
→ your-domain.com
→ Create record
```
Configure:
```
Record name: api
Record type: A
Value: <EC2 Elastic IP>
TTL: 300
```

---
## Problem 4: Check DNS before doing anything with Certbot
From your Windows computer:
```
nslookup api.your-domain.com
```
You want:
```
Name:    api.your-domain.com
Address: 54.169.10.25
```
The IP must be your EC2 Elastic IP.
You can also test from EC2:
```
getent hosts api.your-domain.com
```
Do not run Certbot until DNS points to your EC2 server.

---
## Problem 5: Make sure the EC2 Security Group allows HTTP and HTTPS
Your `pet-shop-backend-sg` should have:
```
Type    Port    Source
HTTP    80      0.0.0.0/0
HTTPS   443     0.0.0.0/0
SSH     22      Your IP only
```
If you use IPv6 publicly, you may additionally need:
```
HTTP    80      ::/0
HTTPS   443     ::/0
```
Port `80` is particularly important during the normal Let's Encrypt HTTP validation flow. Let's Encrypt recommends keeping it open and redirecting HTTP traffic to HTTPS afterward.
You **do not need to expose 8080 publicly**.
Keep:
```
8080 → not publicly accessible
```
because Nginx communicates with:
```
127.0.0.1:8080
```
internally.

---
# Problem 6: Configure Nginx for your domain
## Solution
First verify Nginx:
```
sudo systemctl status nginx
```
Then open your Nginx Pet Shop configuration.
For example:
```
sudo nano /etc/nginx/sites-available/pet-shop
```
Before HTTPS, configure HTTP:
```
server {
    listen 80;
    listen [::]:80;
    server_name api.your-domain.com;
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
Replace:
```
api.your-domain.com
```
with your real domain.
For example:
```
server_name api.happy-pet-shop.com;
```

---
## Problem 7: Enable the Nginx configuration
If you haven't already enabled it:
```
sudo ln -s /etc/nginx/sites-available/pet-shop /etc/nginx/sites-enabled/pet-shop
```
If you already have that symlink, don't create it again.
You can check:
```
ls -l /etc/nginx/sites-enabled/
```
It should contain something like:
```
pet-shop -> /etc/nginx/sites-available/pet-shop
```

---
## Problem 8: Disable the default Nginx page
If the default site is still enabled:
```
sudo rm -f /etc/nginx/sites-enabled/default
```
Then check your configuration:
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
# Problem 9: Test HTTP before installing HTTPS
This step is important.
From EC2:
```
curl -i http://127.0.0.1:8080/actuator/health
```
You already know this should return:
```
HTTP/1.1 200
{"groups":["liveness","readiness"],"status":"UP"}
```
Now test through Nginx:
```
curl -i http://api.your-domain.com/actuator/health
```
You want:
```
HTTP/1.1 200
```
and:
```
{"groups":["liveness","readiness"],"status":"UP"}
```
Also try from your Windows browser:
```
http://api.your-domain.com/actuator/health
```
If HTTP doesn't work, **do not proceed to Certbot yet**.
The path must work first:
```
Internet
↓
port 80
↓
Nginx
↓
127.0.0.1:8080
↓
Spring Boot
```

---
# Problem 10: Install Certbot
On Ubuntu, Certbot currently recommends its Snap installation for Ubuntu/Nginx.
First check:
```
snap --version
```
Then install Certbot:
```
sudo snap install --classic certbot
```
Create the command link:
```
sudo ln -s /snap/bin/certbot /usr/local/bin/certbot
```
If that symlink already exists, you may receive:
```
File exists
```
That's okay if `certbot --version` works.
Check:
```
certbot --version
```

---
# Problem 11: Request the HTTPS certificate
Once these are true:
```
DNS → EC2 ✅
port 80 open ✅
Nginx running ✅
HTTP domain works ✅
```
run:
```
sudo certbot --nginx -d api.your-domain.com
```
For example:
```
sudo certbot --nginx -d api.happy-pet-shop.com
```
Certbot will ask for an email address and agreement to Let's Encrypt's terms.
It will then:
```
contact Let's Encrypt
↓
prove api.your-domain.com points to this EC2
↓
obtain certificate
↓
install certificate
↓
modify Nginx
```
The official Certbot Nginx workflow supports automatically installing the certificate and configuring HTTPS.

---
# Problem 12: Redirect HTTP to HTTPS
Certbot can normally configure this for you.
Afterward, your Nginx configuration will conceptually become:
```
server {
    listen 80;
    server_name api.your-domain.com;
    return 301 https://$host$request_uri;
}
server {
    listen 443 ssl;
    server_name api.your-domain.com;
    ssl_certificate /etc/letsencrypt/live/api.your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.your-domain.com/privkey.pem;
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
You generally don't need to manually write the certificate paths if Certbot successfully updates Nginx.

---
# Problem 13: Test HTTPS
Run:
```
curl -i https://api.your-domain.com/actuator/health
```
Expected:
```
HTTP/1.1 200
```
and:
```
{"groups":["liveness","readiness"],"status":"UP"}
```
Then test HTTP:
```
curl -I http://api.your-domain.com/actuator/health
```
You want a redirect similar to:
```
HTTP/1.1 301 Moved Permanently
Location: https://api.your-domain.com/actuator/health
```
So:
```
HTTP
 ↓
301 redirect
 ↓
HTTPS
 ↓
Nginx
 ↓
Spring Boot
```

---
# Problem 14: Test certificate renewal
Let's Encrypt certificates need renewal, and Certbot's Ubuntu package sets up automated renewal handling. The official recommendation is to verify it with a dry run.
Run:
```
sudo certbot renew --dry-run
```
You want a successful result.
You can also inspect the renewal timer:
```
systemctl list-timers | grep certbot
```

---
# Your final Pet Shop architecture
Once this is complete:
```
Browser / React frontend
        |
        | HTTPS
        | api.your-domain.com:443
        ↓
Internet
        ↓
EC2 Elastic IP
        ↓
pet-shop-backend-sg
443 allowed
        ↓
Nginx
TLS certificate
Let's Encrypt
        ↓
127.0.0.1:8080
        ↓
Spring Boot
        ↓
RDS MySQL
private subnet
```
And port `80` is only used to redirect:
```
HTTP :80
↓
301
↓
HTTPS :443
```
Your Spring Boot port stays private:
```
8080 → 127.0.0.1 only ✅
```
The first thing you need before we continue is a domain or subdomain such as `api.example.com`. If you already own a domain, the next concrete task is to create its DNS `A` record pointing at your EC2 public/Elastic IP.