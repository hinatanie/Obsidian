PowerShell and Command Prompt are both Windows terminals, but **PowerShell is much more powerful**.
```text
+----------------------------------+
| Command Prompt                   |
|                                  |
| Older                            |
| Simple commands                  |
| Good for basic Windows tasks     |
+----------------------------------+
+----------------------------------+
| PowerShell                       |
|                                  |
| Newer                            |
| More powerful                    |
| Better for scripting/admin       |
+----------------------------------+
```
A simple comparison:
```text
+----------------------+----------------------+----------------------+
|                      | Command Prompt       | PowerShell           |
+----------------------+----------------------+----------------------+
| Prompt looks like    | C:\Users\Admin>     | PS C:\Users\Admin>   |
| List files           | dir                  | ls / dir             |
| Variables            | %PORT%               | $env:PORT            |
| Scripts              | .bat / .cmd          | .ps1                 |
| Linux-like aliases   | very few             | many                 |
| Object handling      | mostly text          | objects              |
| Automation           | basic                | strong               |
+----------------------+----------------------+----------------------+
```
For example, in **Command Prompt**:
```cmd
set PORT=6980
echo %PORT%
```
In **PowerShell**:
```powershell
$env:PORT = 6980
echo $env:PORT
```
Another important difference:
```text
+----------------------------------+
| Command Prompt                   |
|                                  |
| dir output = mostly text         |
+----------------------------------+
+----------------------------------+
| PowerShell                       |
|                                  |
| Get-ChildItem output = objects   |
|                                  |
| You can filter/sort properties   |
+----------------------------------+
```
---

**PowerShell is not Linux**, but it gives you some Linux-like command names as **aliases**.
For example:
```text
+----------------------------------+
| PowerShell command               |
|                                  |
| ls                               |
|                                  |
| really means:                    |
| Get-ChildItem                    |
+----------------------------------+
```
And:
```text
+----------------------------------+
| PowerShell command               |
|                                  |
| cat                              |
|                                  |
| really means:                    |
| Get-Content                      |
+----------------------------------+
```
So some familiar commands work:
```text
+----------------+----------------------+
| What you type  | PowerShell actually  |
+----------------+----------------------+
| ls             | Get-ChildItem        |
| cat            | Get-Content          |
| cp             | Copy-Item            |
| mv             | Move-Item            |
| rm             | Remove-Item          |
+----------------+----------------------+
```


The important difference is that PowerShell does **not implement the entire Bash/Linux language**.
For example, this is Bash syntax:
```bash
${PORT:-6980}
```
Bash understands it as:
```text
+----------------------------------+
| PORT exists?                     |
|                                  |
| yes → use PORT                   |
| no  → use 6980                   |
+----------------------------------+
```
PowerShell does not understand that syntax.
PowerShell uses its own variable syntax:
```powershell
$env:PORT
```
---

`cross-env` is missing from your project.
```text
+----------------------------------+
| package.json                     |
|                                  |
| dev script uses:                 |
| cross-env PORT=6980 ...          |
+----------------------------------+
              but
+----------------------------------+
| node_modules                     |
|                                  |
| cross-env ❌ not installed       |
+----------------------------------+
```
Install it:
```powershell
npm install -D cross-env
```
Then run:
```powershell
npm run dev
```
You can verify it exists with:
```powershell
npm list cross-env
```
You should see something like:
```text
+----------------------------------+
| aicontent-test                   |
|                                  |
| cross-env@x.x.x ✅               |
+----------------------------------+
```
Also, because your script already has:
```text
-p 6980
```
this part:
```text
cross-env PORT=6980
```
may be unnecessary unless your app reads `PORT` somewhere else.
So this simpler script would also work:
```json
"dev": "next dev -H 127.0.0.1 -p 6980"
```

