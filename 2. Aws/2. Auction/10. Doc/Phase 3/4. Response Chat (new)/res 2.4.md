# Sent Message to ChatGPT
what is database name?
is database name is DB instance identifier : pet-shop-mysql
Host: the RDS endpoint
Port: 3306
Database: pet_shop
Username: pet_shop_admin
Password: your stored RDS password





No. They are two different names.
```
DB instance identifier: pet-shop-mysql
```
This is the AWS name of the RDS server resource.
```
Database name: pet_shop
```
This is the actual MySQL database inside that RDS server.
Think of it like this:
```
RDS server
Name in AWS: pet-shop-mysql
└── MySQL database: pet_shop
```
Your Spring Boot connection uses:
```
Host: the RDS endpoint
Port: 3306
Database: pet_shop
Username: pet_shop_admin
Password: your stored RDS password
```
Example:
```
jdbc:mysql://pet-shop-mysql.abc123.ap-southeast-1.rds.amazonaws.com:3306/pet_shop
```
In that URL:
```
pet-shop-mysql.abc123.ap-southeast-1.rds.amazonaws.com
```
is the host.
```
pet_shop
```
is the database name.
So enter:
```
DB instance identifier: pet-shop-mysql
Initial database name: pet_shop
```