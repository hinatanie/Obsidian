#### Why does FastAPI need an isolated Python environment?
An isolated environment prevents installed packages from conflicting with packages from other projects.
#### How do you create an isolated Python environment?
Create a virtual environment for the FastAPI backend.

---
#### What should you do if the project has no virtual environment?
Open PowerShell inside the `backend` folder and create `.venv`.
```powershell
python -m venv .venv
```
#### What does `.venv` contain?
It contains the isolated Python environment and its installed packages.

---
#### What should you do if `.venv` exists but is not active?
Activate it in PowerShell.
```powershell
.\.venv\Scripts\Activate.ps1
```

---
#### What should you do before installing FastAPI packages?
Upgrade `pip`.
```powershell
python -m pip install --upgrade pip
```
#### How do you install the basic FastAPI packages?
Install `fastapi` and `uvicorn`.
```powershell
pip install fastapi uvicorn
```
#### Which packages are needed for the auction backend?
Install FastAPI, Uvicorn, SQLAlchemy, the asynchronous MySQL driver, and the other required packages.
```powershell
pip install fastapi uvicorn sqlalchemy asyncmy bcrypt email-validator pydantic-settings
```

---
#### Why does FastAPI need an application entry point?
Uvicorn needs to know which Python file contains the application and which variable contains the FastAPI instance.
#### What project structure provides the application entry point?
Create an `app` package with `__init__.py` and `main.py`.
```text
backend/
├── .venv/
└── app/
    ├── __init__.py
    └── main.py
```
#### What should `app/main.py` contain?
```python
from fastapi import FastAPI
app = FastAPI()
@app.get("/")
def root() -> dict[str, str]:
    return {
        "message": "FastAPI is running"
    }
```
#### What does the `app` variable represent?
The `app` variable is the FastAPI application that Uvicorn starts.
```python
app = FastAPI()
```
#### What does the root endpoint return?
It returns a message showing that FastAPI is running.
```json
{
    "message": "FastAPI is running"
}
```

---
#### How do you start the FastAPI server?
Run Uvicorn from the `backend` folder.
```powershell
python -m uvicorn app.main:app --reload
```
#### What does `app.main:app` identify?
`app.main` identifies the `app/main.py` module, and the final `app` identifies the FastAPI application variable.
#### What does `--reload` do?
It reloads the server when the Python code changes.
#### Where can you open the application?
```text
http://127.0.0.1:8000
```
#### Where can you open the Swagger documentation?
```text
http://127.0.0.1:8000/docs
```

---
#### Why should `.venv` not be pushed to Git?
The `.venv` directory exists only on your computer and contains locally installed packages.
#### Why do other developers need `requirements.txt`?
It tells them which packages they need to install.
#### How do you save the installed packages?
Run:
```powershell
pip freeze > requirements.txt
```
#### How can another developer recreate the environment?
They can create and activate `.venv`, then install the saved packages.
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

---
#### Why should generated and private files not be pushed to Git?
Virtual environments, Python cache files, and environment secrets should remain outside the repository.
#### How do you exclude the virtual environment from Git?
Add `.venv/` to `.gitignore`.
```gitignore
# Virtual environment
.venv/
```
#### How do you exclude Python cache files from Git?
Add the Python cache patterns to `.gitignore`.
```gitignore
# Python cache
__pycache__/
*.pyc
```
#### How do you exclude environment secrets from Git?
Add `.env` to `.gitignore`.
```gitignore
# Environment secrets
.env
```
#### What should the complete `.gitignore` section contain?
```gitignore
# Virtual environment
.venv/
# Python cache
__pycache__/
*.pyc
# Environment secrets
.env
```

---











#### **Topic:** Set up, run, and safely share a FastAPI backend using a Python virtual environment
#### **Goal 1: Explain why the FastAPI backend needs its own virtual environment**
- Why this matters: A virtual environment prevents packages from one Python project from conflicting with packages used by another project.
- Process:
    1. Open the `backend` folder and identify where the FastAPI project files will live.
    2. List two Python projects you might have on the same computer.
    3. Write one sentence explaining how those projects could require different package versions.
    4. Identify `.venv` as the folder that will contain the backend’s isolated Python environment and installed packages.