---
if you want to stay in **Windows** and still type `ls`, the easiest option is to use **PowerShell**, not Command Prompt.
```text
+----------------------------------+
| Command Prompt                   |
|                                  |
| dir ✅                           |
| ls  ❌                           |
+----------------------------------+
+----------------------------------+
| PowerShell                       |
|                                  |
| dir ✅                           |
| ls  ✅                           |
+----------------------------------+
```
In PowerShell, `ls` works because it is an alias for:
```powershell
Get-ChildItem
```
So in VS Code, switch the terminal to PowerShell:
```text
+--------------------------------------+
| Ctrl + Shift + P                     |
| >terminal: select default profile    |
| Terminal                             |
|   New Terminal ▼                    |
|   PowerShell        ← choose this    |
|   Command Prompt                     |
|   Git Bash                           |
+--------------------------------------+
```
Then your prompt will look like:
```text
PS C:\Users\Admin\Documents\projects\aicontent-test>
```
Now this works:
```powershell
ls
```
You can also use Linux-like commands such as:
```powershell
ls
pwd
cp
mv
rm
cat
```
But keep in mind: PowerShell is still **Windows**, not Linux. Some Bash syntax like:
```bash
${PORT:-6980}
```
still will not work there.

---
when you run:
```cmd
wsl
```
you are **not entering Ubuntu**.
You are entering Docker Desktop’s internal Linux environment:
```text
docker-desktop:/tmp/docker-desktop-root/...
```
That is why this happens:
```text
+--------------------------------------+
| You expected                         |
|                                      |
| Ubuntu / WSL                         |
| npm installed ✅                     |
+--------------------------------------+
+--------------------------------------+
| You actually entered                 |
|                                      |
| docker-desktop                       |
| internal Docker Linux                |
| npm ❌ not installed                 |
+--------------------------------------+
```
Your prompt proves it:
```text
docker-desktop:/tmp/docker-desktop-root/...
```
That environment belongs to Docker Desktop. It is not meant to be your normal development Linux.
You need a real Linux distro like Ubuntu.
First, leave Docker’s shell:
```bash
exit
```
Then in Windows CMD run:
```cmd
wsl -l -v
```
You will probably see something like:
```text
+--------------------------------------+
| NAME              STATE    VERSION   |
|                                      |
| docker-desktop    Running     2      |
+--------------------------------------+
```
If you do **not** see Ubuntu, install it:
```cmd
wsl --install -d Ubuntu
```
Restart if Windows asks you to.
Then open Ubuntu with:
```cmd
wsl -d Ubuntu
```
Now your prompt should look more like:
```text
admin@DESKTOP:/mnt/c/Users/Admin/Documents/projects/aicontent-test$
```
not:
```text
docker-desktop:/tmp/docker-desktop-root/...
```
Then check:
```bash
node --version
npm --version
```
Important: your Windows Node/npm installation does **not automatically mean Ubuntu has Node/npm installed**.
```text
+--------------------------------------+
| Windows                              |
|                                      |
| node ✅                              |
| npm  ✅                              |
+--------------------------------------+
+--------------------------------------+
| Ubuntu WSL                           |
|                                      |
| node ?                               |
| npm  ?                               |
+--------------------------------------+
```
If Ubuntu says `npm: command not found`, install Node inside Ubuntu separately. A good way is with `nvm`:
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
```
Close and reopen Ubuntu, then:
```bash
nvm install --lts
```
Then check:
```bash
node --version
npm --version
```
So the main issue is not npm itself. You entered **`docker-desktop` WSL**, not a normal Ubuntu WSL environment.

---
Yes — you can keep using **VS Code installed on Windows**.
You do not need to install a separate Linux version of VS Code.
What changes is only the terminal/backend environment.
```text
+--------------------------------------------------+
| Windows                                          |
|                                                  |
|   +------------------------------------------+   |
|   | VS Code                                  |   |
|   | Installed normally on Windows            |   |
|   +------------------------------------------+   |
|                                                  |
|   +------------------------------------------+   |
|   | WSL Ubuntu                               |   |
|   | Linux environment                        |   |
|   +------------------------------------------+   |
+--------------------------------------------------+
```
VS Code stays Windows:
```text
+---------------------------+
| VS Code                   |
|                           |
| Windows application ✅    |
+---------------------------+
```
But the terminal inside VS Code can be Linux:
```text
+---------------------------+
| VS Code Terminal          |
|                           |
| Ubuntu / Bash ✅          |
+---------------------------+
```
So instead of:
```text
C:\Users\Admin\Documents\projects>
```
you can have:
```text
admin@DESKTOP:/mnt/c/Users/Admin/Documents/projects$
```
To do that, after installing WSL:
```text
Terminal
→ New Terminal
→ click ▼
→ Ubuntu (WSL)
```
It should look roughly like:
```text
+--------------------------------------+
| VS Code                              |
|                                      |
| Terminal ▼                           |
|   PowerShell                         |
|   Command Prompt                     |
|   Ubuntu (WSL)        ← choose this  |
+--------------------------------------+
```
Then go to your project:
```bash
cd /mnt/c/Users/Admin/Documents/projects/aicontent-test
```
Now commands like this work:
```bash
npm run dev
```
and Bash syntax like:
```bash
${PORT:-6980}
```
works too.
So the key idea is:
```text
+------------------------------------+
| VS Code application                |
|                                    |
| still Windows ✅                   |
+------------------------------------+
+------------------------------------+
| Terminal inside VS Code            |
|                                    |
| can be Ubuntu/Linux ✅             |
+------------------------------------+
```
You do **not** have to leave Windows.

---
The easiest way is to use **WSL (Windows Subsystem for Linux)** inside VS Code.
1. Install WSL
Open **PowerShell as Administrator** and run:
```powershell
wsl --install
```
Then restart Windows.
After restart, Windows usually installs Ubuntu.
```text
+----------------------------------+
| Windows                          |
|                                  |
|  +----------------------------+  |
|  | WSL                        |  |
|  |                            |  |
|  | Ubuntu Linux               |  |
|  +----------------------------+  |
+----------------------------------+
```
2. Open Ubuntu once
From Start Menu, search:
```text
Ubuntu
```
Open it.
The first time, it asks you to create:
```text
Linux username
Linux password
```
## 3. Install the VS Code WSL extension
In VS Code:
```text
+--------------------------------------+
| Extensions                           |
|                                      |
| Search: WSL                          |
|                                      |
| Install: WSL                         |
| Publisher: Microsoft                 |
+--------------------------------------+
```

In VS Code, press:
```text
Ctrl + Shift + P
```
Search:
```text
WSL: Reopen Folder in WSL
```
Then your VS Code window will run the project through Linux.
You should see something like this in the bottom-left:
```text
+------------------+
| WSL: Ubuntu      |
+------------------+
```
Now:
```text
Terminal
→ New Terminal
```
Your terminal should look more like:
```bash
nguyen@DESKTOP:~/project$
```
instead of:
```text
C:\Users\Admin\Documents\projects>
```
If your project is currently here:
```text
C:\Users\Admin\Documents\projects\aicontent-test
```
WSL can access it here:
```bash
/mnt/c/Users/Admin/Documents/projects/aicontent-test
```
So in Ubuntu:
```bash
cd /mnt/c/Users/Admin/Documents/projects/aicontent-test
```
Then your Bash syntax will work, including:
```bash
${PORT:-6980}
```
because now you are actually using Linux Bash.
```text
+-----------------------------+
| Windows CMD                 |
| ${PORT:-6980} ❌            |
+-----------------------------+
+-----------------------------+
| PowerShell                  |
| ${PORT:-6980} ❌            |
+-----------------------------+
+-----------------------------+
| WSL Ubuntu / Bash           |
| ${PORT:-6980} ✅            |
+-----------------------------+
```
For development, I recommend using **VS Code + WSL Ubuntu** rather than switching between CMD and PowerShell.

---

You can tell from your prompt:
```text
PS C:\Users\Admin\Documents\projects\aicontent-test>
```
The `PS` at the beginning means:
```text
+-----------------------------+
| PS                          |
|                             |
| = PowerShell                |
+-----------------------------+
```
For your current errors, treat your terminal as **PowerShell**.
But the problem is still the same: this syntax
```text
${PORT:-6980}
```
is **Bash/Linux syntax**. Command Prompt also does not understand it.
Your `package.json` probably has:
```json
"dev": "next dev -H 127.0.0.1 -p ${PORT:-6980}"
```
On Windows CMD, change it to:
```json
"dev": "next dev -H 127.0.0.1 -p 6980"
```
Then run:
```cmd
npm run dev
```
Visual:
```text
+------------------------------+
| Bash / Linux                 |
|                              |
| ${PORT:-6980}   ✅ works     |
+------------------------------+
+------------------------------+
| Windows Command Prompt       |
|                              |
| ${PORT:6980}   ❌ fails     |
+------------------------------+
+------------------------------+
| Simple Windows-friendly fix  |
|                              |
| -p 6980         ✅ works     |
+------------------------------+
```
If you want one script that works on Windows, macOS, and Linux, then use a cross-platform package like `cross-env` or handle the default port inside Node/Next config.

---
you have not installed the project dependencies yet.
Run:
```
npm install
```
or, if the project already has `package-lock.json`:
```
npm ci
```

---

WSL means:
```text
Windows Subsystem for Linux
```
Think of your computer like this:
```text
+--------------------------------------------------+
|                  YOUR COMPUTER                   |
|                                                  |
|  +--------------------------------------------+  |
|  | Windows                                    |  |
|  |                                            |  |
|  | VS Code                                    |  |
|  | PowerShell                                 |  |
|  | Command Prompt                             |  |
|  |                                            |  |
|  |  +--------------------------------------+  |  |
|  |  | WSL                                  |  |  |
|  |  |                                      |  |  |
|  |  | Ubuntu Linux                         |  |  |
|  |  | Bash                                 |  |  |
|  |  | Linux commands                       |  |  |
|  |  +--------------------------------------+  |  |
|  +--------------------------------------------+  |
+--------------------------------------------------+
```
So you do **not** replace Windows.
You still use:
```text
Windows
VS Code for Windows
Chrome
Docker Desktop
File Explorer
```
But inside WSL, you can also use:
```text
Ubuntu
Bash
ls
grep
apt
Linux paths
Linux scripts
```


---
If you want to install WSL
Open:
```text
Start Menu
```
Search:
```text
PowerShell
```
Right click:
```text
Run as administrator
```
You should see:
```text
+--------------------------------------+
| Administrator: Windows PowerShell    |
|                                      |
| PS C:\Windows\System32>              |
+--------------------------------------+
```
Then run:
```powershell
wsl --install
```
What Windows is doing:
```text
+--------------------------------------------------+
| Windows                                          |
|                                                  |
| installing:                                      |
|                                                  |
|  [x] WSL                                         |
|  [x] Linux kernel                                |
|  [x] Ubuntu distro                               |
|  [x] virtual machine support                     |
+--------------------------------------------------+
```
Then restart Windows.

---
WSL is not the same as Ubuntu
```text
+----------------------------------+
| WSL                              |
|                                  |
| technology/platform              |
+----------------------------------+
```
Inside WSL, you can install Linux distributions.
```text
+----------------------------------+
| WSL                              |
|                                  |
|  +----------------------------+  |
|  | Ubuntu                     |  |
|  +----------------------------+  |
|                                  |
|  +----------------------------+  |
|  | Debian                     |  |
|  +----------------------------+  |
|                                  |
|  +----------------------------+  |
|  | Kali Linux                 |  |
|  +----------------------------+  |
+----------------------------------+
```
Usually you only need:
```text
Ubuntu
```

---
Why you previously entered `docker-desktop`
Earlier you ran:
```cmd
wsl
```
and saw:
```text
docker-desktop:/...
```
That means your WSL currently had Docker's Linux environment.
Think of it like:
```text
+------------------------------------------+
| WSL                                      |
|                                          |
|  +------------------------------------+  |
|  | docker-desktop                     |  |
|  |                                    |  |
|  | used internally by Docker          |  |
|  | NOT your development Ubuntu        |  |
|  +------------------------------------+  |
+------------------------------------------+
```
What you want is:
```text
+------------------------------------------+
| WSL                                      |
|                                          |
|  +------------------------------------+  |
|  | Ubuntu                             |  |
|  |                                    |  |
|  | your development Linux            |  |
|  | Bash                               |  |
|  | npm                                |  |
|  | Node                               |  |
|  +------------------------------------+  |
+------------------------------------------+
```
You can check installed distros with:
```powershell
wsl -l -v
```
You may see:
```text
+--------------------+----------+---------+
| NAME               | STATE    | VERSION |
+--------------------+----------+---------+
| docker-desktop     | Running  | 2       |
| Ubuntu             | Stopped  | 2       |
+--------------------+----------+---------+
```
If Ubuntu is missing:
```powershell
wsl --install -d Ubuntu
```

---
First time opening Ubuntu
Search Windows Start for:
```text
Ubuntu
```
Open it.
You may see:
```text
+------------------------------------------+
| Ubuntu                                   |
|                                          |
| Installing, this may take a few minutes  |
+------------------------------------------+
```
Then:
```text
Enter new UNIX username:
```
Example:
```text
nguyen
```
Then:
```text
New password:
```
The password will not visually appear while typing.
This is normal.
```text
+------------------------------------------+
| Username: nguyen                         |
| Password: ********                       |
+------------------------------------------+
```
After that:
```text
nguyen@DESKTOP:~$
```
This means:
```text
+------------------------------------------+
| nguyen                                   |
| your Linux username                      |
+------------------------------------------+
+------------------------------------------+
| DESKTOP                                  |
| your computer name                       |
+------------------------------------------+
+------------------------------------------+
| ~                                        |
| your Linux home folder                   |
+------------------------------------------+
+------------------------------------------+
| $                                        |
| normal Linux user shell                  |
+------------------------------------------+
```

---
Install the WSL extension in VS Code
Open VS Code.
On the left:
```text
+-------------------------+
| VS Code                 |
|                         |
| 📁 Explorer             |
| 🔍 Search               |
| 🌿 Source Control       |
| 🧩 Extensions  ← click  |
+-------------------------+
```
Search:
```text
WSL
```
Look for:
```text
+--------------------------------------+
| WSL                                  |
|                                      |
| Publisher: Microsoft                 |
|                                      |
| [ Install ]                          |
+--------------------------------------+
```
Install it.

---
Open your project in WSL
Suppose your project is here in Windows:
```text
C:\Users\Admin\Documents\projects\aicontent-test
```
Windows sees it like this:
```text
+--------------------------------------+
| C:                                   |
|                                      |
| Users                                |
|  └── Admin                           |
|      └── Documents                   |
|          └── projects                |
|              └── aicontent-test      |
+--------------------------------------+
```
WSL sees the same C drive under:
```text
/mnt/c/
```
So the same project becomes:
```text
/mnt/c/Users/Admin/Documents/projects/aicontent-test
```
Visually:
```text
+--------------------------------------+
| Windows path                         |
|                                      |
| C:\Users\Admin\Documents\projects    |
+--------------------------------------+
                 same files
