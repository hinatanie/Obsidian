I revised the original Phase 3 document from **Spring Boot on EC2** to a **FastAPI architecture using EC2 and AWS Lambda**. The original document’s RDS preparation, private networking, database testing, credentials, and backup requirements remain relevant.
I am PetShophis practical division:
```
EC2:
- Runs the main FastAPI application
- Handles normal REST APIs
- Can support WebSockets or long-running requests
- Connects to RDS
Lambda:
- Runs short background jobs
- Processes notifications, images, scheduled jobs, or queue messages
- Connects to RDS only when necessary
```
# Main Problem
Your FastAPI PetShop application needs a secure AWS database that both the EC2 backend and selected Lambda functions can access.
The target architecture is:
```
Users
  |
  v
EC2 FastAPI backend
  |
  v
Amazon RDS MySQL
Background event
  |
  v
AWS Lambda
  |
  v
Amazon RDS MySQL
```
A more complete version is:
```
                         ┌─────────────────────┐
Users ── HTTP/HTTPS ──>  │ EC2 FastAPI backend │
                         └──────────┬──────────┘
                                    │
                                    │ MySQL 3306
                                    v
                         ┌─────────────────────┐
                         │ Amazon RDS MySQL    │
                         │ Private subnets     │
                         └──────────▲──────────┘
                                    │
                                    │ MySQL 3306
                         ┌──────────┴──────────┐
Events / SQS / Schedule ─> AWS Lambda          │
                         └─────────────────────┘
```
Complete the following tasks in order.

---
# Task 1: Decide What EC2 and Lambda Will Do
Do not deploy the same complete FastAPI application to EC2 and Lambda without a clear reason.
Use EC2 for the main backend:
```
User registration
User login
Viewing PetShops
Creating PetShops
Placing bids
Wallet operations
WebSocket or real-time connections
Long-running API requests
```
Use Lambda for short background work:
```
Sending email notifications
Processing uploaded images
Closing expired PetShops
Generating reports
Processing SQS messages
Running scheduled cleanup jobs
Sending winner notifications
```
Checklist:
```
[ ] Use EC2 for the main FastAPI API
[ ] Use Lambda for short background tasks
[ ] Do not run WebSocket connections inside normal Lambda functions
[ ] Do not move every FastAPI endpoint to Lambda yet
```

---
# Task 2: Confirm the Phase 2 Network Resources
Before creating RDS, confirm that these resources exist:
```
PetShop-vpc
PetShop-public-subnet-1
- Used by the EC2 FastAPI server
PetShop-private-subnet-1
- Used by RDS
- Can also be selected for Lambda
PetShop-private-subnet-2
- Used by RDS
- Can also be selected for Lambda
PetShop-db-subnet-group
PetShop-backend-sg
PetShop-rds-sg
```
You will also create:
```
PetShop-lambda-sg
```
Checklist:
```
[ ] Confirm PetShop-vpc exists
[ ] Confirm the public EC2 subnet exists
[ ] Confirm private subnet 1 exists
[ ] Confirm private subnet 2 exists
[ ] Confirm the private subnets use different Availability Zones
[ ] Confirm PetShop-db-subnet-group exists
[ ] Confirm PetShop-backend-sg exists
[ ] Confirm PetShop-rds-sg exists
```
The RDS DB subnet group must cover subnets in at least two Availability Zones.

---
# Task 3: Create a Security Group for Lambda
Create a separate security group for Lambda.
```
Name: PetShop-lambda-sg
Description: Security group for PetShop Lambda functions
VPC: PetShop-vpc
```
Lambda does not need an inbound rule for normal outbound database connections.
Recommended configuration:
```
Inbound rules:
- None
Outbound rules:
- Keep the default outbound rule while learning
```
Checklist:
```
[ ] Open the VPC Console
[ ] Open Security groups
[ ] Create PetShop-lambda-sg
[ ] Select PetShop-vpc
[ ] Do not add public inbound rules
[ ] Keep default outbound access for now
```

