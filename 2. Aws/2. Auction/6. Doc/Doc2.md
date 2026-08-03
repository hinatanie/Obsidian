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

---
##### 10. Why does the database hostname change inside Docker?
The meaning of `localhost` changes when FastAPI runs inside a container.
##### Which database URL is used when FastAPI runs directly on Windows?
FastAPI connects through `localhost` and the host port `3307`.
```env
DATABASE_URL=mysql+asyncmy://nhieecute:20051011@localhost:3307/auction_db
```
##### What does `localhost` mean inside the backend container?
It means the FastAPI container itself.
```text
the FastAPI container itself
```
##### Why can the backend container not use `localhost` for MySQL?
MySQL runs in a different container, not inside the FastAPI container.
##### Which hostname should FastAPI use inside Docker?
Use the Docker Compose service name `mysql`.
##### Which database URL is used inside Docker?
Use `mysql` as the hostname and `3306` as the port.
```env
DATABASE_URL=mysql+asyncmy://nhieecute:20051011@mysql:3306/auction_db
```
##### What is the difference between the local and Docker database URLs?
The local URL uses `localhost:3307`.
```env
DATABASE_URL=mysql+asyncmy://nhieecute:20051011@localhost:3307/auction_db
```
The Docker URL uses `mysql:3306`.
```env
DATABASE_URL=mysql+asyncmy://nhieecute:20051011@mysql:3306/auction_db
```
##### When is port `3307` used?
Port `3307` is used by the Windows host.
##### When is port `3306` used?
Port `3306` is used for communication between containers.

---
##### 11. Why might FastAPI start before MySQL is ready?
Starting the MySQL container does not mean MySQL is ready to accept connections.
##### What can `depends_on` control?
It can control the service startup order.
##### Why is `depends_on` alone not enough?
The MySQL process may still be initializing after its container starts.
##### How can Docker check whether MySQL is ready?
Add a MySQL health check.
```yaml
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
##### Which command checks MySQL health?
The health check uses `mysqladmin ping`.
```text
mysqladmin ping
```
##### How often does Docker run the health check?
Docker runs it every `10s`.
```yaml
interval: 10s
```
##### How long can each health check run?
Each check has a timeout of `5s`.
```yaml
timeout: 5s
```
##### How many times can the health check retry?
Docker retries up to `10` times.
```yaml
retries: 10
```
##### What happens after adding the health check?
Docker waits until MySQL responds before starting the backend.

---
##### 12. Why must all backend dependencies be in `requirements.txt`?
The Dockerfile installs only the packages listed in `requirements.txt`.
##### How can you generate `requirements.txt`?
Generate it from the active virtual environment.
```bash
python -m pip freeze > requirements.txt
```
##### What does `pip freeze` include?
It writes the installed packages from the active virtual environment into `requirements.txt`.

---
##### 13. Why must the settings support Docker environment variables?
Docker Compose passes `DATABASE_URL` directly to the backend container.
```yaml
environment:
  DATABASE_URL: mysql+asyncmy://nhieecute:20051011@mysql:3306/auction_db
```
##### How are settings loaded when the application runs locally?
The application loads the database URL from the local `.env` file.
##### How can the settings support both Docker and local execution?
Update the settings configuration to load `.env` from the backend base directory while still accepting environment variables.
```python
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
##### Why is `Path` imported?
It is used to build the path to the `.env` file.
```python
from pathlib import Path
```
##### How is the backend base directory found?
It is calculated from the location of the current configuration file.
```python
BASE_DIR = Path(__file__).resolve().parents[2]
```
##### How is the `.env` file path configured?
Pydantic loads `.env` from `BASE_DIR`.
```python
env_file=BASE_DIR / ".env"
```
##### What does `extra="ignore"` do?
It tells Pydantic to ignore extra settings that are not defined in the `Settings` class.
```python
extra="ignore"
```
##### Which setting remains required?
The `database_url` field remains required.
```python
database_url: str
```

---
##### 14. Why are Docker images and containers not created automatically?
Writing the Docker files does not build the image or start the containers.
##### How do you build and start the project?
Run the command from the project root.
```bash
docker compose up --build -d
```
##### What does `--build` do?
It tells Docker Compose to build the FastAPI image before starting the services.
##### What does `-d` do?
It starts the containers in detached mode.
##### What does Docker do after running the command?
```text
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
##### Which image does Docker download?
Docker downloads the MySQL image.
##### Which image does Docker build?
Docker builds the FastAPI image from the backend `Dockerfile`.
##### Why does Docker create a network?
The network allows the FastAPI and MySQL containers to communicate.
##### Where can you open the FastAPI documentation?
Open:
```text
http://localhost:8000/docs
```

---
##### 15. Why should you inspect container status and logs?
A container may be created and then stop immediately because of an error.
##### What can cause a container to stop?
Possible causes include:
- missing Python packages
- an invalid database URL
- import errors
- database connection errors
##### How can you check container status?
Run:
```bash
docker compose ps
```
##### How can you view logs from all services?
Run:
```bash
docker compose logs
```
##### How can you view only backend logs?
Run:
```bash
docker compose logs backend
```
##### How can you follow backend logs continuously?
Run:
```bash
docker compose logs -f backend
```
##### What does `-f` do in the logs command?
It follows the backend logs and displays new output continuously.


###### 16. Why do code changes not automatically appear inside the container?
The current Dockerfile copies the source code only when the image is built.
###### What must you do after changing Python code with the current Dockerfile?
You must rebuild the image.
```bash
docker compose up --build
```
###### When is rebuilding after every code change acceptable?
It is acceptable for production-like execution.
###### Why is rebuilding inconvenient during development?
Every Python code change requires another image build.
###### How can code changes appear immediately during development?
Mount the backend folder into the container and enable Uvicorn reload.
###### How should the backend service be updated for development?
```yaml
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
###### What does the backend volume mount do?
It mounts the local `./backend` folder into `/app` inside the container.
```yaml
volumes:
  - ./backend:/app
```
###### Why is `--reload` used during development?
It reloads the FastAPI application when the source code changes.
```text
--reload
```
###### Should `--reload` be used in production?
No. It is useful for development but should be avoided in production.

---
###### 17. How do you start Docker Compose services?
Run:
```bash
docker compose up -d
```
###### What does `-d` do?
It starts the containers in detached mode.

---
###### 18. How do you rebuild after changing dependencies?
Run:
```bash
docker compose up --build -d
```
###### Why is `--build` needed after dependency changes?
It rebuilds the backend image with the updated dependencies.

---
###### 19. How do you stop the containers?
Run:
```bash
docker compose down
```

---
###### 20. How do you stop containers and delete the MySQL volume?
Run:
```bash
docker compose down -v
```
###### What does `-v` remove?
It removes the Docker volumes used by the Compose project.

