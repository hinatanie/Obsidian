Think of **BIOS** as a very small program built into the computer itself.
```text
+--------------------------------------------------+
|                  COMPUTER                        |
|                                                  |
|   +------------------------------------------+   |
|   |              Motherboard                 |   |
|   |                                          |   |
|   |   +------------------------------+       |   |
|   |   | BIOS / UEFI chip             |       |   |
|   |   |                              |       |   |
|   |   | Small built-in software      |       |   |
|   |   +------------------------------+       |   |
|   |                                          |   |
|   +------------------------------------------+   |
+--------------------------------------------------+
```
BIOS is a program and it exists before Windows starts.
```text
+-------------------------+
| BIOS / UEFI             |
|                         |
| Built into motherboard  |
+-------------------------+
             separate from
+-------------------------+
| Windows                 |
|                         |
| Installed on SSD/HDD    |
+-------------------------+
```
when you press the power button? At first, Windows is not running yet.
```text
+--------------------------------------------------+
| You press POWER                                  |
+--------------------------------------------------+
        computer wakes up
+--------------------------------------------------+
| BIOS / UEFI starts first                         |
|                                                  |
| It checks important hardware:                    |
|                                                  |
|   +----------+   +----------+   +------------+   |
|   |   CPU    |   |   RAM    |   | SSD / HDD  |   |
|   +----------+   +----------+   +------------+   |
|                                                  |
|   +----------+   +--------------------------+    |
|   | Keyboard |   | Other hardware           |    |
|   +----------+   +--------------------------+    |
+--------------------------------------------------+
        after hardware is ready
+--------------------------------------------------+
| BIOS finds Windows on the SSD                    |
+--------------------------------------------------+
        then
+--------------------------------------------------+
| Windows starts                                   |
+--------------------------------------------------+
```

hardware features are controlled there.
```text
+--------------------------------------------------+
| BIOS / UEFI settings                             |
|                                                  |
|   Virtualization                                 |
|                                                  |
|   [ Enabled  ]  ✅                               |
|   [ Disabled ]                                   |
+--------------------------------------------------+
```
Docker needs virtualization.
If BIOS has:
```text
+----------------------------------+
| Virtualization: Enabled ✅       |
+----------------------------------+
```
Windows can use things such as:
```text
+----------------------------------+
| Windows                          |
|                                  |
|  WSL 2                           |
|  Hyper-V                         |
|  Virtual Machine Platform        |
+----------------------------------+
```
And Docker can use them.
```text
+--------------------------------------------------+
|                  Your PC                         |
|                                                  |
|   +------------------------------------------+   |
|   | BIOS                                     |   |
|   | Virtualization: Enabled ✅               |   |
|   +------------------------------------------+   |
|                                                  |
|   +------------------------------------------+   |
|   | Windows                                  |   |
|   | WSL 2 / Hypervisor                      |   |
|   +------------------------------------------+   |
|                                                  |
|   +------------------------------------------+   |
|   | Docker Desktop                           |   |
|   +------------------------------------------+   |
+--------------------------------------------------+
```
The most important thing to remember is:
```text
+------------------------------------------+
| BIOS                                     |
|                                          |
| Small software inside motherboard        |
| BIOS and UEFI Starts before Windows      |
| Prepares hardware                        |
| Controls low-level hardware settings     |
+------------------------------------------+
```

The **motherboard** is the main board inside your computer.
Most important parts connect to it.
```text
+--------------------------------------------------+
|                  MOTHERBOARD                     |
|                                                  |
|   +----------+        +----------------------+   |
|   |   CPU    |        |        RAM           |   |
|   +----------+        +----------------------+   |
|                                                  |
|   +------------------------------------------+   |
|   |              SSD / Storage               |   |
|   +------------------------------------------+   |
|                                                  |
|   +-------------+      +--------------------+    |
|   | UEFI chip   |      | GPU / other cards  |    |
|   +-------------+      +--------------------+    |
|                                                  |
+--------------------------------------------------+
```
You can think of it like a **big connection board**:
```text
           +------+
           | CPU  |
           +------+
               |
+------+   +-----------+   +------+
| RAM  |---|Motherboard|---| SSD  |
+------+   +-----------+   +------+
               |
          +----------+
          | UEFI     |
          +----------+
```
Without the motherboard, the CPU, RAM, SSD, and other parts cannot properly communicate.

