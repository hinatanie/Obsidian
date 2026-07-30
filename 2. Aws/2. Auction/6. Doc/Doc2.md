#### 1. The problem is when I commit and push my project to a Git repository, generated Python files such as `.pyc` files and `__pycache__` directories are included. These files are unnecessary because Python automatically regenerates them.
The solution is adding Python cache files to your project's `.gitignore`
```
# Python cache
__pycache__/
*.py.[cod]
*$py.class

# Virtual environment
.venv/
venv/

# Environment variables
.env
```

#### 2. The problem is that setting configuration requires database_url
When python imports this line 
`app/core/config.py`
```
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str


settings = Settings()
```
Pydantic immediately searches for the value. It finds nothing, so the entire application stops before FastAPI can start
The solution is providing the database connection URL through .env
```
DATABASE_URL=mysql+asyncmy://nhieecute:20051011@localhost:3306/auction_db
```
Or, if your MySQL Docker container is exposed on port 3307
```
DATABASE_URL=mysql+asyncmy://nhieecute:20051011@localhost:3306/auction_db
```
#### 3. The problem is that Pydantic may not know which .env file to read
Creating .env is not enough unless your Settings class is configured to load it 
The solution is updating `app/core/config.py`
```
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


settings = Settings()
```
Must have field case_sensitive=False. 
#### 4. The problem is that your database driver must match your SQLAlchemy setup
You appear to be using an asynchronous FastAPI database structure, so this URL is wrong
```
DATABASE_URL=mysql://user:password@localhost:3306/auction_db
```
Because you use
```
from sqlalchemy.ext.asyncio import create_async_engine
```
The solution is using an asynchronous MySQL driver
You have to install 
```
pip install asyncmy
```
Then use
```
DATABASE_URL=mysql+asyncmy://nhieecute:20051011@localhost:3306/auction_db
```
#### 5. The problem is that your MySQL port must match Docker
The solution is checking the container port mapping
```
docker ps
```
If you see
```
0.0.0.0:3307->3306/tcp
```
So that
```
Your computer port: 3307
Container MySQL port: 3306
```
#### 6. The problem is that your FastAPI backend currently runs only on your computer because it depends on your local Python installation, your .venv, locally installed packages, your local MySQL configuration
The solution is using Docker to package the backend and database into predictable containers so the project runs the same way on another machine.
For your Live Auction project, we need two containers
```
FastAPI container
    +
MySQL container
```
They will communicate through a Docker network
#### 7. The problem is that Docker needs instructions for building FastAPI backend
Docker does not automatically know
- which python version to use
- where your source code is
- which packages to install
- which command starts FastAPI
The solution is creating a Dockerfile inside your backend folder
```
Live-Auction/
├── backend/
│   ├── app/
│   ├── modules/
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── .dockerignore
│   └── .env
└── docker-compose.yml
```
`backend/Dockerfile`
```
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

```
So
```
Python image
    ↓
Docker creates /app
    ↓
requirements.txt is copied
    ↓
Dependencies are installed
    ↓
Backend source code is copied
    ↓
Uvicorn starts FastAPI
```
The important part is:
```
--host 0.0.0.0
```
Inside Docker, using:
```
127.0.0.1
```
would make FastAPI accessible only from inside the container.
Using:
```
0.0.0.0
```
allows Docker to expose it to your Windows machine.

#### 8. The problem is that Docker should not copy unnecessary or private files
Without exclutions, Docker may copy 
- .venv
- .env
- Python cache files
- Git files
- IDE configuration
The solution is creating `backend/.dockerignore`
add
```
.venv
__pycache__
*.pyc
*.pyo
*.pyd
.env
.git
.gitignore
.idea
.vscode
.pytest_cache
.mypy_cache
```
#### 9. The problem is that FastAPI needs a database container
Your backend needs MySQL
Running only the FastAPI container would cause the applicatino to fail when it tries to connect to a database that does not exist inside Docker
The solution is creating a docker-compose.yaml file in the project root
```
services:
  mysql:
    image: mysql:8.0
    container_name: auction-mysql
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: Asdf1234!
      MYSQL_DATABASE: auction_db
      MYSQL_USER: nhieecute
      MYSQL_PASSWORD: "20051011"
    ports:
      - "3307:3306"
    volumes:
      - auction_mysql_data:/var/lib/mysql
    healthcheck:
      test:
        [
          "CMD",
          "mysqladmin",
          "ping",
          "-h",
          "localhost",
          "-u",
          "root",
          "-pAsdf1234!"
        ]
      interval: 10s
      timeout: 5s
      retries: 10

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: auction-backend
    restart: unless-stopped
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: mysql+asyncmy://nhieecute:20051011@mysql:3306/auction_db
    depends_on:
      mysql:
        condition: service_healthy

volumes:
  auction_mysql_data:
```
#### 10. The problem is that the database host changes inside Docker
When FastAPI runs directly on Windows, it connects to MySQL through 
```
DATABASE_URL=mysql+asyncmy://nhieecute:20051011@localhost:3307/auction_db
```
But inside Docker, localhost means 
```
the FastAPI container itself
```
The solution is using the compose service name as the database hostname `mysql`
Therefore the Docker database URL is
```
DATABASE_URL=mysql+asyncmy://nhieecute:20051011@mysql:3306/auction_db
```
Notice the difference
```
DATABASE_URL=mysql+asyncmy://nhieecute:20051011@localhost:3307/auction_db
```
and
```
DATABASE_URL=mysql+asyncmy://nhieecute:20051011@mysql:3306/auction_db
```
Port `3307` is used by your Windows host.
Port `3306` is used between containers.

