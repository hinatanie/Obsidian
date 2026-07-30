<div id="video-bg-container">
    <video autoplay loop muted playsinline>
        <source src="app://local-file/C:/Users/ADMIN/Documents/Obsidian%20Vault/B%E1%BA%A2O%20ANH%20-%20C%C3%94%20%E1%BA%A4Y%20C%E1%BB%A6A%20ANH%20%E1%BA%A4Y%20-%20OFFICIAL%20MV.mp4" type="video/mp4">
    </video>
</div>

#### The problem is your FastAPI needs its own isolated Python environment so installed packages do not conflict with other projects
The solution is creating a virtual environment
#### The problem is your project does not have virtual environment
The solution is open PowerShell inside your backend folder and then run this to create venv
```
python -m venv .venv
```
#### The problem is that the venv exists but is not active
The solution is activating it 
```
.\.venv\Scripts\Activate.ps1
```
#### The problem is that FastAPI dependencies are not installed
The solution is installing FastAPI packages
First, update pip
```
python -m pip install --upgrade pip
```
Install the basic FastAPI packages
```
python install fastapi uvicorn
```
For your auction backend using SQLAlchemy and asynchronous MySQL
```
pip install fastapi uvicorn sqlalchemy asyncmy bcrypt email-validator pydantic-settings
```
#### The problem is that FastAPI needs an application entry point
Uvicorn needs to know:
- Which Python file contains the application
- Which variable is the FastAPI application
The solution is that creating this structure
```
backend/
├── .venv/
└── app/
    ├── __init__.py
    └── main.py
```
Inside `app/main.py`:
```
from fastapi import FastAPI

app = FastAPI()


@app.get("/")
def root() -> dict[str, str]:
    return {
        "message": "FastAPI is running"
    }
```
The app variable is the FastAPI application that Uvicorn will start
#### The problem is that the FastAPI server needs to run
run 
```
python -m uvicorn app.main:app --reload
```
Open the application
```
http://127.0.0.1:8000
```
Open Swagger documentation
```
http://127.0.0.1:8000/docs
```
#### The problem is that other developers need the same packages
Your .venv exists only on your computer and should not be pushed to Git
Other developers still need to know which packages to install
The solution is saving installed packages
```
pip freeze > requirements.txt
```
Another developer can recreate the environment using
```
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```
#### The problem is that generated and private files should not be pushed
The solution is that creating or update .gitignore
```
# Virtual environment
.venv/

# Python cache
__pycache__/
*.pyc

# Environment secrets
.env
```