- Practice task: Complete this sentence: “The FastAPI backend uses `.venv` so that…”
- Done when: You can explain in your own words why project packages should be isolated.
#### **Goal 2: Check whether the backend already has a virtual environment**
- Why this matters: Checking first prevents you from accidentally creating duplicate environments or using the wrong Python setup.
- Process:
    1. Open the project’s `backend` folder in File Explorer or your code editor.
    2. Look for a folder named `.venv`.
    3. If hidden files are not visible, enable hidden-item viewing or check from PowerShell.
    4. Decide which action applies:
        - No `.venv`: create one.
        - `.venv` exists but is inactive: activate it.
- Practice task: Inspect your `backend` folder and record whether `.venv` exists.
- Done when: You know whether you need to create or activate the environment.
#### **Goal 3: Create the backend virtual environment**
- Before you start: Complete Goal 2 and confirm that the `backend` folder does not already contain `.venv`.
- Why this matters: Creating `.venv` gives the backend an isolated place for Python and its packages.
- Process:
    1. Open PowerShell inside the `backend` folder.
    2. Confirm the current folder is `backend` by checking the PowerShell prompt.
    3. Run:
        ```powershell
        python -m venv .venv
        ```
    4. Wait for the command to finish.
    5. Confirm that a new `.venv` folder appears inside `backend`.
- Practice task: Create `.venv` and locate its `Scripts` folder.
- Done when: The structure includes `backend/.venv/`.
#### **Goal 4: Activate the virtual environment in PowerShell**
- Before you start: The `backend/.venv` folder must already exist.
- Why this matters: Activation makes package installation commands use the backend’s isolated environment instead of the computer-wide Python installation.
- Process:
    1. Open PowerShell in the `backend` folder.
    2. Run:
        ```powershell
        .\.venv\Scripts\Activate.ps1
        ```
    3. Look for `(.venv)` at the beginning of the PowerShell prompt.
    4. Run:
        ```powershell
        python -m pip --version
        ```
    5. Check that the displayed path points somewhere inside `.venv`.
- Practice task: Activate `.venv`, close PowerShell, reopen it, and activate `.venv` again.
- Done when: The prompt shows `(.venv)` and `pip` points to the `.venv` directory.
#### **Goal 5: Upgrade pip inside the virtual environment**
- Before you start: The PowerShell prompt should show that `.venv` is active.
- Why this matters: An up-to-date `pip` is less likely to encounter package-installation problems.
- Process:
    1. Confirm that `(.venv)` appears in the PowerShell prompt.
    2. Run:
        ```powershell
        python -m pip install --upgrade pip
        ```
    3. Wait for the installation to complete.
    4. Run:
        ```powershell
        python -m pip --version
        ```
    5. Confirm that `pip` still points to the active `.venv`.
- Practice task: Record the installed `pip` version.
- Done when: The upgrade command finishes successfully and `pip` belongs to `.venv`.
#### **Goal 6: Install the minimal packages needed to run FastAPI**
- Before you start: Activate `.venv` and upgrade `pip`.
- Why this matters: FastAPI creates the application, while Uvicorn runs it as a web server.
- Process:
    1. Run:
        ```powershell
        pip install fastapi uvicorn
        ```
    2. Wait for both packages and their dependencies to install.
    3. Run:
        ```powershell
        pip show fastapi
        ```
    4. Run:
        ```powershell
        pip show uvicorn
        ```
    5. Confirm that both commands display package information.
