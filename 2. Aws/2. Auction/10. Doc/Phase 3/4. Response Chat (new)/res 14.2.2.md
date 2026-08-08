# Main Problem
The log shows exactly why Amplify failed.
Your dependencies installed successfully:
```
# Executing command: cd my-app
# Executing command: npm ci
...
# Completed phase: preBuild
```
But **Amplify never ran**:
```
npm run build
```
Notice there is no:
```
# Starting phase: build
# Executing command: npm run build
```
Instead it immediately says:
```
## Completed Frontend Build
```
and then fails with:
```
Artifact directory doesn't exist: my-app/dist
```
So this is not primarily an `npm` problem. The `dist` directory does not exist because Vite was never built.
## Problem 1: Fix your Amplify YAML
## Solution
Go back to your Amplify app:
```
AWS Amplify
→ pet-shop
→ Hosting
→ Build settings
```
Open the Amplify YAML and use this:
```
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - cd my-app
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: my-app/dist
    files:
      - '**/*'
  cache:
    paths:
      - my-app/node_modules/**/*
```
However, because `cd my-app` is done during `preBuild`, I prefer avoiding any ambiguity about the working directory.
Use this version instead:
```
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci --prefix my-app
    build:
      commands:
        - npm run build --prefix my-app
  artifacts:
    baseDirectory: my-app/dist
    files:
      - '**/*'
  cache:
    paths:
      - my-app/node_modules/**/*
```
This is cleaner for your repository structure:
```
PET-SHOP/
├── happy-cashier-screen/
├── my-app/                 ← React/Vite
│   ├── package.json
│   ├── package-lock.json
│   ├── src/
│   └── dist/               ← generated here
│
├── server/
└── README.md
```
## Problem 2: Why I prefer `--prefix my-app`
Instead of:
```
cd my-app
npm ci
npm run build
```
we explicitly tell npm:
```
npm ci --prefix my-app
npm run build --prefix my-app
```
That means:
```
Amplify remains at repository root
          ↓
npm installs using my-app/package.json
          ↓
Vite builds my-app
          ↓
my-app/dist is created
```
Then:
```
baseDirectory: my-app/dist
```
clearly points to the correct place.

---
# Problem 3: Test the exact build locally first
On your Windows computer, go to your repository root:
```
cd "C:\Users\ADMIN\Documents\dhsg\third year\sem2\java\project\pet-shop"
```
Then run:
```
npm ci --prefix my-app
```
Then:
```
npm run build --prefix my-app
```
Afterward:
```
Get-ChildItem .\my-app\dist
```
You should see something like:
```
index.html
assets
```
For example:
```
my-app/
└── dist/
    ├── index.html
    └── assets/
        ├── index-xxxxx.js
        └── index-xxxxx.css
```
If that happens locally, the Amplify configuration is correct.

---
# Problem 4: Verify your `package.json`
Inside:
```
my-app/package.json
```
you need a build script.
It should contain something like:
```
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```
The important part is:
```
"build": "vite build"
```
Without that:
```
npm run build --prefix my-app
```
cannot build your frontend.

---
# Problem 5: The 20 vulnerabilities did NOT cause this failure
This part:
```
20 vulnerabilities (1 low, 6 moderate, 13 high)
```
is worth reviewing later, but it is **not why this build failed**.
The failure is:
```
Artifact directory doesn't exist: my-app/dist
```
and the cause is:
```
npm run build never ran
```
So don't start changing random dependencies yet.

---
# Problem 6: Your next Amplify log should look different
After fixing the YAML and redeploying, you want:
```
## Starting Frontend Build
# Starting phase: preBuild
# Executing command: npm ci --prefix my-app
...
# Completed phase: preBuild
# Starting phase: build
# Executing command: npm run build --prefix my-app
```
Then Vite should print something similar to:
```
vite v...
building for production...
✓ modules transformed
dist/index.html
dist/assets/...
✓ built
```
Then:
```
# Completed phase: build
```
and finally Amplify should find:
```
my-app/dist
```
and deploy it.
Use this exact Amplify YAML:
```
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci --prefix my-app
    build:
      commands:
        - npm run build --prefix my-app
  artifacts:
    baseDirectory: my-app/dist
    files:
      - '**/*'
  cache:
    paths:
      - my-app/node_modules/**/*
```
That directly addresses the failure shown in your log.