---
###### 21. How do you enter the backend container?
Run:
```bash
docker compose exec backend sh
```
###### Which shell does this command open?
It opens `sh` inside the running backend container.

---
###### 22. How do you open MySQL inside its container?
Run:
```bash
docker compose exec mysql mysql -u root -p
```
###### Which MySQL user does the command use?
It connects as the `root` user.
###### Which password should you enter?
Enter:
```text
Asdf1234!
```

---
###### 23. Why might changing `.env` not update existing containers?
Existing Docker containers do not always update automatically when `.env` changes.
###### How can you recreate the containers after changing `.env`?
Run these commands from the project root:
```bash
docker compose down
docker compose up --build -d
```

---
###### 24. Why might MySQL keep an old username or password?
MySQL initialization variables are mainly applied when the MySQL data directory is created for the first time.
###### Which MySQL variables are mainly applied during first initialization?
```text
MYSQL_USER
MYSQL_PASSWORD
MYSQL_DATABASE
```
###### What happens when the MySQL volume already contains a database?
Changing `.env` may not recreate the database user or update its password.
###### What should you do after changing the initial MySQL username, password, or database name?
Delete the volume and rebuild when the old data is not needed.
```bash
docker compose down -v
docker compose up -d --build
```
###### Why is the volume deleted in this case?
Deleting it allows MySQL to initialize a new data directory with the new values.
###### What should you do after changing only container names or ports?
Keep the volume and recreate the containers.
```bash
docker compose down
docker compose up -d --build
```

---
###### 25. How can you verify that Docker Compose reads the variables?
Run:
```bash
docker compose config
```
###### What does `docker compose config` help you inspect?
It shows the configuration that Docker Compose has read.

---
###### 26. Why might Docker Compose fail to start the MySQL service?
Another container may already use the name `auction-mysql`.
###### How can you remove the conflicting container?
Run:
```bash
docker rm auction-mysql
```
###### What is another way to solve the container-name conflict?
Rename the container in the Compose configuration.

---
###### 27. Why might `docker compose down` not remove `auction-mysql`?
`docker compose down` manages only containers that belong to the current Compose project.
###### Which command should you use for a container outside the Compose project?
Run:
```bash
docker rm auction-mysql
```
###### Which command may not remove that separate container?
```bash
docker compose down -v
```

---
###### 28. Why should you not run Uvicorn manually while the Docker backend is running?
Both processes may try to use port `8000`.
###### Which manual Uvicorn command may conflict with Docker?
```bash
python -m uvicorn app.main:app --reload
```
###### Which Docker command starts the backend container?
```bash
docker compose up -d
```
###### Can both commands use port `8000` at the same time?
No. Do not run both at the same time on port `8000`.

---
###### 29. Why is a package installed in the local `.venv` unavailable inside Docker?
Installing a package locally does not install it in the Docker image.
###### Where does the backend image get its packages?
It installs packages only from `backend/requirements.txt`.
###### How do you make a new package available inside Docker?
Add the package to `backend/requirements.txt`.

---
###### 30. Why might Docker continue using old dependencies?
Docker may reuse the cached dependency-installation layer.
###### How can you prevent Docker from reusing the old dependency layer?
Use a clean rebuild so the old layer is not reused.












**Topic:** Configure and containerize a FastAPI backend with asynchronous MySQL using Docker
##### **Goal 1: Keep generated and private files out of Git**
- Why this matters: A clean repository avoids committing regenerated files, local environments, and sensitive configuration.
- Process:
    1. Open or create `.gitignore` in the project root.
    2. Add Python cache patterns:
        ```gitignore
        __pycache__/
        *.py.[cod]
        *$py.class
        ```
    3. Add virtual-environment folders:
        ```gitignore
        .venv/
        venv/
        ```
    4. Add the environment file:
        ```gitignore
        .env
        ```
    5. Run `git status` and check whether any ignored files still appear.
- Practice task: Create a temporary `__pycache__` folder and `.env` file, then confirm that `git status` does not list them as new files.
- Done when: `.env`, virtual environments, and Python cache files no longer appear as untracked Git files.
##### **Goal 2: Identify why importing the settings module can stop the application**
- Why this matters: Configuration errors can prevent FastAPI from starting before any endpoint runs.
- Process:
    1. Open `app/core/config.py`.
    2. Locate the required setting:
        ```python
        class Settings(BaseSettings):
            database_url: str
        ```
    3. Find where the settings object is created:
        ```python
        settings = Settings()
        ```
    4. Temporarily run the module without defining `DATABASE_URL`.
    5. Read the validation error and identify the missing `database_url` field.
    6. Note that validation happens immediately when `Settings()` is created.
- Practice task: Explain in one sentence why the error occurs before FastAPI starts.
- Done when: You can point to `Settings()` and explain that it immediately validates the required database URL.
##### **Goal 3: Supply the database URL through an environment file**
- Why this matters: The application needs a database connection value without hard-coding it into Python source code.
- Before you start: Complete Goal 1 so that `.env` is excluded from Git.
- Process:
    1. Create `.env` in the backend project directory.
    2. Add a MySQL connection value:
        ```env
        DATABASE_URL=mysql+asyncmy://nhieecute:20051011@localhost:3306/auction_db
        ```
    3. Save the file.
    4. Confirm that the variable name is exactly `DATABASE_URL`.
    5. Run `git status` and verify that `.env` is ignored.
- Practice task: Change the database name temporarily, save the file, and identify which part of the URL represents the database name.
- Done when: The backend has a `.env` file containing a complete `DATABASE_URL`, and Git does not track it.
##### **Goal 4: Configure Pydantic to load values from `.env`**
- Why this matters: Creating `.env` alone does not make Pydantic read it.
- Before you start: You need `pydantic-settings` and the `.env` file from Goal 3.
- Process:
    1. Open `app/core/config.py`.
    2. Import `SettingsConfigDict`:
        ```python
        from pydantic_settings import BaseSettings, SettingsConfigDict
        ```
    3. Add the configuration inside `Settings`:
        ```python
        class Settings(BaseSettings):
            database_url: str
            model_config = SettingsConfigDict(
                env_file=".env",
                env_file_encoding="utf-8",
                case_sensitive=False,
            )
        ```
    4. Keep the settings instance:
        ```python
        settings = Settings()
        ```
    5. Run the module or start FastAPI.
    6. Confirm that the missing-field validation error is gone.
