You should test it in **three layers**, in this order, so you know exactly where a problem is.
First, SSH into your EC2 server. From your Windows terminal, it usually looks like:
```
ssh -i "your-key.pem" ubuntu@54.179.121.250
```
Once you're inside EC2, test Spring Boot directly:
```
curl http://127.0.0.1:8080/actuator/health
```
You should get:
```
{"status":"UP"}
```
If this fails, the problem is with your Spring Boot app, not Nginx. Check whether the app is running:
```
sudo ss -ltnp | grep 8080
```
Next, test Nginx locally on the EC2 machine:
```
curl http://127.0.0.1/actuator/health
```
This request goes to port 80 by default. If this works and returns:
```
{"status":"UP"}
```
then Nginx is correctly forwarding traffic to Spring Boot.
You can also verify Nginx is running:
```
sudo systemctl status nginx
```
and check the config:
```
sudo nginx -t
```
Your Nginx config should contain something similar to:
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
If you changed the config, reload Nginx:
```
sudo nginx -t
sudo systemctl reload nginx
```
Finally, on your own computer, open this in the browser:
```
http://54.179.121.250/actuator/health
```
or test it from PowerShell:
```
	curl http://54.179.121.250/actuator/health
```
You should see:
```
{"status":"UP"}
```
So the full test sequence is:
```
# 1. Spring Boot directly
curl http://127.0.0.1:8080/actuator/health
# 2. Through Nginx locally
curl http://127.0.0.1/actuator/health
```
Then from your computer:
```
http://54.179.121.250/actuator/health
```
If **step 1 works but step 2 fails**, your Nginx configuration is the problem. If **steps 1 and 2 work but the public IP fails**, check your AWS EC2 Security Group and make sure inbound **HTTP TCP port 80** is allowed.