---
# Task 4: Update the RDS Security Group
The database must accept MySQL connections from both:
```
EC2 FastAPI
Lambda background functions
```
Open:
```
PetShop-rds-sg
```
Add these inbound rules:
```
Rule 1:
Type: MySQL/Aurora
Port: 3306
Source: PetShop-backend-sg
```
```
Rule 2:
Type: MySQL/Aurora
Port: 3306
Source: PetShop-lambda-sg
```
Do not add:
```
MySQL 3306 from 0.0.0.0/0
```
That would expose the database to the public internet.
Checklist:
```
[ ] Allow port 3306 from PetShop-backend-sg
[ ] Allow port 3306 from PetShop-lambda-sg
[ ] Do not allow port 3306 from 0.0.0.0/0
[ ] Do not allow port 3306 directly from your laptop IP
```

---
# Task 5: Check the RDS DB Subnet Group
Open the RDS Console and confirm this subnet group exists:
```
Name: PetShop-db-subnet-group
VPC: PetShop-vpc
Subnets:
- PetShop-private-subnet-1
- PetShop-private-subnet-2
```
The two subnets must be in different Availability Zones.
Example:
```
PetShop-private-subnet-1
Availability Zone: ap-southeast-1a
PetShop-private-subnet-2
Availability Zone: ap-southeast-1b
```
Checklist:
```
[ ] Open the RDS Console
[ ] Open Subnet groups
[ ] Find PetShop-db-subnet-group
[ ] Confirm it uses PetShop-vpc
[ ] Confirm private subnet 1 is selected
[ ] Confirm private subnet 2 is selected
[ ] Confirm the subnets are in different Availability Zones
```
Create the DB subnet group now if it does not exist.

---
# Task 6: Create the RDS MySQL Database
Open:
```
AWS Console
→ RDS
→ Databases
→ Create database
```
Use:
```
Database creation method: Standard create
Engine: MySQL
Template: Free tier, if available, or Dev/Test
```
Database settings:
```
DB instance identifier: PetShop-mysql
Master username: PetShop_admin
Master password: Use a strong password
```
Instance settings:
```
DB instance class: Smallest suitable learning instance
Storage: 20 GiB
Storage autoscaling: Optional
```
Connectivity settings:
```
VPC: PetShop-vpc
DB subnet group: PetShop-db-subnet-group
Public access: No
VPC security group: PetShop-rds-sg
Port: 3306
```
Additional configuration:
```
Initial database name: PetShop_db
Backup retention: 1–7 days
Deletion protection: Optional while learning
```
Checklist:
```
[ ] Select Standard create
[ ] Select MySQL
[ ] Select the Free tier or Dev/Test template
[ ] Set DB identifier to PetShop-mysql
[ ] Set master username to PetShop_admin
[ ] Create a strong master password
[ ] Store the master password securely
[ ] Select PetShop-vpc
[ ] Select PetShop-db-subnet-group
[ ] Set Public access to No
[ ] Select PetShop-rds-sg
[ ] Set the initial database name to PetShop_db
[ ] Configure backup retention
[ ] Create the database
```

---
# Task 7: Save the RDS Connection Information
After the database becomes available, record:
```
RDS endpoint
Port
Database name
Master username
Master password
```
Example:
```
Endpoint:
PetShop-mysql.xxxxxx.ap-southeast-1.rds.amazonaws.com
Port:
3306
Database:
PetShop_db
Username:
PetShop_admin
```
Do not include the password in:
```
GitHub
README files
Python source code
Dockerfile
Committed .env files
```
Checklist:
```
[ ] Copy the RDS endpoint
[ ] Confirm the port is 3306
[ ] Confirm the database name is PetShop_db
[ ] Save the username in your password manager
[ ] Save the password in your password manager
```