- Practice task: Print `settings.database_url` temporarily and verify that it matches the value in `.env`.
- Done when: `Settings()` loads `DATABASE_URL` successfully from `.env`.
##### **Goal 5: Match the database driver to SQLAlchemy’s asynchronous engine**
- Why this matters: `create_async_engine` requires an asynchronous database driver.
- Before you start: Find the database engine code and confirm that it imports `create_async_engine`.
- Process:
    1. Locate this import:
        ```python
        from sqlalchemy.ext.asyncio import create_async_engine
        ```
    2. Check the current database URL.
    3. Replace a synchronous prefix such as:
        ```env
        mysql://
        ```
        with:
        ```env
        mysql+asyncmy://
        ```
    4. Install the asynchronous driver:
        ```bash
        pip install asyncmy
        ```
    5. Add `asyncmy` to `requirements.txt` if it is not already present.
    6. Restart the application.
- Practice task: Compare `mysql://...` and `mysql+asyncmy://...`, then state which one matches `create_async_engine`.
- Done when: The project uses `create_async_engine`, has `asyncmy` installed, and the URL begins with `mysql+asyncmy://`.
##### **Goal 6: Verify the correct MySQL host port**
- Why this matters: The backend must use the host port that Docker maps to MySQL.
- Process:
    1. Start or locate the MySQL container.
    2. Run:
        ```bash
        docker ps
        ```
    3. Find the MySQL container’s port mapping.
    4. Interpret a mapping such as:
        ```text
        0.0.0.0:3307->3306/tcp
        ```
    5. Use port `3307` when the backend runs directly on your computer:
        ```env
        DATABASE_URL=mysql+asyncmy://nhieecute:20051011@localhost:3307/auction_db
        ```
    6. Restart the backend and test the connection.
- Practice task: Write down the host port and container port from the `docker ps` output.
- Done when: Your locally running backend uses the host-side port shown before `->` in Docker’s port mapping.
##### **Goal 7: Describe the two-container architecture**
- Why this matters: Containerization becomes easier when you know which responsibilities belong to each service.
- Process:
    1. Draw two boxes labeled `FastAPI` and `MySQL`.
    2. Write the FastAPI responsibility: receive requests and run application logic.
    3. Write the MySQL responsibility: store and retrieve application data.
    4. Draw a connection between the boxes.
    5. Label the connection `Docker network`.
    6. Note which local dependencies Docker will replace:
        - Local Python installation
        - Local virtual environment
        - Locally installed packages
        - Local MySQL configuration
- Practice task: Explain the architecture aloud in three sentences without looking at the notes.
- Done when: You can explain why the project needs two containers and how they communicate.
##### **Goal 8: Create a minimal Dockerfile for the FastAPI backend**
- Why this matters: Docker needs explicit instructions for building and starting the backend.
- Before you start: Ensure `backend/requirements.txt` lists all required packages, including `asyncmy`.
- Process:
    1. Create `backend/Dockerfile`.
    2. Add the Python base image:
        ```dockerfile
        FROM python:3.11-slim
        ```
    3. Set the working directory:
        ```dockerfile
        WORKDIR /app
        ```
    4. Copy and install dependencies:
        ```dockerfile
        COPY requirements.txt .
        RUN pip install --no-cache-dir -r requirements.txt
        ```
    5. Copy the backend source:
        ```dockerfile
        COPY . .
        ```
    6. Document the FastAPI port:
        ```dockerfile
        EXPOSE 8000
        ```
    7. Add the startup command:
        ```dockerfile
        CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
        ```
- Practice task: Read the Dockerfile from top to bottom and describe what each instruction produces.
- Done when: `backend/Dockerfile` contains a complete build and startup sequence for the FastAPI application.
##### **Goal 9: Make FastAPI reachable outside its container**
- Why this matters: Binding Uvicorn to the wrong address makes the API inaccessible from your computer.
- Process:
    1. Locate the Uvicorn startup command in the Dockerfile.
    2. Confirm that it contains:
        ```text
        --host 0.0.0.0
        ```
    3. Build and start the backend container.
    4. Map host port `8000` to container port `8000`.
    5. Open the API from the host machine.
    6. Compare the behavior with `127.0.0.1` only as a conceptual check: inside a container, that address accepts traffic only from the container itself.
- Practice task: Explain why `127.0.0.1` and `0.0.0.0` behave differently inside Docker.
- Done when: Uvicorn binds to `0.0.0.0`, and the API can be reached through the mapped host port.
##### **Goal 10: Keep private and unnecessary files out of the Docker image**
- Why this matters: Smaller, safer Docker images should not contain local environments, secrets, Git metadata, or editor files.
- Process:
    1. Create `backend/.dockerignore`.
    2. Add virtual-environment and Python cache entries:
        ```dockerignore
        .venv
        __pycache__
        *.pyc
        *.pyo
        *.pyd
        ```
    3. Add sensitive and repository files:
        ```dockerignore
        .env
        .git
        .gitignore
        ```
    4. Add editor and tool caches:
        ```dockerignore
        .idea
        .vscode
        .pytest_cache
        .mypy_cache
        ```
    5. Rebuild the backend image.
    6. Inspect the build context or running container to confirm that `.env` and `.venv` were not copied.
- Practice task: Enter the container and check whether `/app/.env` exists.
- Done when: Private and unnecessary files are absent from the backend image.
##### **Goal 11: Define the MySQL service in Docker Compose**
- Why this matters: The FastAPI container needs a predictable database service to connect to.
- Process:
    1. Create `docker-compose.yaml` in the project root.
    2. Add the MySQL service:
        ```yaml
        services:
          mysql:
            image: mysql:8.0
            container_name: auction-mysql
            restart: unless-stopped
        ```
    3. Add the database configuration:
        ```yaml
            environment:
              MYSQL_ROOT_PASSWORD: Asdf1234!
              MYSQL_DATABASE: auction_db
              MYSQL_USER: nhieecute
              MYSQL_PASSWORD: "20051011"
        ```
    4. Add the host port mapping:
        ```yaml
            ports:
              - "3307:3306"
        ```
    5. Start only the MySQL service:
        ```bash
        docker compose up -d mysql
        ```
    6. Run `docker ps` and verify that `auction-mysql` is running.
- Practice task: Connect to MySQL through host port `3307` using a database client or command-line tool.
- Done when: Docker Compose starts a MySQL 8.0 container named `auction-mysql` with the expected database and user.
##### **Goal 12: Persist MySQL data with a named volume**
- Why this matters: Database records should survive container removal and recreation.
- Before you start: Complete Goal 11 and make sure the MySQL service starts successfully.
- Process:
    1. Add the volume mount to the MySQL service:
        ```yaml
            volumes:
              - auction_mysql_data:/var/lib/mysql
        ```
    2. Define the named volume at the bottom of the Compose file:
        ```yaml
        volumes:
          auction_mysql_data:
        ```
    3. Start MySQL.
    4. Create a test table or insert a test record.
    5. Remove and recreate the MySQL container without deleting the volume.
    6. Confirm that the test data still exists.
