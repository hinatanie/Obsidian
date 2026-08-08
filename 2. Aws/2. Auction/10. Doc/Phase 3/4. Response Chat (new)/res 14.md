# Main Problem
You want your React frontend to be public on the internet, but the S3 bucket itself should stay private.
The correct flow is:
```
Browser
   ↓ HTTPS
CloudFront
   ↓ authenticated origin request
Private S3 bucket
   ↓
React build files
```
Use **CloudFront Origin Access Control (OAC)** rather than making the S3 bucket public. AWS recommends OAC for private S3 origins.
## Problem 1: Build the React frontend
## Solution
On your Windows development computer, open the frontend project.
For a Vite React project, create or update:
```
.env.production
```
Example:
```
VITE_API_BASE_URL=https://api.your-domain.example/api/v1
```
Then build:
```
npm install
npm run build
```
Vite normally creates:
```
dist/
```
Check:
```
Get-ChildItem .\dist
```
You should see:
```
index.html
assets/
```
Important: anything beginning with `VITE_` becomes part of the browser bundle and is visible to users. Do not put database passwords, AWS keys, JWT secrets, or other secrets there.

---
# Problem 2: Create the private S3 bucket
## Solution
Open:
```
AWS Console
→ S3
→ Create bucket
```
Choose a globally unique name, for example:
```
pet-shop-frontend
```
Configure:
```
AWS Region: ap-southeast-1
Object Ownership: ACLs disabled / Bucket owner enforced
Block Public Access: Enabled
```
Keep all four **Block Public Access** settings enabled.
Do not enable:
```
Static website hosting
```
For this architecture, CloudFront uses the normal S3 bucket origin, not the S3 website endpoint. OAC does not work with an S3 website endpoint.
Create the bucket.
Your S3 configuration should effectively be:
```
pet-shop-frontend-...
├── Public access: BLOCKED
├── ACLs: disabled
└── CloudFront will be granted private access
```

---
# Problem 3: Upload the React build
## Solution
Open:
```
S3
→ pet-shop-frontend-...
→ Upload
```
Upload the **contents of `dist`**, not the `dist` directory itself.
Correct S3 structure:
```
index.html
assets/
    index-abc123.js
    index-def456.css
```
Wrong:
```
dist/
    index.html
    assets/
```
CloudFront will later look for:
```
/index.html
```
at the bucket root.

---
# Problem 4: Create the CloudFront distribution
## Solution
Open:
```
AWS Console
→ CloudFront
→ Create distribution
```
Under **Origin**, select your S3 bucket:
```
pet-shop-frontend
```
Make sure you select the normal S3 bucket origin similar to:
```
pet-shop-frontend-....s3.ap-southeast-1.amazonaws.com
```
Do not select an endpoint containing:
```
s3-website
```

---
# Problem 5: Configure Origin Access Control
## Solution
For **Origin access**, choose:
```
Origin access control settings
```
Then:
```
Create new OAC
```
Use a name such as:
```
pet-shop-frontend-oac
```
For signing behavior, use the recommended option where CloudFront signs requests to S3.
CloudFront OAC allows the S3 bucket to remain private while CloudFront retrieves objects using signed requests.
CloudFront may offer to update the S3 bucket policy automatically. If it does, allow it.
Otherwise, CloudFront will show you a bucket policy you need to copy into:
```
S3
→ Bucket
→ Permissions
→ Bucket policy
```
The policy should grant only your CloudFront distribution permission similar to:
```
s3:GetObject
```
on:
```
arn:aws:s3:::pet-shop-frontend-.../*
```
Do not add:
```
Principal: "*"
```
to make the bucket public.

---
# Problem 6: Configure HTTPS behavior
## Solution
Under the default cache behavior configure:
```
Viewer protocol policy:
Redirect HTTP to HTTPS
```
That means:
```
http://...
      ↓ 301
https://...
```
AWS documents `Redirect HTTP to HTTPS` as the CloudFront behavior that redirects viewer GET/HEAD requests to HTTPS.
For allowed HTTP methods, a static React site normally needs only:
```
GET
HEAD
```
You usually do not need:
```
POST
PUT
PATCH
DELETE
```
for the frontend S3 origin.
Your React application will make API requests separately to your backend API.

---
# Problem 7: Configure the default root object
## Solution
Find:
```
Default root object
```
Set:
```
index.html
```
Do not write:
```
/index.html
```
Use:
```
index.html
```
This means when somebody opens:
```
https://d123example.cloudfront.net/
```
CloudFront serves:
```
/index.html
```