+--------------------------------------+
| Linux / WSL path                     |
|                                      |
| /mnt/c/Users/Admin/Documents/projects|
+--------------------------------------+
```

---
Reopen the project inside WSL
In VS Code:
```text
Ctrl + Shift + P
```
You get:
```text
+--------------------------------------+
| Command Palette                      |
|                                      |
| >                                    |
+--------------------------------------+
```
Type:
```text
WSL: Reopen Folder in WSL
```
Then VS Code reconnects.
Before:
```text
+--------------------------------------+
| VS Code                              |
|                                      |
| Windows context                      |
|                                      |
| Terminal: PowerShell                 |
+--------------------------------------+
```
After:
```text
+--------------------------------------+
| VS Code                              |
|                                      |
| WSL context                          |
|                                      |
| Terminal: Bash                       |
+--------------------------------------+
```

---

WSL can usually mount **C:, D:, E:, and other Windows drives**, not just `C:`.
```text
+--------------------------------------------------+
| Windows                                          |
|                                                  |
|   C:\  ────────────────►  /mnt/c/               |
|                                                  |
|   D:\  ────────────────►  /mnt/d/               |
|                                                  |
|   E:\  ────────────────►  /mnt/e/               |
+--------------------------------------------------+
```
So if Windows has:
```text
D:\projects\aicontent-test
```
WSL normally sees:
```bash
/mnt/d/projects/aicontent-test
```
And:
```text
E:\videos
```
becomes:
```bash
/mnt/e/videos
```
You can check mounted Windows drives inside WSL:
```bash
ls /mnt
```
You may see:
```text
+----------------------+
| /mnt                 |
|                      |
| c                    |
| d                    |
| e                    |
+----------------------+
```
Then:
```bash
cd /mnt/d
ls
```
shows the files from your Windows `D:` drive.
The important mental picture is:
```text
+-------------------------+
| Windows disks           |
|                         |
| C:\                     |
| D:\                     |
| E:\                     |
+-------------------------+
           same disks
          visible from
             WSL