---
# Task 8: Confirm the EC2 Security Group
Your EC2 instance must use:
```
PetShop-backend-sg
```
Recommended inbound rules:
```
HTTP 80 from 0.0.0.0/0
HTTPS 443 from 0.0.0.0/0
SSH 22 from your IP only
```
For temporary FastAPI testing:
```
Custom TCP 8000 from your IP only
```
Do not keep this rule publicly open:
```
Port 8000 from 0.0.0.0/0
```
Checklist:
```
[ ] Confirm EC2 uses PetShop-backend-sg
[ ] Allow SSH only from your IP
[ ] Allow HTTP port 80
[ ] Allow HTTPS port 443 when HTTPS is configured
[ ] Keep FastAPI port 8000 private or restricted
```

---
# Task 9: Test EC2-to-RDS Network Access
SSH into your EC2 instance.
Install the MySQL client.
For Ubuntu:
```
sudo apt update
sudo apt install mysql-client -y
```
Connect to RDS:
```
mysql \
  -h your-rds-endpoint \
  -P 3306 \
  -u PetShop_admin \
  -p
```
After entering the password:
```
SHOW DATABASES;
USE PetShop_db;
SHOW TABLES;
```
Checklist:
```
[ ] SSH into EC2
[ ] Install mysql-client
[ ] Connect to the RDS endpoint
[ ] Open PetShop_db
[ ] Run SHOW TABLES
```
If the connection fails, check:
```
[ ] EC2 uses PetShop-backend-sg
[ ] PetShop-rds-sg allows 3306 from PetShop-backend-sg
[ ] EC2 and RDS use PetShop-vpc
[ ] The RDS status is Available
[ ] The endpoint is correct
[ ] The database port is 3306
```

---
# Task 10: Create a Database User for FastAPI
Do not use the RDS master user for the application permanently.
Connect using the master user and create:
```
CREATE USER 'PetShop_app'@'%'
IDENTIFIED BY 'your-strong-application-password';
```
Grant application permissions:
```
GRANT SELECT,
      INSERT,
      UPDATE,
      DELETE,
      CREATE,
      ALTER,
      INDEX,
      REFERENCES
ON PetShop_db.*
TO 'PetShop_app'@'%';
```
Apply the changes:
```
FLUSH PRIVILEGES;
```
Checklist:
```
[ ] Create PetShop_app
[ ] Create a separate strong password
[ ] Grant access only to PetShop_db
[ ] Do not use PetShop_admin in the FastAPI application
[ ] Store the PetShop_app password securely
```
Later, when Alembic manages migrations separately, you can reduce the normal application user's schema-changing permissions.

---
# Task 11: Configure FastAPI on EC2
Create an environment file on EC2.
Example:
```
APP_ENV=production
DB_HOST=PetShop-mysql.xxxxxx.ap-southeast-1.rds.amazonaws.com
DB_PORT=3306
DB_NAME=PetShop_db
DB_USERNAME=PetShop_app
DB_PASSWORD=your-strong-application-password
DATABASE_URL=mysql+asyncmy://PetShop_app:your-strong-application-password@PetShop-mysql.xxxxxx.ap-southeast-1.rds.amazonaws.com:3306/PetShop_db
```
Your FastAPI configuration can read:
```
import os
DATABASE_URL = os.environ["DATABASE_URL"]
```
Do not hard-code:
```
DATABASE_URL = "mysql://username:password@..."
```
Checklist:
```
[ ] Create the production environment file on EC2
[ ] Add DB_HOST
[ ] Add DB_PORT
[ ] Add DB_NAME
[ ] Add DB_USERNAME
[ ] Add DB_PASSWORD
[ ] Add DATABASE_URL
[ ] Exclude .env from Git
```

---
# Task 12: Install the FastAPI Database Packages
Choose the database approach your project uses.
For synchronous SQLAlchemy with PyMySQL:
```
pip install sqlalchemy pymysql
```
Example URL:
```
mysql+pymysql://PetShop_app:password@endpoint:3306/PetShop_db
```
For asynchronous SQLAlchemy:
```
pip install sqlalchemy asyncmy
```
Example URL:
```
mysql+asyncmy://PetShop_app:password@endpoint:3306/PetShop_db
```
For migrations:
```
pip install alembic
```
Checklist:
```
[ ] Choose synchronous or asynchronous SQLAlchemy
[ ] Install the selected MySQL driver
[ ] Install Alembic
[ ] Add dependencies to requirements.txt or pyproject.toml
```