- Practice task: Identify which package defines the application and which package runs the server.
- Done when: `pip show fastapi` and `pip show uvicorn` both return installed-package details.
#### **Goal 7: Install all packages required by the auction backend**
- Before you start: Complete the minimal installation and keep `.venv` active.
- Why this matters: The auction backend needs packages for the API, database access, password hashing, email validation, and configuration.
- Process:
    1. Run:
        ```powershell
        pip install fastapi uvicorn sqlalchemy asyncmy bcrypt email-validator pydantic-settings
        ```
    2. Wait for the installation to finish without errors.
    3. Run:
        ```powershell
        pip list
        ```
    4. Find these packages in the output:
        - `fastapi`
        - `uvicorn`
        - `sqlalchemy`
        - `asyncmy`
        - `bcrypt`
        - `email-validator`
        - `pydantic-settings`
    5. Note that package names may use slightly different capitalization in the output.
- Practice task: Match each package to its likely role: server, database, password security, validation, or settings.
- Done when: All seven required packages appear in `pip list`.
#### **Goal 8: Create the FastAPI application package**
- Why this matters: Uvicorn needs an importable Python module that contains the FastAPI application.
- Process:
    1. Inside `backend`, create a folder named `app`.
    2. Inside `app`, create an empty file named `__init__.py`.
    3. Inside `app`, create a file named `main.py`.
    4. Confirm that your project structure is:
        ```text
        backend/
        ├── .venv/
        └── app/
            ├── __init__.py
            └── main.py
        ```
    5. Check the spelling and capitalization of every folder and file.
- Practice task: Explain what `__init__.py` helps Python recognize about the `app` folder.
- Done when: Both `app/__init__.py` and `app/main.py` exist in the correct locations.
#### **Goal 9: Create the FastAPI application instance**
- Before you start: The `app/main.py` file must exist.
- Why this matters: The FastAPI application instance is the object Uvicorn will start.
- Process:
    1. Open `app/main.py`.
    2. Import `FastAPI`:
        ```python
        from fastapi import FastAPI
        ```
    3. Create the application instance:
        ```python
        app = FastAPI()
        ```
    4. Save the file.
    5. Identify the two meanings of `app`:
        - The `app` folder is the Python package.
        - The `app` variable is the FastAPI application instance.
- Practice task: Point to the exact line that creates the application Uvicorn will run.
- Done when: `app/main.py` imports `FastAPI` and contains `app = FastAPI()`.
#### **Goal 10: Add a root GET endpoint**
- Before you start: `app/main.py` must already contain the FastAPI application instance.
- Why this matters: A simple endpoint gives you a quick way to confirm that the application is responding correctly.
- Process:
    1. Add the root route decorator below the application instance:
        ```python
        @app.get("/")
        ```
    2. Add the endpoint function:
        ```python
        def root() -> dict[str, str]:
        ```
    3. Return a dictionary containing the status message:
        ```python
        return {
            "message": "FastAPI is running"
        }
        ```
    4. Confirm that the complete file contains:
        ```python
        from fastapi import FastAPI
        app = FastAPI()
        @app.get("/")
        def root() -> dict[str, str]:
            return {
                "message": "FastAPI is running"
            }
        ```
    5. Save `main.py`.
- Practice task: Change the message temporarily, save the file, and then restore it to `"FastAPI is running"`.
- Done when: The root endpoint is connected to `/` and returns the expected dictionary.
#### **Goal 11: Interpret the Uvicorn application path**
- Why this matters: Understanding the startup path helps you fix common import and naming errors.
- Process:
    1. Read the startup target:
        ```text
        app.main:app
        ```
    2. Match `app` before the dot to the `app` package folder.
    3. Match `main` to the `app/main.py` module.
    4. Match the final `app` after the colon to the variable created with:
        ```python
        app = FastAPI()
        ```
    5. Say the full meaning aloud: “Import the `app` variable from the `app.main` module.”
- Practice task: Predict what would need to change in the command if the variable were renamed from `app` to `api`.
- Done when: You can explain every part of `app.main:app` without referring to the notes.
#### **Goal 12: Start the FastAPI development server**
- Before you start: Activate `.venv`, install the packages, and create `app/main.py`.
- Why this matters: Starting Uvicorn makes the FastAPI application available through your browser.
- Process:
    1. Open PowerShell in the `backend` folder.
    2. Activate the environment if necessary:
        ```powershell
        .\.venv\Scripts\Activate.ps1
        ```
    3. Run:
        ```powershell
        python -m uvicorn app.main:app --reload
        ```
    4. Look for output indicating that Uvicorn is running.
    5. Leave the PowerShell window open while testing the application.
    6. Note that `--reload` restarts the development server when saved Python code changes.
