#### 1. What files are unnecessarily added to the Git repository?
Generated Python files such as `.pyc` files and `__pycache__` directories may be included when you commit and push the project.
#### Why are Python cache files unnecessary in Git?
Python automatically regenerates these cache files when the application runs.
#### How can you prevent Python cache files from being committed?
Add the Python cache patterns to your project's `.gitignore`.
```gitignore
# Python cache
__pycache__/
*.py.[cod]
*$py.class
```
#### How can you exclude virtual environments from Git?
Add the virtual environment directories to `.gitignore`.
```gitignore
# Virtual environment
.venv/
venv/
```
#### How can you exclude environment variables from Git?
Add `.env` to `.gitignore`.
```gitignore
# Environment variables
.env
```

---
#### 2. Why can importing `app/core/config.py` stop the application?
The `Settings` class requires a value for `database_url`.
```python
from pydantic_settings import BaseSettings
class Settings(BaseSettings):
    database_url: str
settings = Settings()
```
#### When does Pydantic search for `database_url`?
Pydantic searches for the value immediately when Python creates `Settings()`.
#### What happens when Pydantic cannot find `database_url`?
The application stops before FastAPI can start.
#### How can you provide the required database URL?
Add `DATABASE_URL` to the `.env` file.
```env
DATABASE_URL=mysql+asyncmy://nhieecute:20051011@localhost:3306/auction_db
```
#### What database URL was given for a MySQL Docker container exposed on port `3307`?
The lesson note provides this value:
```env
DATABASE_URL=mysql+asyncmy://nhieecute:20051011@localhost:3306/auction_db
```

---
#### 3. Why might Pydantic ignore the `.env` file?
Creating `.env` is not enough unless the `Settings` class is configured to load it.
#### How do you configure Pydantic to read `.env`?
Update `app/core/config.py` to use `SettingsConfigDict`.
```python
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
#### What does `env_file=".env"` do?
It tells Pydantic to load configuration values from the `.env` file.
#### What does `env_file_encoding="utf-8"` do?
It tells Pydantic to read the `.env` file using `UTF-8` encoding.
#### What value must `case_sensitive` have?
It must be set to `False`.
```python
case_sensitive=False
```

---
#### 4. Why must the database driver match the SQLAlchemy setup?
An asynchronous SQLAlchemy engine requires an asynchronous database driver.
#### Which database URL is wrong for this asynchronous setup?
This URL does not specify an asynchronous MySQL driver:
```env
DATABASE_URL=mysql://user:password@localhost:3306/auction_db
```
#### Which SQLAlchemy import shows that the application is asynchronous?
The application uses `create_async_engine` from SQLAlchemy's asynchronous module.
```python
from sqlalchemy.ext.asyncio import create_async_engine
```
#### Which asynchronous MySQL driver should you install?
Install `asyncmy`.
```bash
pip install asyncmy
```
#### Which database URL uses the `asyncmy` driver?
Use `mysql+asyncmy` in the database URL.
```env
DATABASE_URL=mysql+asyncmy://nhieecute:20051011@localhost:3306/auction_db
```

---
#### 5. Why must the MySQL port match Docker?
The application must connect through the host port that Docker maps to the MySQL container.
#### How can you check the Docker container port mapping?
Run:
```bash
docker ps
```
#### What does this Docker port mapping mean?
```text
0.0.0.0:3307->3306/tcp
```
It means port `3307` on your computer connects to port `3306` inside the MySQL container.
```text
Your computer port: 3307
Container MySQL port: 3306
```

---
#### 6. Why does the FastAPI backend currently run only on your computer?
It depends on resources installed and configured locally, including:
- your local Python installation
- your `.venv`
- locally installed packages
- your local MySQL configuration
#### How does Docker make the project more portable?
Docker packages the backend and database into predictable containers, so the project runs the same way on another machine.
#### How many containers does the Live Auction project need?
It needs two containers:
```text
FastAPI container
    +