---
# Task 13: Create the FastAPI Database Connection
Example asynchronous SQLAlchemy setup:
```
from collections.abc import AsyncGenerator
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from app.config import settings
engine = create_async_engine(
    settings.database_url,
    pool_pre_ping=True,
)
SessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
```
Checklist:
```
[ ] Create the SQLAlchemy engine
[ ] Create the session factory
[ ] Create the get_db dependency
[ ] Use pool_pre_ping
[ ] Roll back the session when an error occurs
```

---
# Task 14: Create Database Tables with Alembic
Use Alembic rather than creating tables manually in production.
Initialize Alembic:
```
alembic init migrations
```
Configure Alembic to read the database URL from an environment variable.
Create the first migration:
```
alembic revision --autogenerate -m "create initial tables"
```
Apply it:
```
alembic upgrade head
```
Expected tables may include:
```
users
wallets
PetShop_items
PetShop_images
bids
transactions
payments
notifications
```
Checklist:
```
[ ] Initialize Alembic
[ ] Configure the SQLAlchemy metadata
[ ] Configure the RDS database URL
[ ] Generate the initial migration
[ ] Review the generated SQL
[ ] Run alembic upgrade head
[ ] Confirm the tables exist in RDS
```

---
# Task 15: Test FastAPI on EC2
Start the application:
```
uvicorn app.main:app \
  --host 0.0.0.0 \
  --port 8000
```
Test the health endpoint:
```
curl http://localhost:8000/api/health
```
Then test:
```
[ ] POST /api/auth/register
[ ] POST /api/auth/login
[ ] GET /api/users/me
[ ] POST /api/PetShops
[ ] GET /api/PetShops
[ ] POST /api/PetShops/{id}/bids
```
Check the database:
```
USE PetShop_db;
SELECT * FROM users;
SELECT * FROM wallets;
SELECT * FROM PetShop_items;
SELECT * FROM bids;
```
Expected results:
```
Register user:
- One users record
- One wallets record
Create PetShop:
- One PetShop_items record
Place bid:
- One bids record
- PetShop_items.current_price is updated
```
Checklist:
```
[ ] Start FastAPI
[ ] Confirm FastAPI connects to RDS
[ ] Test the health endpoint
[ ] Test registration
[ ] Test login
[ ] Test PetShop creation
[ ] Test bidding
[ ] Confirm data appears in RDS
```

---
# Task 16: Run FastAPI as an EC2 Service
Create a systemd service.
Example:
```
[Unit]
Description=PetShop FastAPI Backend
After=network.target
[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/PetShop-backend
EnvironmentFile=/home/ubuntu/PetShop-backend/.env
ExecStart=/home/ubuntu/PetShop-backend/.venv/bin/gunicorn \
    -k uvicorn.workers.UvicornWorker \
    -w 2 \
    -b 127.0.0.1:8000 \
    app.main:app
Restart=always
[Install]
WantedBy=multi-user.target
```
Enable it:
```
sudo systemctl daemon-reload
sudo systemctl enable PetShop-backend
sudo systemctl start PetShop-backend
```
Check it:
```
sudo systemctl status PetShop-backend
journalctl -u PetShop-backend -f
```
Checklist:
```
[ ] Install Gunicorn
[ ] Create the systemd service
[ ] Load environment variables
[ ] Start FastAPI on 127.0.0.1:8000
[ ] Enable automatic restart
[ ] Check the service logs
```