---

**UEFI** is the modern replacement for the old BIOS system.
The UEFI firmware is stored in a small memory chip on the motherboard.
```text
+--------------------------------------------------+
| Motherboard                                      |
|                                                  |
|   +------------------------------------------+   |
|   | UEFI firmware chip                       |   |
|   |                                          |   |
|   | Stores startup software                  |   |
|   | Starts before Windows                    |   |
|   +------------------------------------------+   |
+--------------------------------------------------+
```
So:
```text
Motherboard
= physical board
UEFI chip
= small memory chip on that board
UEFI firmware
= software stored inside that chip
```
A useful picture:
```text
+-----------------------------------+
| Motherboard                       |
|                                   |
|     +----------------------+      |
|     | UEFI chip            |      |
|     |                      |      |
|     | contains             |      |
|     | UEFI firmware        |      |
|     +----------------------+      |
|                                   |
+-----------------------------------+
```

---

When you press the power button, UEFI first checks important hardware.
```text
+--------------------------------------------------+
|                POST CHECK                        |
|                                                  |
|   CPU       ✅                                   |
|   RAM       ✅                                   |
|   Keyboard  ✅                                   |
|   Storage   ✅                                   |
|                                                  |
| Everything important is working                  |
+--------------------------------------------------+
```
If something is wrong:
```text
+---------------------------+
| RAM problem ❌            |
|                           |
| Computer may beep         |
| or show an error          |
+---------------------------+
```

Your Windows installation is usually on your SSD.
```text
+----------------------------------+
| SSD                              |
|                                  |
|   +--------------------------+   |
|   | Windows                  |   |
|   |                          |   |
|   | Windows boot files       |   |
|   +--------------------------+   |
+----------------------------------+
```
UEFI looks for the boot information:
```text
+--------------------+
| UEFI               |
|                    |
| Where is Windows?  |
+--------------------+
          finds
+--------------------+
| SSD                |
|                    |
| Windows bootloader |
+--------------------+
```
Then the Windows bootloader starts loading Windows.
The most important detail is that Windows must be loaded into **RAM** before the CPU can properly run it:
```text
SSD
+--------------------+
| Windows files      |
+--------------------+
        copied/loaded into
RAM
+--------------------+
| Windows code/data  |
| currently running  |
+--------------------+
        used by
CPU
+--------------------+
| executes Windows   |
+--------------------+
```
So when you turn on your computer, you can picture the machine like this:
```text
+--------------------------------------------------+
|                COMPUTER STARTUP                  |
|                                                  |
|   UEFI chip                                      |
|   +------------------------------------------+   |
|   | checks CPU, RAM, SSD                     |   |
|   | prepares hardware                        |   |
|   | finds Windows                            |   |
|   +------------------------------------------+   |
|                                                  |
|   SSD                                            |
|   +------------------------------------------+   |
|   | Windows files                            |   |
|   +------------------------------------------+   |
|                                                  |
|   RAM                                            |
|   +------------------------------------------+   |
|   | Windows loaded here                      |   |
|   +------------------------------------------+   |
|                                                  |
|   CPU                                            |
|   +------------------------------------------+   |
|   | executes Windows                         |   |
|   +------------------------------------------+   |
+--------------------------------------------------+
```
The key idea is:
```text
Motherboard = main physical board
UEFI chip = stores startup firmware
POST = checks hardware
Hardware initialization = prepares hardware
Bootstrap loader = finds Windows and starts loading it
```