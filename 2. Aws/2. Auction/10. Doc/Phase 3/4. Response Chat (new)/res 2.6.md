# Main Problem
The error:
```
sh: nc: command not found
```
means the network test tool `nc` is not installed on your EC2 instance.
It does **not** mean the RDS connection failed yet. The test never started.
# Solution
First, check your EC2 operating system:
```
cat /etc/os-release
```
## For Amazon Linux 2023
Install `nc` through the `nmap-ncat` package:
```
sudo dnf install -y nmap-ncat
```
Amazon Linux 2023 uses DNF for package management, and `nmap-ncat` is available in its package repositories.
Verify:
```
nc --version
```
Then test RDS again:
```
nc -zv pet-shop-mysql.cho2uq2auqbz.ap-southeast-1.rds.amazonaws.com 3306
```
## Expected successful result
You should see something similar to:
```
Ncat: Connected to xxx.xxx.xxx.xxx:3306.
Ncat: 0 bytes sent, 0 bytes received
```
or:
```
Connection to pet-shop-mysql... 3306 port [tcp/mysql] succeeded
```
That means:
```
EC2 can resolve the RDS endpoint
EC2 can reach port 3306
The route and security groups are working
```
It does not yet confirm that your username and password are correct.
# If the installation fails
Test whether EC2 has outbound internet access:
```
curl -I https://aws.amazon.com
```
If this times out, check that the EC2 instance has:
```
Subnet: pet-shop-public-subnet-1
Private IP: 10.0.1.x
Public IPv4: Present
Route: 0.0.0.0/0 → pet-shop-igw
Outbound security-group traffic allowed
```
# After the port test succeeds
Install a MySQL-compatible client:
```
sudo dnf install -y mariadb105
```
Then test the actual login:
```
mysql \
  --host=pet-shop-mysql.cho2uq2auqbz.ap-southeast-1.rds.amazonaws.com \
  --port=3306 \
  --user=pet_shop_admin \
  --password \
  pet_shop
```
It will prompt:
```
Enter password:
```
Enter your RDS master password. The password will not appear while you type; that is normal.