- Practice task: Edit the endpoint message while the server is running and observe the automatic reload.
- Done when: Uvicorn starts without an import error and reloads after a saved code change.
#### **Goal 13: Test the root endpoint in the browser**
- Before you start: The Uvicorn server must still be running.
- Why this matters: Testing the route confirms that the server, application import, and endpoint all work together.
- Process:
    1. Open a web browser.
    2. Visit:
        ```text
        http://127.0.0.1:8000
        ```
    3. Confirm that the browser displays:
        ```json
        {
            "message": "FastAPI is running"
        }
        ```
    4. Return to PowerShell and look for the request log.
    5. Confirm that the request received a successful response.
- Practice task: Refresh the browser and observe the additional request in the Uvicorn log.
- Done when: The browser shows the expected message from the root endpoint.
#### **Goal 14: Explore the automatically generated Swagger documentation**
- Before you start: Keep the FastAPI server running.
- Why this matters: Swagger UI lets you inspect and test API endpoints without needing a separate API client.
- Process:
    1. Open:
        ```text
        http://127.0.0.1:8000/docs
        ```
    2. Find the `GET /` endpoint.
    3. Expand the endpoint.
    4. Select **Try it out**.
    5. Select **Execute**.
    6. Review the request URL, response status, and JSON response body.
- Practice task: Execute the root endpoint from Swagger UI and compare its response with the browser response.
- Done when: You can run `GET /` from Swagger UI and receive the expected JSON message.
#### **Goal 15: Save the project’s installed packages in requirements.txt**
- Before you start: Make sure `.venv` is active and all auction-backend packages are installed.
- Why this matters: `requirements.txt` allows another developer to install the packages needed by the project without receiving your local virtual environment.
- Process:
    1. Open PowerShell in the `backend` folder.
    2. Confirm that `.venv` is active.
    3. Run:
        ```powershell
        pip freeze > requirements.txt
        ```
    4. Open `requirements.txt`.
    5. Confirm that it contains package names and version numbers.
    6. Search the file for FastAPI, Uvicorn, SQLAlchemy, and the other required packages.
- Practice task: Locate one line in `requirements.txt` and identify its package name and pinned version.
- Done when: `backend/requirements.txt` exists and lists the installed dependencies.
#### **Goal 16: Recreate the environment from requirements.txt**
- Before you start: A valid `requirements.txt` file must exist.
- Why this matters: Recreating the environment proves that the project setup can be repeated on another computer.
- Process:
    1. Create a temporary test folder outside your main project.
    2. Copy `requirements.txt` into the test folder.
    3. Open PowerShell in that folder.
    4. Create a virtual environment:
        ```powershell
        python -m venv .venv
        ```
    5. Activate it:
        ```powershell
        .\.venv\Scripts\Activate.ps1
        ```
    6. Install the saved packages:
        ```powershell
        pip install -r requirements.txt
        ```
    7. Run `pip list` and confirm that the required packages were installed.
- Practice task: Recreate the environment in a temporary folder, then delete the temporary folder when finished.
- Done when: A fresh `.venv` can install the project dependencies using only `requirements.txt`.
#### **Goal 17: Exclude the virtual environment from Git**
- Why this matters: `.venv` contains local, generated package files that are large and should be recreated rather than shared.
- Process:
    1. Find or create a `.gitignore` file in the project repository.
    2. Add:
        ```gitignore
        # Virtual environment
        .venv/
        ```
    3. Save the file.
    4. Run:
        ```powershell
        git status
        ```
    5. Confirm that files inside `.venv` are not listed as new files.