#### 11. The problem is that FastAPI may start before MySQL is ready
depends_on can control startup order, but merely startign MySQL does not mean it is ready to accept connections 
The solution is using a MySQL health check
```
healthcheck:
  test:
    [
      "CMD",
      "mysqladmin",
      "ping",
      "-h",
      "localhost",
      "-u",
      "root",
      "-pAsdf1234!"
    ]
  interval: 10s
  timeout: 5s
  retries: 10
```
Now Docker waits until MySQL responds before starting the backend
#### 12. The problem is the backend container needs all dependencies in requirements.txt
Your Dockerfile installs only what appears in `requirements.txt`
The solution is you can generate the file from your active virtual env
```
python -m pip freeze > requirements.txt
```
#### 13. The problem is your settings must accept Docker env
Your compose file passes env, but when run locally must use your .env
```
environment:
  DATABASE_URL: mysql+asyncmy://nhieecute:20051011@mysql:3306/auction_db
```
The solution is that updating 
```
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    database_url: str

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


settings = Settings()
```
#### 14. The problem is that the Docker image and containers must be created
Writing the files does not create the image or start the containers
The solution is that from the project root, build and start 
```
docker compose up --build -d
```
Docker will
```
Download MySQL image
    ↓
Build FastAPI image
    ↓
Create Docker network
    ↓
Create MySQL container
    ↓
Create backend container
    ↓
Start both services
```
Open 
```
http://localhost:8000/docs
```
#### 15. The problem is that you need to inspect container status and errors
A container may be created but immediately stop due to
- missing Python packages
- invalid database URL
- import errors
- database connection errors
The solution is checking running containers
```
docker compose ps
```
View all logs
```
docker compose logs
```
Or just view backend logs
```
docker compose logs backend
```
Or follow backend logs continuously
```
docker compose logs -f backend
```
#### 16. The problem is that code chages need to appear inside the container
With the current Dockerfile, source code is copied during image building
This means after changing Python code, you need to rebuild
```
docker compose up --build
```
That is acceptable for production-like execution but inconvenient during development
The solution is that for development, mount your backend folder into the container and enable reload
Updating the backend service
```
backend:
  build:
    context: ./backend
    dockerfile: Dockerfile
  container_name: auction-backend
  restart: unless-stopped
  ports:
    - "8000:8000"
  environment:
    DATABASE_URL: mysql+asyncmy://nhieecute:20051011@mysql:3306/auction_db
  volumes:
    - ./backend:/app
  command:
    [
      "python",
      "-m",
      "uvicorn",
      "app.main:app",
      "--host",
      "0.0.0.0",
      "--port",
      "8000",
      "--reload"
    ]
  depends_on:
    mysql:
      condition: service_healthy
```
For development, this is very useful
For production, avoid --reload

#### 17. The problem is that you want to start docker compose 
```
docker compose up -d
```
#### 18. The problem is that you want to build again after dependency changes
```
docker compose up --build -d
```
#### 19. The problem is that you want to stop containers
```
docker compose down 
```
#### 20. The problem is that you want to stop and delete MySQL volume
```
docker compose down -v
```

#### 21. The problem is that you want to enter the backend container 
```
docker compose exec backend sh
```
#### 22. The problem is that you want to enter MySQL
```
docker compose exec mysql mysql -u root -p
```
then enter
```
Asdf1234!
```

#### 23. The problem is that existing Docker containers do not automatically update
Changing .env does not always change containers that already exists
The solution is running from the project root
```
docker compose down
docker compose up --build -d
```

#### 24. The problem is that existing MySQL data may keep the old username or password
MySQL env such as 
```
MYSQL_USER
MYSQL_PASSWORD
MYSQL_DATABASE
```
are mainly applied during the first initialization of the MySQL data directory
If the volume already contains a database, changing .env may not recreate the database user or change its password
The solution is that if you changed the initial MySQL username, password, or database name and you do not need old data
```
docker compose down -v
docker compose up -d --build
```
If you changed container names or ports, keep the volumn
```
docker compose down
docker compose up -d --build
```

#### 25. The problem is to verify that compose actually reads the variables
The solution is to use
```
docker compose config
```

#### 26. The problem is that Docker Compose can not start your MySQL service because a different container already owns the name `auction-mysql`
The solution is removing the container or rename the compose container
```
docker rm auction-mysql
```

#### 27. The problem is that docker compose down only manages containers belonging to this compose project
The solution is using 
```
docker rm auction-mysql
```
instead of
```
docker compose down -v
```

#### 28. The problem is running uvicorn manually while Docker backend is running
Do not run both at the same time on port 8000
```
python -m uvicorn app.main:app --reload
```
and 
```
docker compose up -d
```
Because both may try to use port 8000
#### 29. The problem is that Installing a package in your local .venv does not install inside Docker
Your backend image installs packages only from `backend/requirements.txt`
The solution is add new package to requirements.txt

#### 30. The problem is that Docker cached the old dependency-installation layer
The solution is using a clean rebuild ensures the o    ld layer is not reused