- Practice task: Run `docker volume ls` and locate `auction_mysql_data`.
- Done when: MySQL data remains available after the container is recreated.
##### **Goal 13: Add a MySQL health check**
- Why this matters: A running container is not necessarily ready to accept database connections.
- Process:
    1. Add a health check to the MySQL service:
        ```yaml
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
    2. Restart the Compose project.
    3. Run:
        ```bash
        docker ps
        ```
    4. Watch the MySQL status change from `health: starting` to `healthy`.
    5. Inspect the health-check logs if it becomes unhealthy.
- Practice task: Temporarily introduce an incorrect health-check password, observe the failure, then restore the correct value.
- Done when: The MySQL container reports a `healthy` status.
##### **Goal 14: Define the FastAPI backend service in Docker Compose**
- Why this matters: Compose should build and run the backend without requiring your local Python environment.
- Before you start: Complete the Dockerfile and `.dockerignore` goals.
- Process:
    1. Add the backend service:
        ```yaml
          backend:
            build:
              context: ./backend
              dockerfile: Dockerfile
            container_name: auction-backend
            restart: unless-stopped
        ```
    2. Add the API port mapping:
        ```yaml
            ports:
              - "8000:8000"
        ```
    3. Build the backend:
        ```bash
        docker compose build backend
        ```
    4. Start it:
        ```bash
        docker compose up -d backend
        ```
    5. Check its logs:
        ```bash
        docker compose logs backend
        ```
- Practice task: Stop your local virtual environment and verify that the backend still starts through Docker.
- Done when: Compose builds a container named `auction-backend`, and FastAPI starts inside it.
##### **Goal 15: Connect the backend container to MySQL using the service name**
- Why this matters: Containers communicate through Compose service names, not through the host’s `localhost`.
- Before you start: Both `mysql` and `backend` services must exist in the same Compose file.
- Process:
    1. Add the database URL to the backend service:
        ```yaml
            environment:
              DATABASE_URL: mysql+asyncmy://nhieecute:20051011@mysql:3306/auction_db
        ```
    2. Notice that the hostname is `mysql`, matching the Compose service name.
    3. Notice that the port is `3306`, the MySQL port inside the Docker network.
    4. Do not use `localhost:3307` for container-to-container communication.
    5. Restart the backend:
        ```bash
        docker compose up -d --build backend
        ```
    6. Check the backend logs for database connection errors.
- Practice task: Write two connection targets:
    - Local backend to containerized MySQL: `localhost:3307`
    - Containerized backend to containerized MySQL: `mysql:3306`
- Done when: The backend container connects successfully using `mysql:3306`.
##### **Goal 16: Delay backend startup until MySQL is healthy**
- Why this matters: The backend may fail if it starts while MySQL is still initializing.
- Before you start: The MySQL health check from Goal 13 must work.
- Process:
    1. Add `depends_on` to the backend service:
        ```yaml
            depends_on:
              mysql:
                condition: service_healthy
        ```
    2. Stop the entire project:
        ```bash
        docker compose down
        ```
    3. Start both services:
        ```bash
        docker compose up
        ```
    4. Observe MySQL starting first.
    5. Observe the backend starting after MySQL becomes healthy.
    6. Check that the backend does not produce an initial connection-refused error.
- Practice task: Follow both services’ logs and identify the point when MySQL becomes healthy and the backend begins startup.
- Done when: The backend starts only after the MySQL health check passes.
##### **Goal 17: Run and verify the complete containerized application**
- Why this matters: The final test confirms that the repository, configuration, image, network, database, and startup order all work together.
- Before you start: Complete all previous goals.
- Process:
    1. Validate the Compose file:
        ```bash
        docker compose config
        ```
    2. Build and start the project:
        ```bash
        docker compose up --build
        ```
    3. Confirm that both containers are running:
        ```bash
        docker ps
        ```
    4. Confirm that MySQL is healthy.
    5. Open the FastAPI application at:
        ```text
        http://localhost:8000
        ```
    6. Open the API documentation if enabled:
        ```text
        http://localhost:8000/docs
        ```
    7. Trigger an operation that accesses the database.
    8. Review backend logs and confirm that no configuration, driver, port, or connection errors appear.
    9. Stop the project:
        ```bash
        docker compose down
        ```
    10. Start it again and confirm that the database volume preserves its data.
- Practice task: Create one database-backed record through the API, restart the Compose project, and retrieve the same record.
- Done when: FastAPI is reachable on port `8000`, MySQL is healthy, database operations work, and data survives a restart.
###### Goal Map
1.  Keep generated and private files out of Git
2.  Identify why importing the settings module can stop the application
3.  Supply the database URL through an environment file
4.  Configure Pydantic to load values from `.env`
5.  Match the database driver to SQLAlchemy’s asynchronous engine
6.  Verify the correct MySQL host port
7.  Describe the two-container architecture
8.  Create a minimal Dockerfile for the FastAPI backend
9.  Make FastAPI reachable outside its container
10.  Keep private and unnecessary files out of the Docker image
11.  Define the MySQL service in Docker Compose
12.  Persist MySQL data with a named volume
13.  Add a MySQL health check
14.  Define the FastAPI backend service in Docker Compose
15.  Connect the backend container to MySQL using the service name
16.  Delay backend startup until MySQL is healthy
17.  Run and verify the complete containerized application





**Topic:** Run, configure, debug, and develop a Dockerized FastAPI and MySQL application
##### **Goal 18: Choose the correct database hostname for each runtime**
- Why this matters: `localhost` points to different machines depending on whether FastAPI runs on Windows or inside a container.
- Before you start: The MySQL container should expose host port `3307` and listen internally on port `3306`.
- Process:
    1. When FastAPI runs directly on Windows, set:
        ```env
        DATABASE_URL=mysql+asyncmy://nhieecute:20051011@localhost:3307/auction_db
        ```
    2. Identify `localhost` as your Windows host in this setup.
    3. When FastAPI runs inside Docker, replace `localhost` with the Compose service name `mysql`.
    4. Use MySQL’s internal port `3306`:
        ```env
        DATABASE_URL=mysql+asyncmy://nhieecute:20051011@mysql:3306/auction_db
        ```
    5. Record the two connection rules:
        ```text
        Windows → localhost:3307
        Backend container → mysql:3306
        ```
- Practice task: Write the correct database URL for a locally running backend and for a containerized backend without checking the notes.
- Done when: You can correctly choose between `localhost:3307` and `mysql:3306`.
##### **Goal 19: Explain why `localhost` cannot reach MySQL from the backend container**
- Why this matters: Misunderstanding container-local networking commonly causes database connection failures.
- Process:
    1. Draw one box for the FastAPI container.
    2. Draw a separate box for the MySQL container.
    3. Write `localhost` inside the FastAPI box.
    4. Note that this address points back to the FastAPI container itself.
    5. Draw a Docker network between the containers.
    6. Label the MySQL destination with its service name:
        ```text
        mysql:3306
        ```
- Practice task: Explain in two sentences why `localhost:3306` fails inside the backend container.
- Done when: You can state that `localhost` refers to the backend container, while MySQL is in a different container.
##### **Goal 20: Make the backend wait for a healthy MySQL service**
- Why this matters: A started MySQL container may still be initializing and unable to accept connections.
- Before you start: The Compose file must contain both `mysql` and `backend` services.
- Process:
    1. Add a health check to the MySQL service:
        ```yaml
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
    2. Confirm that the health command is `mysqladmin ping`.
    3. Add the health condition to the backend service:
        ```yaml
        depends_on:
          mysql:
            condition: service_healthy
        ```
    4. Restart the Compose project.
    5. Watch MySQL move from its starting state to a healthy state.
    6. Confirm that the backend starts after the health check succeeds.
