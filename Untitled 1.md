# Main Problem
Your Windows computer cannot run:
```
python download_playlist.py
```
because Windows cannot find a Python installation.
Your real workflow is:
```
Install Python
    ↓
Make sure Windows can find Python
    ↓
Install the Python packages used by download_playlist.py
    ↓
Check FFmpeg if the script downloads/merges YouTube video
    ↓
Run download_playlist.py
```
## Problem 1: Python is not installed
Your error says:
```
Python was not found
```
So Windows receives:
```
python download_playlist.py
```
but it has no real `python.exe` to execute the script.
## Solution
The easiest way on Windows is to install Python with `winget`.
Open PowerShell and run:
```
winget install Python.Python.3.13
```
After installation finishes, **close PowerShell completely** and open a new PowerShell window.
Then check:
```
python --version
```
You should get something similar to:
```
Python 3.13.x
```
Also check:
```
pip --version
```
### Why this works
Installing Python gives Windows the Python interpreter:
```
download_playlist.py
        ↓
python.exe
        ↓
Python reads and executes your code
```

---
## Problem 2: Windows may still open the Microsoft Store instead of Python
Windows has an **App Execution Alias** called `python.exe`.
Sometimes this fake shortcut points to Microsoft Store instead of your installed Python.
That is why you can see:
```
run without arguments to install from the Microsoft Store
```
## Solution
First install Python as above.
Then open a **new PowerShell** and test:
```
where.exe python
```
You want something like:
```
C:\Users\Admin\AppData\Local\Programs\Python\Python313\python.exe
```
Then:
```
python --version
```
If Windows still sends you to Microsoft Store:
Go to:
```
Settings
→ Apps
→ Advanced app settings
→ App execution aliases
```
Find:
```
python.exe
python3.exe
```
Disable the Microsoft Store aliases.
Then reopen PowerShell.

---
## Problem 3: Your Python script depends on `yt_dlp`
Your file is called:
```
download_playlist.py
```
and based on the script you were using earlier, it contains:
```
import yt_dlp
```
Installing Python alone does **not** install `yt_dlp`.
If you skip this step, the next error will probably be:
```
ModuleNotFoundError: No module named 'yt_dlp'
```
## Solution
Install `yt-dlp` using the same Python installation:
```
python -m pip install -U "yt-dlp[default]"
```
Then check:
```
python -m yt_dlp --version
```
### Why use this instead of just `pip install`?
This:
```
python -m pip
```
means:
```
Use THIS Python
    ↓
Use its pip
    ↓
Install yt-dlp into that Python
```
This avoids a common problem where:
```
python → Python A
pip    → Python B
```
and your package gets installed into the wrong Python.

---
## Problem 4: Your YouTube downloader may need FFmpeg
Your downloader uses settings like:
```
"format": "bestvideo+bestaudio/best"
```
YouTube frequently provides:
```
video
+
audio
```
as separate files.
`yt-dlp` downloads them, but **FFmpeg merges them**.
## Solution
Install FFmpeg:
```
winget install --id Gyan.FFmpeg
```
Close PowerShell and open it again.
Check:
```
ffmpeg -version
```
If you see FFmpeg version information, it is working.
### Cause → result
Without FFmpeg:
```
best video
+
best audio
    ↓
cannot merge properly
```
With FFmpeg:
```
best video
+
best audio
    ↓
FFmpeg
    ↓
final .mp4
```

---
## Problem 5: Your downloader may need Deno for newer YouTube protection
Your script also uses:
```
"js_runtimes": {
    "deno": {}
}
```
and:
```
"remote_components": [
    "ejs:github"
]
```
That means your script expects Deno to help `yt-dlp` solve YouTube JavaScript challenges.
## Solution
Install Deno:
```
winget install DenoLand.Deno
```
Open a new PowerShell and verify:
```
deno --version
```
You should see something like:
```
deno 2.x.x
```

---
## Problem 6: You need to run the script from the correct folder
Your file is currently in:
```
C:\Users\Admin\Documents\Obsidian\Videos\Java fresher
```
PowerShell already shows:
```
PS C:\Users\Admin\Documents\Obsidian\Videos\Java fresher>
```
So you are currently in the correct directory.
## Solution
After Python and dependencies are installed, simply run:
```
python download_playlist.py
```
If you are somewhere else later, first use:
```
cd "C:\Users\Admin\Documents\Obsidian\Videos\Java fresher"
```
The quotes are important because the folder name contains a space:
```
Java fresher
```
Then:
```
python download_playlist.py
```

---
## Problem 7: Verify everything before running the real download
If something is missing, it is easier to detect it before starting the playlist.
## Solution
Run these four checks:
```
python --version
```
```
python -m yt_dlp --version
```
```
ffmpeg -version
```
```
deno --version
```
If all four work:
```
Python    ✓
yt-dlp    ✓
FFmpeg    ✓
Deno      ✓
```
then run:
```
python download_playlist.py
```

---
# Common Wrong Approaches
### Wrong approach 1: Keep running the Python file before installing Python
```
python download_playlist.py
```
will continue failing because there is no Python interpreter.
Install Python first.
### Wrong approach 2: Install Python but keep using the same old PowerShell
Windows may not refresh its `PATH`.
So after installing Python:
```
Close PowerShell
    ↓
Open new PowerShell
```
### Wrong approach 3: Install `yt-dlp` with a random `pip`
Avoid:
```
pip install yt-dlp
```
when you're unsure which Python `pip` belongs to.
Prefer:
```
python -m pip install -U "yt-dlp[default]"
```
### Wrong approach 4: Forget FFmpeg
Your Python code may run, but downloading the best video/audio can fail during merging.
So verify:
```
ffmpeg -version
```

---
# Commands You Should Run Now
Run this first:
```
winget install Python.Python.3.13
```
Then **close PowerShell and reopen it**.
Run:
```
python --version
```
Then:
```
python -m pip install -U "yt-dlp[default]"
```
Then:
```
winget install --id Gyan.FFmpeg
```
Then:
```
winget install DenoLand.Deno
```
Open PowerShell again and verify:
```
python --version
python -m yt_dlp --version
ffmpeg -version
deno --version
```
Finally:
```
cd "C:\Users\Admin\Documents\Obsidian\Videos\Java fresher"
```
and:
```
python download_playlist.py
```
# Complete Execution Flow
```
Main Problem
Python cannot run download_playlist.py
    ↓
Smaller Problem 1
Python is not installed
    ↓
Solution 1
winget install Python.Python.3.13
    ↓
Smaller Problem 2
Windows must find the new Python installation
    ↓
Solution 2
Reopen PowerShell + python --version
    ↓
Smaller Problem 3
download_playlist.py imports yt_dlp
    ↓
Solution 3
python -m pip install -U "yt-dlp[default]"
    ↓
Smaller Problem 4
Best YouTube video/audio needs merging
    ↓
Solution 4
Install FFmpeg
    ↓
Smaller Problem 5
YouTube JavaScript challenge needs a runtime
    ↓
Solution 5
Install Deno
    ↓
Smaller Problem 6
Script must run from its project folder
    ↓
Solution 6
cd "C:\Users\Admin\Documents\Obsidian\Videos\Java fresher"
    ↓
python download_playlist.py
    ↓
Complete workflow
```