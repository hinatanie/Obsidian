That is normal. The file does not exist yet, so you need to create both the directory and the file.
# Main Problem
This path is missing:
```
/etc/pet-shop/pet-shop.env
```
There may also be no `/etc/pet-shop` directory yet.
## Problem 1: Create the directory
Run:
```
sudo mkdir -p /etc/pet-shop
```
Confirm:
```
sudo ls -ld /etc/pet-shop
```
## Problem 2: Create the environment file
Open a new file:
```
sudo nano /etc/pet-shop/pet-shop.env
```
Paste:
```
SPRING_PROFILES_ACTIVE=prod
DB_HOST=pet-shop-mysql.cho2uq2auqbz.ap-southeast-1.rds.amazonaws.com
DB_PORT=3306
DB_NAME=pet_shop
DB_USERNAME=pet_shop_app
DB_PASSWORD=Lamthaiyennhi2005
DB_MIGRATION_USERNAME=pet_shop_migration
DB_MIGRATION_PASSWORD=Lamthaiyennhi2005
SERVER_ADDRESS=127.0.0.1
SERVER_PORT=8080
```
Replace these values with your real values:
```
YOUR_RDS_ENDPOINT
YOUR_APP_PASSWORD
YOUR_MIGRATION_PASSWORD
```
Save Nano:
```
Ctrl + O
Enter
Ctrl + X
```
## Problem 3: Protect the file
First check whether the `petshop` Linux user exists:
```
id petshop
```
If it exists, run:
```
sudo chown root:petshop /etc/pet-shop/pet-shop.env
sudo chmod 640 /etc/pet-shop/pet-shop.env
```
If `id petshop` says the user does not exist, create it:
```
sudo useradd \
  --system \
  --home /opt/pet-shop \
  --shell /usr/sbin/nologin \
  petshop
```
Then set permissions:
```
sudo chown root:petshop /etc/pet-shop/pet-shop.env
sudo chmod 640 /etc/pet-shop/pet-shop.env
```
## Problem 4: Verify the file
Run:
```
sudo ls -l /etc/pet-shop/pet-shop.env
```
Expected:
```
-rw-r----- 1 root petshop ... /etc/pet-shop/pet-shop.env
```
Check only the profile value:
```
sudo grep '^SPRING_PROFILES_ACTIVE=' /etc/pet-shop/pet-shop.env
```
Expected:
```
SPRING_PROFILES_ACTIVE=prod
```
Do not display the whole file in screenshots because it contains your database passwords.
## Problem 5: Restart only after the service exists
Check:
```
sudo systemctl cat pet-shop
```
If the service exists and contains:
```
EnvironmentFile=/etc/pet-shop/pet-shop.env
```
restart it:
```
sudo systemctl restart pet-shop
sudo systemctl status pet-shop --no-pager
```
If you get:
```
Unit pet-shop.service not found
```
then the environment file is ready, but you still need to create the `pet-shop.service` systemd file before restarting anything.