- Practice task: Explain why `requirements.txt` should be committed but `.venv` should not.
- Done when: Git ignores the `.venv` directory while `requirements.txt` remains visible to Git.
#### **Goal 18: Exclude Python cache files from Git**
- Why this matters: Python cache files are generated automatically and do not belong in the project history.
- Process:
    1. Open `.gitignore`.
    2. Add:
        ```gitignore
        # Python cache
        __pycache__/
        *.pyc
        ```
    3. Save the file.
    4. Run the FastAPI application so Python can generate cache files.
    5. Run:
        ```powershell
        git status
        ```
    6. Confirm that `__pycache__` folders and `.pyc` files are not listed.
- Practice task: Find a generated `__pycache__` folder locally and verify that Git ignores it.
- Done when: Neither `__pycache__/` nor `*.pyc` files appear as untracked changes.
#### **Goal 19: Exclude environment secrets from Git**
- Why this matters: `.env` files may contain database passwords, secret keys, and other private configuration.
- Process:
    1. Open `.gitignore`.
    2. Add:
        ```gitignore
        # Environment secrets
        .env
        ```
    3. Save the file.
    4. Create an empty `.env` file temporarily if one does not already exist.
    5. Run:
        ```powershell
        git status
        ```
    6. Confirm that `.env` is not listed as an untracked file.
- Practice task: Write down three kinds of information that should never be committed inside `.env`.
- Done when: Git ignores `.env`.
#### **Goal 20: Verify the complete Git ignore configuration**
- Before you start: Complete the virtual-environment, cache-file, and secret-file ignore goals.
- Why this matters: A complete `.gitignore` keeps generated files and sensitive information out of the repository.
- Process:
    1. Open `.gitignore`.
    2. Confirm that it contains:
        ```gitignore
        # Virtual environment
        .venv/
        # Python cache
        __pycache__/
        *.pyc
        # Environment secrets
        .env
        ```
    3. Save the file.
    4. Run:
        ```powershell
        git status
        ```
    5. Confirm that the source files and `requirements.txt` can be tracked.
    6. Confirm that `.venv`, Python cache files, and `.env` remain excluded.
- Practice task: Sort these files into “commit” or “do not commit”: `main.py`, `.venv`, `.env`, `requirements.txt`, and `__pycache__`.
- Done when: Git includes the project source and dependency file but excludes all generated and private files.
#### **Goal 21: Perform a complete clean-start test**
- Before you start: Complete all previous setup, server, dependency, and Git-safety goals.
- Why this matters: A clean-start test confirms that you can repeat the entire FastAPI setup without relying on accidental local configuration.
- Process:
    1. Stop the running server with `Ctrl+C`.
    2. Close PowerShell.
    3. Open a new PowerShell window in `backend`.
    4. Activate `.venv`:
        ```powershell
        .\.venv\Scripts\Activate.ps1
        ```
    5. Start the server:
        ```powershell
        python -m uvicorn app.main:app --reload
        ```
    6. Open the root endpoint and confirm the JSON response.
    7. Open `/docs` and execute `GET /`.
    8. Run `git status` and confirm that generated and private files are ignored.
- Practice task: Complete the entire clean-start test without looking at the earlier commands.
- Done when: You can activate the environment, start the server, test both URLs, and verify Git safety from a fresh terminal session.
## Goal Map
1.  Explain why the FastAPI backend needs its own virtual environment
2.  Check whether the backend already has a virtual environment
3.  Create the backend virtual environment
4.  Activate the virtual environment in PowerShell
5.  Upgrade pip inside the virtual environment
6.  Install the minimal packages needed to run FastAPI
7.  Install all packages required by the auction backend
8.  Create the FastAPI application package
9.  Create the FastAPI application instance
10.  Add a root GET endpoint
11.  Interpret the Uvicorn application path
12.  Start the FastAPI development server
13.  Test the root endpoint in the browser
14.  Explore the automatically generated Swagger documentation
15.  Save the project’s installed packages in requirements.txt
16.  Recreate the environment from requirements.txt
17.  Exclude the virtual environment from Git
18.  Exclude Python cache files from Git
19.  Exclude environment secrets from Git
20.  Verify the complete Git ignore configuration
21.  Perform a complete clean-start test