---
# Task 17: Configure Nginx for FastAPI
Nginx receives public HTTP requests and forwards them to FastAPI.
Example:
```
server {
    listen 80;
    server_name your-domain-or-public-ip;
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
Checklist:
```
[ ] Install Nginx
[ ] Create the backend Nginx configuration
[ ] Proxy requests to 127.0.0.1:8000
[ ] Test the Nginx configuration
[ ] Restart Nginx
[ ] Test the API through port 80
```

---
# Task 18: Create the First Lambda Function
Begin with one simple background task.
A suitable first Lambda task is:
```
Send an PetShop-ended notification
```
Other options:
```
Process an uploaded image
Close expired PetShops
Send an email
Process an SQS message
Generate a report
```
Create:
```
Function name: PetShop-notification-worker
Runtime: Supported Python runtime
Execution role: Create a new role with basic Lambda permissions
```
Checklist:
```
[ ] Open the Lambda Console
[ ] Select Create function
[ ] Create PetShop-notification-worker
[ ] Select Python
[ ] Create or select an execution role
[ ] Deploy a simple test handler
[ ] Run a Lambda test event
```
Do not move the complete FastAPI backend to Lambda during this task.

---
# Task 19: Give Lambda Access to the VPC
Lambda must be connected to your VPC when it needs private access to RDS.
Configure:
```
VPC: PetShop-vpc
Subnets:
- PetShop-private-subnet-1
- PetShop-private-subnet-2
Security group:
- PetShop-lambda-sg
```
A VPC-connected Lambda function can access private resources such as RDS through the selected VPC subnets.
Checklist:
```
[ ] Open the Lambda function
[ ] Open Configuration
[ ] Open VPC
[ ] Select PetShop-vpc
[ ] Select both private subnets
[ ] Select PetShop-lambda-sg
[ ] Save the configuration
```
Do not select the public subnet because placing Lambda in a public subnet does not automatically give it a public IP address.

---
# Task 20: Give the Lambda Role VPC Permissions
A VPC-connected Lambda function needs permission to manage the network interfaces used for VPC connectivity.
Use the AWS-managed policy commonly provided for Lambda VPC access, or grant the required EC2 network-interface permissions through the execution role.
Checklist:
```
[ ] Open the Lambda execution role
[ ] Confirm it has basic CloudWatch Logs permissions
[ ] Confirm it has Lambda VPC access permissions
[ ] Do not give the Lambda role AdministratorAccess
```

---
# Task 21: Store Database Credentials for Lambda
Do not put the database password directly in the Lambda source code.
Preferred storage:
```
AWS Secrets Manager
```
Secret example:
```
{
  "host": "PetShop-mysql.xxxxxx.ap-southeast-1.rds.amazonaws.com",
  "port": 3306,
  "database": "PetShop_db",
  "username": "PetShop_app",
  "password": "strong-password"
}
```
Checklist:
```
[ ] Open Secrets Manager
[ ] Create an RDS application secret
[ ] Store host, port, database, username, and password
[ ] Give the Lambda execution role permission to read only this secret
[ ] Do not give the role access to every secret
```
For EC2, you may temporarily continue using a protected `.env` file while learning.

---
# Task 22: Test Lambda-to-RDS Connectivity
Create a simple Lambda test that:
```
1. Reads the database secret
2. Opens a database connection
3. Runs SELECT 1
4. Closes the connection
5. Returns success
```
Checklist:
```
[ ] Deploy the MySQL driver with the Lambda package or layer
[ ] Read the credentials from Secrets Manager
[ ] Connect to the RDS endpoint
[ ] Run SELECT 1
[ ] Close the connection
[ ] Check CloudWatch Logs
```
If the connection fails, check:
```
[ ] Lambda uses PetShop-vpc
[ ] Lambda uses the two private subnets
[ ] Lambda uses PetShop-lambda-sg
[ ] PetShop-rds-sg allows 3306 from PetShop-lambda-sg
[ ] Lambda has VPC network-interface permissions
[ ] The RDS endpoint and credentials are correct
```

---
# Task 23: Decide Whether Lambda Needs Internet Access
A Lambda function connected to your VPC does not automatically retain general internet access.
You need outbound internet access if Lambda must call:
```
External email APIs
Third-party payment APIs
External HTTP services
Public package or service endpoints during runtime
```
A VPC-connected Lambda normally needs a NAT Gateway for general outbound internet access from private subnets.
For the first phase:
```
If Lambda only connects to RDS:
- Do not create a NAT Gateway yet
If Lambda must call external APIs:
- Add a NAT Gateway later
- Or use appropriate VPC endpoints for supported AWS services
```
Checklist:
```
[ ] Identify whether Lambda calls external APIs
[ ] Do not create a NAT Gateway if Lambda only needs RDS
[ ] Add NAT only when outbound internet access is required
[ ] Remember that NAT Gateway creates additional cost
```

---
# Task 24: Consider RDS Proxy for Lambda
Lambda can create many short-lived database connections when several function instances run concurrently.
RDS Proxy can help manage and reuse database connections between Lambda and RDS. AWS provides a documented architecture where Lambda writes to RDS through RDS Proxy.
For the first learning version:
```
EC2 → RDS directly
Lambda → RDS directly
```
For a stronger architecture later:
```
EC2 → RDS or RDS Proxy
Lambda → RDS Proxy → RDS
```
Checklist:
```
[ ] Do not create RDS Proxy during the first connectivity test
[ ] First confirm Lambda can connect to RDS
[ ] Add RDS Proxy before increasing Lambda concurrency
[ ] Store credentials in Secrets Manager
[ ] Configure the proxy security groups carefully
```

---
# Task 25: Connect Events to Lambda
After the function works, choose what triggers it.
Possible triggers:
```
Amazon SQS:
- Process background jobs from FastAPI
EventBridge schedule:
- Close expired PetShops every few minutes
- Generate daily reports
S3 event:
- Process PetShop images after upload
API Gateway:
- Expose a separate serverless HTTP function
```
API Gateway can provide an HTTP endpoint that invokes a Lambda function.
Recommended first trigger:
```
FastAPI on EC2
   |
   | Send message
   v
