# Main Problem
If you **cannot use CloudFront** for hosting the React frontend, then this design:
```
Private S3
   ↓
CloudFront
   ↓
HTTPS React website
```
must change.
A **private S3 bucket alone cannot directly host a public React website**, and S3 website endpoints do **not support HTTPS**. AWS specifically documents that S3 website endpoints are HTTP-only; CloudFront is the usual HTTPS layer in front of them.
So you need another frontend hosting method.
## Problem 1: Best alternative — AWS Amplify Hosting
## Solution
For your Pet Shop React frontend, I recommend:
```
React source
   ↓
AWS Amplify Hosting
   ↓
https://main.xxxxx.amplifyapp.com
```
You do **not need CloudFront configuration yourself**, and you do **not need your own domain**.
Amplify gives you a default HTTPS URL such as:
```
https://main.d1example.amplifyapp.com
```
AWS documents that Amplify-hosted apps receive a default `amplifyapp.com` HTTPS domain.
Your architecture becomes:
```
Browser
   ↓ HTTPS
AWS Amplify Hosting
   ↓
React frontend
   ↓ HTTPS
EC2/Nginx backend
   ↓
Spring Boot
   ↓
RDS
```
This is probably the cleanest replacement for your original Problem 14.

---
# Problem 2: Build your React app
## Solution
In your React project, configure:
```
VITE_API_BASE_URL=https://YOUR_BACKEND_ADDRESS/api/v1
```
For example, if your backend uses HTTPS on an Elastic IP:
```
VITE_API_BASE_URL=https://54.169.10.25/api/v1
```
or later:
```
VITE_API_BASE_URL=https://api.happy-pet-shop.com/api/v1
```
Then build:
```
npm install
npm run build
```
For Vite, the result normally appears in:
```
dist/
```
Remember:
```
VITE_* variables
```
are bundled into browser JavaScript.
Therefore never put:
```
database passwords
JWT secret
AWS secret access keys
private API keys
```
inside them.

---
# Problem 3: Create an Amplify app
## Solution
Open:
```
AWS Console
→ Amplify
```
Choose:
```
Create new app
```
Depending on how your code is stored, connect:
```
GitHub
GitLab
Bitbucket
AWS CodeCommit
```
or use the available manual deployment workflow if you're not connecting a repository.
For a Git repository deployment, choose the repository containing your React frontend.
Then choose the branch, for example:
```
main
```
Amplify will detect the frontend framework/build process.
For Vite the important build commands conceptually are:
```
npm ci
npm run build
```
with output directory:
```
dist
```

---
# Problem 4: Add the backend URL as an environment variable
## Solution
In Amplify:
```
App
→ Hosting
→ Environment variables
```
Add:
```
VITE_API_BASE_URL
```
with:
```
https://YOUR_BACKEND/api/v1
```
For example:
```
VITE_API_BASE_URL=https://54.169.10.25/api/v1
```
Then rebuild/redeploy.
Again, this value is public information once your React application is built.
That's fine for:
```
API base URLs
public feature flags
```
but not secrets.

---
# Problem 5: Deploy
Once Amplify finishes building, it will give you a URL similar to:
```
https://main.d123example.amplifyapp.com
```
You can use this directly without purchasing a domain. AWS confirms that this default `amplifyapp.com` domain is provided to hosted applications.
So:
```
CloudFront domain ❌
Amplify domain ✅
https://main.xxxxx.amplifyapp.com
```

---
# Problem 6: Configure React SPA routing
Your React application may have routes such as:
```
/
/products
/products/123
/cart
/login
```
The browser initially loads:
```
/products/123
```
but the actual deployed files contain only:
```
index.html
assets/...
```
Therefore Amplify needs a SPA rewrite.
In Amplify:
```
Hosting
→ Rewrites and redirects
```
Configure a fallback so application routes return:
```
/index.html
```
while real static assets continue to behave normally.
Conceptually:
```
/products/123
       ↓
index.html
       ↓
React Router
       ↓
ProductDetail page
```

---
# Problem 7: Configure Spring Boot CORS
Because your frontend and backend are now different origins:
```
Frontend:
https://main.xxxxx.amplifyapp.com
Backend:
https://YOUR_BACKEND
```
your Spring Boot backend must allow the Amplify frontend origin.
For example:
```
https://main.xxxxx.amplifyapp.com
```
Do **not** blindly use:
```
*
```
if you're using credentials/cookies or otherwise need strict origin control.
You want:
```
Amplify frontend
       ↓
CORS allowed
       ↓
Spring Boot API
```

---
# Problem 8: What happens to the S3 frontend bucket?
If you choose Amplify Hosting, you no longer need the original frontend architecture:
```
Private S3
+
CloudFront
```
for hosting your React app.
Amplify manages the hosting infrastructure behind the service for you.
So you can rewrite Problem 14 as follows:
> **Problem 14: Host React with AWS Amplify Hosting**
> 
> Create an Amplify Hosting app connected to the React frontend repository. Configure the Vite build command (`npm run build`) and `dist` output directory. Set `VITE_API_BASE_URL` to the public HTTPS backend URL. Use Amplify's default HTTPS `amplifyapp.com` domain if no custom domain is available. Configure SPA rewrites to `index.html`, configure Spring Boot CORS for the Amplify origin, and never store secrets in `VITE_*` variables.
This is the option I'd use instead of trying to make S3 itself replace CloudFront. S3 website hosting alone would force HTTP, because S3 website endpoints don't support HTTPS.