+-------------------------+
| Linux paths             |
|                         |
| /mnt/c                  |
| /mnt/d                  |
| /mnt/e                  |
+-------------------------+
```
So `/mnt` is basically the place where WSL exposes your Windows drives.

---
**your project files and your installed programs are two different things**.
Your Windows files can be shared into WSL, but Windows-installed programs are not automatically Linux-installed programs.
```text
+--------------------------------------------------+
| Windows                                          |
|                                                  |
|  C:\Users\Admin\Documents\projects\aicontent-test|
|                                                  |
|  +--------------------------------------------+  |
|  | package.json                               |  |
|  | app/                                       |  |
|  | db/                                        |  |
|  | node_modules/                              |  |
|  +--------------------------------------------+  |
|                                                  |
|  C:\Program Files\nodejs\                       |
|                                                  |
|  +--------------------------------------------+  |
|  | node.exe                                   |  |
|  | npm.cmd                                    |  |
|  +--------------------------------------------+  |
+--------------------------------------------------+
```
But `node.exe` is a **Windows program**:
```text
+----------------------------------+
| Windows Node                     |
|                                  |
| node.exe                         |
|                                  |
| built for Windows                |
+----------------------------------+
```
Linux normally expects a Linux executable:
```text
+----------------------------------+
| Linux Node                       |
|                                  |
| /usr/bin/node                    |
|                                  |
| built for Linux                  |
+----------------------------------+
```
So these are not the same installation:
```text
+-----------------------------+       +-----------------------------+
| Windows                     |       | Ubuntu / WSL                |
|                             |       |                             |
| node.exe                    |       | /usr/bin/node               |
| npm.cmd                     |       | /usr/bin/npm                |
|                             |       |                             |
| Windows version             |       | Linux version               |
+-----------------------------+       +-----------------------------+
```
The key idea is:
```text
+--------------------------------------------------+
| Shared files                                     |
|                                                  |
| Windows project files  <---- visible ----> WSL   |
+--------------------------------------------------+
+--------------------------------------------------+
| Installed software                               |
|                                                  |
| Windows Node           !=          Linux Node    |
| Windows npm            !=          Linux npm     |
+--------------------------------------------------+
```
A good real-world analogy:
```text
+--------------------------------------+
| Your USB drive                       |
|                                      |
| photos                               |
| documents                            |
| source code                          |
+--------------------------------------+
```
You can plug that USB drive into two computers and both can see the files.
But:
```text
+----------------------+   +----------------------+
| Computer A           |   | Computer B           |
|                      |   |                      |
| Chrome installed ✅ |   | Chrome installed ❌ |
+----------------------+   +----------------------+
```
Seeing the same files does not mean both computers have the same programs installed.