MySQL container
```
#### How will the FastAPI and MySQL containers communicate?
They will communicate through a Docker network.

---
#### 7. Why does the FastAPI backend need a Dockerfile?
Docker needs instructions for building and starting the backend.
#### What information does Docker need?
Docker does not automatically know:
- which Python version to use
- where your source code is
- which packages to install
- which command starts FastAPI
#### Where should the Dockerfile be created?
Create it inside the `backend` folder.
```text
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
#### What should `backend/Dockerfile` contain?
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```
#### Which Python image does the Dockerfile use?
It uses the slim Python `3.11` image.
```dockerfile
FROM python:3.11-slim
```
#### What working directory does Docker create?
Docker uses `/app` as the working directory.
```dockerfile
WORKDIR /app
```
#### Why is `requirements.txt` copied before the source code?
It is copied so Docker can install the project's dependencies.
```dockerfile
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
```
#### How is the backend source code copied?
The following instruction copies the backend files into the container:
```dockerfile
COPY . .
```
#### Which port does the FastAPI container expose?
It exposes port `8000`.
```dockerfile
EXPOSE 8000
```
#### Which command starts FastAPI?
Docker starts FastAPI through Uvicorn.
```dockerfile
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```
#### What is the Docker build and startup process?
```text
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
#### Why is `--host 0.0.0.0` important?
It allows Docker to expose FastAPI to your Windows machine.
```text
--host 0.0.0.0
```
#### What happens when FastAPI uses `127.0.0.1` inside Docker?
FastAPI is accessible only from inside the container.
```text
127.0.0.1
```
#### What happens when FastAPI uses `0.0.0.0` inside Docker?
Docker can expose FastAPI outside the container.
```text
0.0.0.0
```

---
#### 8. Why should Docker avoid copying unnecessary or private files?
Without exclusions, Docker may copy files that are private or not needed in the image.
#### Which files might Docker copy unnecessarily?
Docker may copy:
- `.venv`
- `.env`
- Python cache files
- Git files
- IDE configuration
#### How can you prevent Docker from copying these files?
Create `backend/.dockerignore`.
#### What should `backend/.dockerignore` contain?
```dockerignore
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
##### 9. Why does FastAPI need a database container?
The backend needs MySQL to store and retrieve data.
##### What happens if only the FastAPI container runs?
The application fails when it tries to connect to a database that does not exist inside Docker.
##### How can you run FastAPI and MySQL together?
Create `docker-compose.yaml` in the project root.
```yaml
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
##### Which MySQL image does Docker Compose use?
It uses MySQL version `8.0`.
```yaml
image: mysql:8.0
```
##### What is the MySQL container called?
The container name is `auction-mysql`.
```yaml
container_name: auction-mysql
```
##### When does the MySQL container restart?
It restarts unless it is manually stopped.
```yaml
restart: unless-stopped
```
##### Which MySQL database is created?
Docker creates a database named `auction_db`.
```yaml
MYSQL_DATABASE: auction_db
```
##### Which MySQL user is created?
Docker creates the user `nhieecute`.
```yaml
MYSQL_USER: nhieecute
```
##### How are the MySQL ports mapped?
Port `3307` on the host maps to port `3306` in the MySQL container.
```yaml
ports:
  - "3307:3306"
```
##### Why is a MySQL volume used?
The volume stores MySQL data outside the container.
```yaml
volumes:
  - auction_mysql_data:/var/lib/mysql
```
##### How is the backend image built?
Docker uses the `Dockerfile` inside the `backend` directory.
```yaml
build:
  context: ./backend
  dockerfile: Dockerfile
```
##### What is the backend container called?
The container name is `auction-backend`.
```yaml
container_name: auction-backend
```
##### How is the backend port mapped?
Port `8000` on the host maps to port `8000` in the backend container.
```yaml
ports:
  - "8000:8000"
```
##### Which database URL does the backend container receive?
Docker Compose passes the database URL through the `environment` section.
```yaml
environment:
  DATABASE_URL: mysql+asyncmy://nhieecute:20051011@mysql:3306/auction_db
```
##### When does the backend container start?
It starts after the MySQL service becomes healthy.
```yaml
depends_on:
  mysql:
    condition: service_healthy
```
##### Which named volume is defined?
The Compose file defines `auction_mysql_data`.
```yaml
volumes:
  auction_mysql_data:
```