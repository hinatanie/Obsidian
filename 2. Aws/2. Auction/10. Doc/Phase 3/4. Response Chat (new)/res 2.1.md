Choose **Full configuration**.
You need full control over the RDS settings for your Pet Shop architecture, including:
```
Engine: MySQL
Deployment: Single-AZ
VPC: pet-shop-vpc
DB subnet group: pet-shop-db-subnet-group
Public access: No
Security group: pet-shop-rds-sg
Initial database name: pet_shop
Backups and storage settings
```
**Express configuration** automatically chooses many settings and may not let you select your existing private subnet group and security group exactly as planned. AWS recommends the full/standard configuration path when you need to configure networking, security, backups, availability, and maintenance yourself.
Do not choose **Restore from S3**. That option is for restoring a database from an existing S3 backup, which you are not doing.
So click:
```
Create database
→ Full configuration
```