---
# Problem 8: Enable compression
## Solution
In the default behavior, enable:
```
Compress objects automatically: Yes
```
This allows CloudFront to serve compressed JavaScript, CSS, HTML, and other compressible resources where supported.
For a React frontend, that reduces transferred data.

---
# Problem 9: Create the distribution
## Solution
Select:
```
Create distribution
```
CloudFront provisioning takes some time.
Wait until the distribution status indicates it is deployed.
You will receive a domain similar to:
```
d3abc123xyz.cloudfront.net
```
Open:
```
https://d3abc123xyz.cloudfront.net
```
Your React page should load.
At this point:
```
Internet
   ↓
CloudFront
   ↓ OAC
Private S3
```
is working.

---
# Problem 10: Handle React Router correctly
## Solution
This part is important.
Suppose React has routes:
```
/
/products
/cart
/orders/123
```
When you navigate inside React:
```
/ → /products
```
it works because React Router handles it in the browser.
But if you directly refresh:
```
https://d3abc123xyz.cloudfront.net/products
```
CloudFront asks S3 for an object called:
```
products
```
That object does not exist.
With a private S3 REST origin, missing objects can appear as `403` as well as `404`, depending on access conditions. AWS explicitly notes that nonexistent S3-origin objects can produce CloudFront 403 responses.
You therefore need an SPA fallback.

---
# Problem 11: Configure the simple SPA fallback
## Solution
Open:
```
CloudFront
→ Distributions
→ Your distribution
→ Error pages
→ Create custom error response
```
Create one for:
```
HTTP error code: 403
Customize error response: Yes
Response page path: /index.html
HTTP response code: 200
Error caching minimum TTL: 0
```
Then create another:
```
HTTP error code: 404
Customize error response: Yes
Response page path: /index.html
HTTP response code: 200
Error caching minimum TTL: 0
```
CloudFront supports configuring a custom response page and replacing the returned response status.
Now:
```
/products
      ↓
S3 cannot find object "products"
      ↓
CloudFront fallback
      ↓
/index.html
      ↓
React Router sees /products
      ↓
Products page
```

---
# Problem 12: Understand the limitation of the simple fallback
## Solution
There is an important downside.
Suppose this asset does not exist:
```
/assets/missing-file.js
```
A blanket:
```
403 → /index.html
404 → /index.html
```
can cause CloudFront to return `index.html` instead of a genuine missing-file error.
That is exactly what your requirement means by:
> fallback without hiding real missing asset errors.
For a learning deployment, the custom-error fallback above is easy and commonly used.
For a cleaner production setup, use a **CloudFront Function** that rewrites only route-like URLs to `index.html`.
For example conceptually:
```
/products
/orders/123
/cart
       ↓
rewrite to /index.html
```
but:
```
/assets/index-123.js
/assets/logo.png
/favicon.ico
```
remain unchanged.
That way a genuinely missing asset can still return:
```
404 / 403
```
instead of silently returning HTML.
So your better final design is:
```
Request has a file extension
→ don't rewrite
Request looks like React route
→ rewrite to /index.html
```
You can start with CloudFront custom errors, then improve to a CloudFront Function once the basic deployment works.

---
# Problem 13: Configure caching for `index.html`
## Solution
`index.html` should not be cached for a long period.
Why?
A new deployment may produce:
```
Old:
index-abc123.js
New:
index-xyz789.js
```
The new `index.html` points to:
```
index-xyz789.js
```
If a browser or CDN retains the old HTML for a long time, users may continue loading an old frontend version.
A suitable header is:
```
Cache-Control: no-cache
```
or a short cache lifetime.
When uploading `index.html`, set metadata such as:
```
Cache-Control: no-cache
```

---
# Problem 14: Configure caching for hashed assets
## Solution
Vite normally generates hashed files such as:
```
assets/index-C1x93abc.js
assets/index-A7f92xyz.css
```
When their content changes, their filename changes.
Therefore they can safely use long caching:
```
Cache-Control: public,max-age=31536000,immutable
```
Meaning:
```
31536000 seconds = 1 year
```
The strategy becomes:
```
index.html
→ no-cache / short cache
assets/index-C1x93abc.js
→ 1 year immutable
assets/index-A7f92xyz.css
→ 1 year immutable
```