- Practice task: Use `docker compose ps` to identify the MySQL health status.
- Done when: MySQL reports healthy before the backend begins normal startup.
##### **Goal 21: Generate a complete backend dependency file**
- Why this matters: The Dockerfile installs only the packages listed in `requirements.txt`.
- Before you start: Activate the virtual environment that contains the packages used by the backend.
- Process:
    1. Activate the backend virtual environment.
    2. Confirm that required packages such as FastAPI, Uvicorn, SQLAlchemy, Pydantic Settings, and `asyncmy` are installed.
    3. Move into the backend directory.
    4. Generate the dependency file:
        ```bash
        python -m pip freeze > requirements.txt
        ```
    5. Open `requirements.txt`.
    6. Search for the packages required by the application.
- Practice task: Locate the `asyncmy` entry in `requirements.txt`.
- Done when: `requirements.txt` exists and contains every package required to import and run the backend.
##### **Goal 22: Load settings correctly in both local and Docker execution**
- Why this matters: Local execution reads `.env`, while Docker Compose provides configuration through container environment variables.
- Before you start: The `database_url` setting must remain required.
- Process:
    1. Open `app/core/config.py`.
    2. Import `Path`:
        ```python
        from pathlib import Path
        ```
    3. Import the Pydantic settings classes:
        ```python
        from pydantic_settings import BaseSettings, SettingsConfigDict
        ```
    4. Calculate the backend base directory:
        ```python
        BASE_DIR = Path(__file__).resolve().parents[2]
        ```
    5. Configure the settings class:
        ```python
        class Settings(BaseSettings):
            database_url: str
            model_config = SettingsConfigDict(
                env_file=BASE_DIR / ".env",
                env_file_encoding="utf-8",
                case_sensitive=False,
                extra="ignore",
            )
        ```
    6. Create the settings object:
        ```python
        settings = Settings()
        ```
    7. Run the backend locally and confirm that it reads `.env`.
    8. Run it through Compose and confirm that the Compose `DATABASE_URL` is accepted.
- Practice task: Temporarily print `settings.database_url` in each runtime and compare the hostname and port.
- Done when: Local execution uses `localhost:3307`, while Docker execution uses `mysql:3306`.
##### **Goal 23: Ignore unrelated environment settings safely**
- Why this matters: The application may receive environment variables that are not fields in the `Settings` class.
- Before you start: Complete the settings configuration from Goal 22.
- Process:
    1. Locate `SettingsConfigDict`.
    2. Add:
        ```python
        extra="ignore"
        ```
    3. Add an unrelated test variable to `.env`:
        ```env
        TEST_VALUE=example
        ```
    4. Start the application.
    5. Confirm that the extra variable does not cause a settings validation error.
    6. Confirm that `database_url` is still required by temporarily removing it and observing the validation failure.
- Practice task: Explain the difference between ignoring extra settings and making `database_url` optional.
- Done when: Extra values are ignored, but the application still fails when `database_url` is missing.
##### **Goal 24: Build and start the complete Compose project**
- Why this matters: Writing Docker configuration files does not automatically create images or containers.
- Before you start: Run this command from the project root containing `docker-compose.yaml`.
- Process:
    1. Open a terminal in the project root.
    2. Run:
        ```bash
        docker compose up --build -d
        ```
    3. Confirm that `--build` builds the backend image.
    4. Confirm that `-d` runs the services in detached mode.
    5. Verify that Docker downloads the MySQL image if it is not already available.
    6. Verify that Docker creates a network and both containers.
    7. Open:
        ```text
        http://localhost:8000/docs
        ```
- Practice task: From memory, describe what `--build` and `-d` each do.
- Done when: Both services run and the FastAPI documentation opens at `/docs`.
##### **Goal 25: Inspect service status after startup**
- Why this matters: A container can be created successfully and then stop immediately because of an application error.
- Process:
    1. Start the Compose project.
    2. Run:
        ```bash
        docker compose ps
        ```
    3. Locate the `backend` and `mysql` services.
    4. Check whether each service is running, exited, restarting, or unhealthy.
    5. Confirm that MySQL has a healthy status.
    6. Note any service that stopped unexpectedly.
- Practice task: Record the current state of both services in one line each.
- Done when: You can use `docker compose ps` to identify whether both services are running correctly.
##### **Goal 26: Read Compose logs to diagnose startup errors**
- Why this matters: Logs reveal missing packages, invalid URLs, import errors, and database connection failures.
- Before you start: At least one Compose service must have been started.
- Process:
    1. View logs from all services:
        ```bash
        docker compose logs
        ```
    2. View only backend logs:
        ```bash
        docker compose logs backend
        ```
    3. Follow new backend output continuously:
        ```bash
        docker compose logs -f backend
        ```
    4. Identify the first meaningful error rather than only reading the final line.
    5. Classify the error as one of these:
        ```text
        Missing dependency
        Invalid database URL
        Import error
        Database connection error
        ```
    6. Stop following the logs with `Ctrl+C`.
- Practice task: Introduce a harmless typo in a Python import, observe the log error, then restore the correct import.
- Done when: You can isolate backend logs and identify the category and location of a startup failure.
##### **Goal 27: Rebuild the image after changing dependencies**
- Why this matters: A running container does not automatically receive packages added to the local virtual environment.
- Before you start: Add or update the dependency in `requirements.txt`.
- Process:
    1. Install the required package in the active local environment.
    2. Update `requirements.txt`:
        ```bash
        python -m pip freeze > requirements.txt
        ```
    3. Rebuild and restart the services:
        ```bash
        docker compose up --build -d
        ```
    4. Open the backend logs:
        ```bash
        docker compose logs backend
        ```
    5. Confirm that the previous missing-package error is gone.