Amazon SQS
   |
   | Trigger
   v
AWS Lambda
```
Checklist:
```
[ ] Choose one Lambda trigger
[ ] Prefer SQS for background jobs from FastAPI
[ ] Configure the trigger
[ ] Give FastAPI permission to send messages
[ ] Give Lambda permission to consume messages
[ ] Test one complete background job
```

---
# Task 26: Test the Complete EC2 and Lambda Workflow
Example workflow:
```
1. User places a bid through FastAPI on EC2
2. FastAPI writes the bid to RDS
3. FastAPI sends an SQS message
4. SQS invokes Lambda
5. Lambda reads the event
6. Lambda sends a notification
7. Lambda optionally writes notification status to RDS
```
Checklist:
```
[ ] Call the FastAPI endpoint
[ ] Confirm EC2 writes to RDS
[ ] Confirm FastAPI sends the event
[ ] Confirm Lambda receives the event
[ ] Confirm Lambda completes the job
[ ] Confirm Lambda logs appear in CloudWatch
[ ] Confirm any database update is successful
```

---
# Task 27: Configure RDS Backups
For the learning environment:
```
Automated backup retention: 1–7 days
```
Before important schema changes:
```
Create a manual RDS snapshot
```
Checklist:
```
[ ] Enable automated backups
[ ] Check the backup retention period
[ ] Create a manual snapshot before major migrations
[ ] Do not delete RDS without checking snapshots
[ ] Enable deletion protection for important environments
```

---
# Task 28: Add Monitoring
Monitor:
```
EC2:
- CPU
- Memory
- Disk
- FastAPI service logs
- Nginx logs
Lambda:
- Invocations
- Errors
- Duration
- Throttles
- CloudWatch Logs
RDS:
- CPU
- Connections
- Free storage
- Database errors
```
Checklist:
```
[ ] Check EC2 CloudWatch metrics
[ ] Check FastAPI systemd logs
[ ] Check Nginx logs
[ ] Check Lambda CloudWatch Logs
[ ] Check Lambda errors and duration
[ ] Check RDS database connections
[ ] Create budget alerts before increasing resources
```

---
# Tasks You Should Do Now
Complete these tasks first:
```
[ ] Task 1: Decide EC2 and Lambda responsibilities
[ ] Task 2: Confirm the Phase 2 VPC resources
[ ] Task 3: Create PetShop-lambda-sg
[ ] Task 4: Update PetShop-rds-sg
    - Allow 3306 from PetShop-backend-sg
    - Allow 3306 from PetShop-lambda-sg