---
# Problem 15: Deploy with AWS CLI more cleanly later
## Solution
Once AWS CLI is configured, you can deploy in two passes.
First upload hashed assets:
```
aws s3 sync .\dist\assets `
  s3://YOUR_BUCKET/assets `
  --cache-control "public,max-age=31536000,immutable"
```
Then upload the rest:
```
aws s3 sync .\dist `
  s3://YOUR_BUCKET `
  --exclude "assets/*" `
  --cache-control "no-cache" `
  --delete
```
This gives:
```
assets/* → long cache
index.html → no-cache
```
Be careful with:
```
--delete
```
because it removes S3 objects not present in the local build. That is useful for deployment buckets, but confirm the bucket is dedicated exclusively to this frontend.

---
# Problem 16: Invalidate CloudFront after deployment
## Solution
When `index.html` changes, CloudFront may still have the previous version cached.
You can create an invalidation:
```
CloudFront
→ Your distribution
→ Invalidations
→ Create invalidation
```
Use:
```
/index.html
```
You can invalidate:
```
/*
```
but invalidating only `index.html` is usually more efficient when assets are hashed.
With correct cache headers, invalidations become less important.

---
# Problem 17: Configure the frontend API URL
## Solution
In your React frontend:
```
.env.production
```
use:
```
VITE_API_BASE_URL=https://api.your-domain.example/api/v1
```
Your code might access it with:
```
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
```
Remember that Vite embeds `VITE_*` values into client-side files. They are not secrets.
Safe:
```
VITE_API_BASE_URL=https://api.example.com/api/v1
```
Not safe:
```
VITE_DB_PASSWORD=...
VITE_JWT_SECRET=...
VITE_AWS_SECRET_ACCESS_KEY=...
```

---
# Problem 18: Your API must allow the CloudFront frontend origin
## Solution
Eventually your frontend will be served from something like:
```
https://d3abc123xyz.cloudfront.net
```
while your API is:
```
https://api.your-domain.example
```
These are different origins.
Therefore Spring Boot CORS must allow the frontend origin.
For your first test:
```
Allowed origin:
https://d3abc123xyz.cloudfront.net
```
Later, when you add your own frontend domain:
```
https://www.your-domain.example
```
allow that instead.
Do not simply use:
```
*
```
when your authentication uses credentials/cookies.

---
# Problem 19: Test that S3 is really private
## Solution
After CloudFront works, try opening an S3 object URL directly.
For example:
```
https://YOUR_BUCKET.s3.ap-southeast-1.amazonaws.com/index.html
```
It should **not** publicly serve the site.
You should receive an access-denied response.
But:
```
https://YOUR_CLOUDFRONT_DOMAIN/index.html
```
should work.
That confirms:
```
Direct user → S3     ❌
User → CloudFront
          ↓ OAC
         S3          ✅
```

---
# Recommended final architecture
```
React source
   ↓
npm run build
   ↓
dist/
   ↓
Private S3 bucket
   ↑
CloudFront OAC
   ↑
CloudFront HTTPS
   ↑
Browser
```
API traffic remains separate:
```
React browser
   ↓ HTTPS
api.your-domain.example
   ↓
Nginx
   ↓
127.0.0.1:8080
   ↓
Spring Boot
   ↓
RDS
```
## Do these tasks in order
```
[ ] Create .env.production with VITE_API_BASE_URL
[ ] Run npm run build
[ ] Confirm dist/index.html and dist/assets exist
[ ] Create globally unique S3 bucket
[ ] Keep S3 Block Public Access enabled
[ ] Do not enable S3 static website hosting
[ ] Upload contents of dist to bucket root
[ ] Create CloudFront distribution
[ ] Select private S3 bucket as origin
[ ] Create/use OAC
[ ] Allow CloudFront to update the bucket policy
[ ] Redirect HTTP to HTTPS
[ ] Enable compression
[ ] Set default root object to index.html
[ ] Test CloudFront root URL
[ ] Add React SPA routing fallback
[ ] Prefer route rewriting later so missing assets stay real errors
[ ] Set index.html to no-cache/short cache
[ ] Set hashed assets to long immutable cache
[ ] Configure Spring Boot CORS for the CloudFront frontend
[ ] Confirm direct S3 access is denied
```
For your first pass, I would get **S3 + CloudFront + OAC + `index.html` loading successfully first**, and only then add the React Router fallback and advanced caching.