- Practice task: Check the image build output and locate the step that installs `requirements.txt`.
- Done when: The rebuilt backend container can import the newly added dependency.
##### **Goal 28: Observe why copied source code requires image rebuilding**
- Why this matters: The current Dockerfile copies source files only while the image is being built.
- Before you start: Use the Dockerfile containing:
    ```dockerfile
    COPY . .
    ```
- Process:
    1. Start the backend container without a source-code volume.
    2. Change a visible FastAPI response in the local Python code.
    3. Refresh the endpoint.
    4. Confirm that the container still returns the old response.
    5. Rebuild the image:
        ```bash
        docker compose up --build
        ```
    6. Refresh the endpoint and confirm that the change now appears.
- Practice task: Change a test endpoint response from `"old"` to `"new"` and record when the new value becomes visible.
- Done when: You can demonstrate that code copied during image creation does not update until the image is rebuilt.
##### **Goal 29: Mount the backend source code for development**
- Why this matters: A bind mount makes local code changes immediately available inside the container.
- Before you start: Use this setup only for development.
- Process:
    1. Open the backend service in `docker-compose.yaml`.
    2. Add:
        ```yaml
        volumes:
          - ./backend:/app
        ```
    3. Start or restart the Compose project.
    4. Change a Python source file locally.
    5. Enter or inspect the container and confirm that the same change appears under `/app`.
    6. Note that the local backend folder now replaces the image’s `/app` contents while the container runs.
- Practice task: Create a temporary file in the local `backend` folder and confirm that it appears inside `/app`.
- Done when: Local backend files are visible inside the running container without rebuilding the image.
##### **Goal 30: Enable automatic FastAPI reload during development**
- Why this matters: Mounting the code makes changes available, but Uvicorn must reload the application to run them.
- Before you start: Complete the source-code mount from Goal 29.
- Process:
    1. Override the backend startup command:
        ```yaml
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
        ```
    2. Start the services:
        ```bash
        docker compose up -d
        ```
    3. Follow backend logs:
        ```bash
        docker compose logs -f backend
        ```
    4. Edit a Python file.
    5. Watch Uvicorn detect the change and reload.
    6. Refresh the affected endpoint.