[ ] Task 5: Check PetShop-db-subnet-group
[ ] Task 6: Create PetShop-mysql RDS
[ ] Task 7: Save the RDS connection information
[ ] Task 8: Confirm the EC2 security group
[ ] Task 9: Test EC2-to-RDS connectivity
[ ] Task 10: Create the PetShop_app database user
[ ] Task 11: Configure the FastAPI environment variables
[ ] Task 12: Install SQLAlchemy, the MySQL driver, and Alembic
[ ] Task 13: Create the FastAPI database connection
[ ] Task 14: Create database tables with Alembic
[ ] Task 15: Test FastAPI with RDS
[ ] Task 16: Run FastAPI using systemd
[ ] Task 17: Configure Nginx
[ ] Task 18: Create one Lambda background function
[ ] Task 19: Attach Lambda to PetShop-vpc
[ ] Task 20: Configure the Lambda execution role
[ ] Task 21: Store Lambda database credentials securely
[ ] Task 22: Test Lambda-to-RDS connectivity
[ ] Task 25: Add one trigger to Lambda
[ ] Task 26: Test the complete EC2–Lambda workflow
[ ] Task 27: Configure RDS backups
[ ] Task 28: Check monitoring and logs
```

---
# Tasks You Should Not Do Yet
```
[ ] Do not expose RDS publicly
[ ] Do not allow MySQL 3306 from 0.0.0.0/0
[ ] Do not use the RDS master user in FastAPI permanently
[ ] Do not store database passwords in GitHub
[ ] Do not deploy the entire FastAPI application to both EC2 and Lambda
[ ] Do not create a NAT Gateway unless Lambda needs outbound internet access
[ ] Do not create RDS Proxy until direct Lambda-to-RDS connectivity works
[ ] Do not give the Lambda execution role AdministratorAccess
```

---
# Recommended Execution Order
Follow this order:
```
1. Confirm the VPC and private subnets
2. Create PetShop-lambda-sg
3. Update PetShop-rds-sg
4. Confirm the DB subnet group
5. Create RDS MySQL
6. Test EC2-to-RDS connectivity
7. Create PetShop_app
8. Configure FastAPI database variables
9. Run Alembic migrations
10. Test FastAPI APIs
11. Run FastAPI through systemd and Nginx
12. Create one Lambda background worker
13. Attach Lambda to the private subnets
14. Configure Lambda permissions
15. Store credentials in Secrets Manager
16. Test Lambda-to-RDS connectivity
17. Add an SQS, EventBridge, S3, or API Gateway trigger
18. Test the complete workflow
19. Enable backups and monitoring
20. Add RDS Proxy later if Lambda usage increases
```

---
# Expected Result
After completing this phase:
```
FastAPI runs continuously on EC2
EC2 connects privately to RDS MySQL
Lambda runs selected background jobs
Lambda connects privately to RDS when required
RDS is not publicly accessible
Only PetShop-backend-sg and PetShop-lambda-sg can access port 3306
Database credentials are not stored in GitHub
Alembic manages database schema changes
CloudWatch contains EC2, Lambda, and RDS monitoring information
```
In simple terms:
```
EC2 is the main FastAPI server.
Lambda is the temporary background worker.
RDS is the private database shared securely by both.
```
The safest place to begin is **Task 1 through Task 5**. Do not create the RDS database until the two private subnets, DB subnet group, and security-group rules are correct.