- Practice task: Change an endpoint response twice and confirm that both changes appear without rebuilding.
- Done when: Saving a Python file triggers an automatic Uvicorn reload inside the container.
##### **Goal 31: Create a complete development backend service**
- Why this matters: Development mode requires networking, environment configuration, code mounting, reload, and database readiness to work together.
- Before you start: The MySQL service and health check must already be configured.
- Process:
    1. Update the backend service to:
        ```yaml
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
    2. Validate the Compose configuration:
        ```bash
        docker compose config
        ```
    3. Start the services.
    4. Confirm that the backend connects to MySQL.
    5. Change a Python file and confirm automatic reload.
    6. Open the FastAPI documentation.
- Practice task: Add a small temporary GET endpoint and test it through `/docs` without rebuilding the image.
- Done when: The backend starts after MySQL, connects through `mysql:3306`, and reloads when local code changes.
##### **Goal 32: Distinguish development startup from production-like startup**
- Why this matters: `--reload` is useful during development but should not be used for production-like execution.
- Process:
    1. Identify the development-only settings:
        ```text
        ./backend:/app bind mount
        --reload
        ```
    2. Identify the production-like behavior:
        ```text
        Source code copied into the image
        No --reload
        Rebuild when code changes
        ```
    3. Run the project once with development settings.
    4. Remove or disable the bind mount and reload command.
    5. Rebuild and run the production-like version.
    6. Compare the startup logs and code-change behavior.
- Practice task: Create a two-column note labeled `Development` and `Production-like`, listing the source-code and reload behavior of each.
- Done when: You can explain why development uses a bind mount and reload, while production-like execution uses a fixed image.
##### **Goal 33: Start existing Compose services without rebuilding**
- Why this matters: You do not need to rebuild images when only starting unchanged services.
- Process:
    1. Confirm that the backend image already exists.
    2. Run:
        ```bash
        docker compose up -d
        ```
    3. Check the services:
        ```bash
        docker compose ps
        ```
    4. Open the FastAPI documentation.
- Practice task: State why this command does not include `--build`.
- Done when: Existing services start in detached mode using the current images.
##### **Goal 34: Stop the Compose project without deleting database data**
- Why this matters: Normal shutdown should remove containers and the project network while keeping the MySQL volume.
- Process:
    1. Run:
        ```bash
        docker compose down
        ```
    2. Confirm that the containers stop and are removed.
    3. Run:
        ```bash
        docker compose ps
        ```
    4. Verify that no project services are running.
    5. Check that the named MySQL volume still exists.
    6. Start the project again and confirm that its previous data remains.
- Practice task: Create a test database record, run `docker compose down`, restart the services, and retrieve the record.
- Done when: The containers are removed, but the MySQL data survives the restart.
##### **Goal 35: Reset the project by deleting its database volume**
- Why this matters: Removing the volume gives you a clean database but permanently deletes its stored data.
- Before you start: Save any database data that you need to keep.
- Process:
    1. Confirm that deleting the development database is intentional.
    2. Run:
        ```bash
        docker compose down -v
        ```
    3. Confirm that the containers are removed.
    4. Confirm that the Compose project’s volumes are removed.
    5. Start the project again:
        ```bash
        docker compose up -d
        ```
    6. Observe MySQL initialize a new empty database.
- Practice task: Create a temporary record before running `down -v`, then verify that it no longer exists after recreation.
- Done when: The Compose project starts with a newly initialized MySQL database and none of the previous volume data remains.
###### Goal Map
1.  Choose the correct database hostname for each runtime
2.  Explain why `localhost` cannot reach MySQL from the backend container
3.  Make the backend wait for a healthy MySQL service
4.  Generate a complete backend dependency file
5.  Load settings correctly in both local and Docker execution
6.  Ignore unrelated environment settings safely
7.  Build and start the complete Compose project
8.  Inspect service status after startup
9.  Read Compose logs to diagnose startup errors
10.  Rebuild the image after changing dependencies
11.  Observe why copied source code requires image rebuilding
12.  Mount the backend source code for development
13.  Enable automatic FastAPI reload during development
14.  Create a complete development backend service
15.  Distinguish development startup from production-like startup
16.  Start existing Compose services without rebuilding
17.  Stop the Compose project without deleting database data
18.  Reset the project by deleting its database volume












**Topic:** Inspect, troubleshoot, and maintain a Dockerized FastAPI and MySQL environment
##### **Goal 36: Open a shell inside the backend container**
- Why this matters: Entering the container lets you inspect files, run commands, and debug the backend from its actual runtime environment.
- Before you start: The backend container must be running.
- Process:
    1. Start the Compose services:
        ```bash
        docker compose up -d
        ```
    2. Open a shell inside the backend container:
        ```bash
        docker compose exec backend sh
        ```
    3. Confirm that the prompt changes to the container shell.
    4. Run:
        ```bash
        pwd
        ```
    5. List the files inside the container:
        ```bash
        ls
        ```
    6. Exit the container shell:
        ```bash
        exit
        ```
- Practice task: Enter the container, locate the `app` folder, and return to your normal terminal.
- Done when: You can open and exit an `sh` session inside the running backend container.
##### **Goal 37: Open the MySQL command-line client inside its container**
- Why this matters: Direct database access lets you inspect databases, users, tables, and stored data.
- Before you start: The MySQL container must be running and healthy.
- Process:
    1. Run:
        ```bash
        docker compose exec mysql mysql -u root -p
        ```
    2. Enter the root password:
        ```text
        Asdf1234!
        ```
    3. Confirm that the MySQL prompt appears.
    4. List the databases:
        ```sql
        SHOW DATABASES;
        ```
    5. Select the application database:
        ```sql
        USE auction_db;
        ```
    6. Exit MySQL:
        ```sql
        exit;
        ```
- Practice task: Enter MySQL and confirm that `auction_db` appears in the database list.
- Done when: You can connect as the MySQL `root` user and open the `auction_db` database.
##### **Goal 38: Recreate containers after changing environment values**
- Why this matters: Existing containers may continue using the environment values they received when they were created.
- Before you start: Save the changes to the project’s `.env` or Compose environment configuration.
- Process:
    1. Change one non-database-initialization value in `.env`.
    2. Stop and remove the current containers:
        ```bash
        docker compose down
        ```
    3. Rebuild and recreate the services:
        ```bash
        docker compose up --build -d
        ```
    4. Inspect the service status:
        ```bash
        docker compose ps
        ```
    5. Check the backend logs:
        ```bash
        docker compose logs backend
        ```
    6. Confirm that the recreated backend uses the new value.
- Practice task: Change a safe environment value, recreate the containers, and verify the result in the container or logs.
- Done when: The newly created containers use the updated environment configuration.
##### **Goal 39: Identify which MySQL settings are applied only during initial setup**
- Why this matters: Changing initialization variables does not normally update an existing database stored in a volume.
- Before you start: The MySQL service must use a persistent named volume.
- Process:
    1. Locate these MySQL environment variables:
        ```text
        MYSQL_USER
        MYSQL_PASSWORD
        MYSQL_DATABASE
        ```
    2. Note that MySQL primarily uses them when creating a new data directory.
    3. Start MySQL once so the database volume is initialized.
    4. Change one of the initialization values.
    5. Recreate the containers without deleting the volume.
    6. Observe that the existing database user, password, or database may remain unchanged.
- Practice task: Explain why changing `MYSQL_PASSWORD` does not necessarily update an existing MySQL user.
- Done when: You can identify the three initialization variables and explain their relationship to the data volume.
##### **Goal 40: Reinitialize MySQL after changing its initial credentials**
- Why this matters: Removing the old volume allows MySQL to build a new database directory using the updated initialization values.
- Before you start: Confirm that the old database data is not needed, because this process deletes it.
- Process:
    1. Update `MYSQL_USER`, `MYSQL_PASSWORD`, or `MYSQL_DATABASE`.
    2. Stop the Compose project and delete its volumes:
        ```bash
        docker compose down -v
        ```
    3. Rebuild and start the services:
        ```bash
        docker compose up -d --build
        ```
    4. Wait until MySQL becomes healthy.
    5. Connect to MySQL with the new credentials.
    6. Confirm that the new database and user were created.
- Practice task: In a disposable development database, change the database name and verify that the new name appears after reinitialization.
- Done when: MySQL starts with the new initial username, password, or database name.
##### **Goal 41: Recreate containers without deleting stored MySQL data**
- Why this matters: Changes such as container names and port mappings do not require deleting the database volume.
- Process:
    1. Change only a container name, host port, or another non-database initialization setting.
    2. Stop and remove the current containers:
        ```bash
        docker compose down
        ```
    3. Rebuild and recreate them:
        ```bash
        docker compose up -d --build
        ```
    4. Confirm that the named volume still exists.
    5. Connect to the database.
    6. Verify that existing data remains available.
- Practice task: Change a container name, recreate the project without `-v`, and confirm that a previous test record still exists.
- Done when: The containers use the new configuration while the MySQL data remains intact.
##### **Goal 42: Inspect the fully resolved Compose configuration**
- Why this matters: The resolved configuration shows what Docker Compose actually read from the Compose file and environment variables.
- Process:
    1. Open a terminal in the project root.
    2. Run:
        ```bash
        docker compose config
        ```
    3. Locate the `backend` service.
    4. Inspect its resolved `DATABASE_URL`, ports, volumes, and command.
    5. Locate the `mysql` service.
    6. Inspect its environment variables, port mapping, volume, and health check.
    7. Compare the output with the values you intended to configure.
- Practice task: Find the resolved backend database hostname and confirm whether it is `mysql`.
- Done when: You can use `docker compose config` to verify the configuration Docker Compose will apply.
##### **Goal 43: Detect a container-name conflict**
- Why this matters: Docker cannot create a new container when another container already uses the requested name.
- Process:
    1. Run:
        ```bash
        docker compose up -d
        ```
    2. Look for an error mentioning the name:
        ```text
        auction-mysql
        ```
    3. List all containers:
        ```bash
        docker ps -a
        ```
    4. Find the existing container named `auction-mysql`.
    5. Determine whether it belongs to the current project or is an older separate container.
    6. Choose either to remove the conflict or rename the Compose container.
- Practice task: Use `docker ps -a` to check whether any existing container has the name defined in `container_name`.
- Done when: You can recognize a container-name conflict and identify the container causing it.
##### **Goal 44: Remove a conflicting container outside the Compose project**
- Why this matters: `docker compose down` removes only resources belonging to the current Compose project.
- Before you start: Confirm that the conflicting container is no longer needed.
- Process:
    1. List all containers:
        ```bash
        docker ps -a
        ```
    2. Find the separate container named `auction-mysql`.
    3. Stop it if it is running:
        ```bash
        docker stop auction-mysql
        ```
    4. Remove it:
        ```bash
        docker rm auction-mysql
        ```
    5. Start the Compose project:
        ```bash
        docker compose up -d
        ```
    6. Confirm that the new MySQL container starts without a name conflict.
- Practice task: Explain why `docker compose down -v` may leave an unrelated `auction-mysql` container untouched.
- Done when: The conflicting external container is removed and the Compose service starts successfully.
##### **Goal 45: Resolve a name conflict by renaming the Compose container**
- Why this matters: Renaming avoids deleting another container that may still be needed.
- Process:
    1. Open the Compose file.
    2. Locate:
        ```yaml
        container_name: auction-mysql
        ```
    3. Replace it with a unique name:
        ```yaml
        container_name: auction-mysql-dev
        ```
    4. Validate the configuration:
        ```bash
        docker compose config
        ```
    5. Recreate the project:
        ```bash
        docker compose up -d
        ```
    6. Confirm that both containers can exist without a naming conflict.
- Practice task: Rename the development MySQL container and locate its new name with `docker ps`.
- Done when: The Compose project starts using a container name that is not already taken.
##### **Goal 46: Avoid a port conflict between Docker and local Uvicorn**
- Why this matters: Two processes cannot normally bind to host port `8000` at the same time.
- Process:
    1. Check whether the Docker backend is running:
        ```bash
        docker compose ps
        ```
    2. Identify the Docker port mapping:
        ```text
        8000:8000
        ```
    3. Do not run this local command at the same time on the same port:
        ```bash
        python -m uvicorn app.main:app --reload
        ```
    4. Choose one runtime:
        ```text
        Docker backend
        or
        Local Uvicorn
        ```
    5. To use local Uvicorn, stop the Docker project:
        ```bash
        docker compose down
        ```
    6. To use Docker again, stop local Uvicorn and run:
        ```bash
        docker compose up -d
        ```
- Practice task: Check which process currently owns port `8000` before starting another backend.
- Done when: Only one backend process uses host port `8000`.
##### **Goal 47: Use different ports when two backend instances are needed**
- Why this matters: Separate host ports allow a local backend and a Docker backend to run simultaneously.
- Before you start: Use this only when running both instances is intentional.
- Process:
    1. Keep the Docker backend mapped to:
        ```yaml
        ports:
          - "8000:8000"
        ```
    2. Start local Uvicorn on a different port:
        ```bash
        python -m uvicorn app.main:app --reload --port 8001
        ```
    3. Open the Docker version at:
        ```text
        http://localhost:8000/docs
        ```
    4. Open the local version at:
        ```text
        http://localhost:8001/docs
        ```
    5. Confirm that each process responds on its own port.
- Practice task: Run one backend on `8000` and one on `8001`, then open both documentation pages.
- Done when: Both backend instances run without competing for the same host port.
##### **Goal 48: Add a locally installed package to the Docker dependency list**
- Why this matters: The Docker image has its own Python environment and cannot use packages from your local `.venv`.
- Before you start: Activate the local virtual environment where the new package is installed.
- Process:
    1. Install the package locally.
    2. Confirm that it works in the local virtual environment.
    3. Add the package to `backend/requirements.txt`.
    4. Alternatively, regenerate the file:
        ```bash
        python -m pip freeze > requirements.txt
        ```
    5. Confirm that the package appears in `requirements.txt`.
    6. Rebuild the backend image:
        ```bash
        docker compose up --build -d
        ```
    7. Check the backend logs for import errors.
- Practice task: Choose a harmless package, install it locally, add it to `requirements.txt`, and import it inside the backend container.
- Done when: The package is available both locally and inside the rebuilt Docker container.
##### **Goal 49: Verify installed packages inside the backend container**
- Why this matters: Checking inside the container confirms what the Docker image actually installed.
- Before you start: Rebuild the image after updating `requirements.txt`.
- Process:
    1. Enter the backend container:
        ```bash
        docker compose exec backend sh
        ```
    2. List installed packages:
        ```bash
        python -m pip list
        ```
    3. Search for the required package:
        ```bash
        python -m pip show PACKAGE_NAME
        ```
    4. Test importing it:
        ```bash
        python -c "import PACKAGE_NAME"
        ```
    5. Exit the container.
- Practice task: Verify that `asyncmy` is installed and importable inside the backend container.
- Done when: The required package appears in `pip list` and imports without an error inside Docker.
##### **Goal 50: Force a clean Docker image rebuild**
- Why this matters: Docker may reuse a cached dependency layer instead of running the installation step again.
- Before you start: Confirm that `requirements.txt` contains the correct dependencies.
- Process:
    1. Stop the current services if needed:
        ```bash
        docker compose down
        ```
    2. Build the backend image without cached layers:
        ```bash
        docker compose build --no-cache backend
        ```
    3. Watch the output and confirm that the dependency installation command runs again.
    4. Start the services:
        ```bash
        docker compose up -d
        ```
    5. Inspect the backend logs:
        ```bash
        docker compose logs backend
        ```
    6. Enter the backend container and verify the dependency:
        ```bash
        docker compose exec backend sh
        ```
- Practice task: Perform a no-cache build and locate the `pip install` step in the build output.
- Done when: Docker reinstalls the backend dependencies without reusing the previous installation layer.
##### **Goal 51: Choose the correct recovery action for a Docker change**
- Why this matters: Different changes require different levels of recreation, rebuilding, or data deletion.
- Process:
    1. For a Python source change with a development bind mount, save the file and let `--reload` restart the app.
    2. For a Python source change without a bind mount, rebuild:
        ```bash
        docker compose up --build -d
        ```
    3. For a dependency change, update `requirements.txt` and rebuild.
    4. For suspected dependency-cache problems, use:
        ```bash
        docker compose build --no-cache backend
        ```
    5. For an ordinary environment or port change, recreate containers without deleting the volume:
        ```bash
        docker compose down
        docker compose up --build -d
        ```
    6. For changed initial MySQL credentials or database names, delete the volume only when old data is not needed:
        ```bash
        docker compose down -v
        docker compose up -d --build
        ```
- Practice task: Choose the correct command sequence for these cases: code change, dependency change, port change, and MySQL password initialization change.
- Done when: You can select the least destructive command sequence that correctly applies each kind of change.
###### Goal Map
1.  Open a shell inside the backend container
2.  Open the MySQL command-line client inside its container
3.  Recreate containers after changing environment values
4.  Identify which MySQL settings are applied only during initial setup
5.  Reinitialize MySQL after changing its initial credentials
6.  Recreate containers without deleting stored MySQL data
7.  Inspect the fully resolved Compose configuration
8.  Detect a container-name conflict
9.  Remove a conflicting container outside the Compose project
10.  Resolve a name conflict by renaming the Compose container
11.  Avoid a port conflict between Docker and local Uvicorn
12.  Use different ports when two backend instances are needed
13.  Add a locally installed package to the Docker dependency list
14.  Verify installed packages inside the backend container
15.  Force a clean Docker image rebuild
16.  Choose the correct recovery action for a Docker change