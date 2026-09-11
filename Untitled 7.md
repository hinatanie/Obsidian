Yes. Before database design, APIs, or architecture, we should define the **requirements** clearly.
For this project, I would separate requirements into:
```text
Business Requirements
        ↓
User Requirements
        ↓
Functional Requirements
        ↓
Non-Functional Requirements
        ↓
MVP Scope
```
# 1. Business Requirements
The main business requirement is:
> Help a small shop owner produce enough Facebook content for **10 posts per day without hiring additional staff**.
The system should reduce:
```text
Time spent thinking of ideas
Time spent writing posts
Time spent preparing creative content
```
And increase:
```text
Posting consistency
Amount of usable content
Speed of content creation
```

---
# 2. Main User
For the first version, I recommend keeping only **one main user type**:
```text
Small Shop Owner
```
Examples:
```text
Clothing shop
Bakery
Coffee shop
Pet shop
Cosmetic shop
Online seller
Small restaurant
```
The shop owner is not necessarily a marketer.
So the application must be simple.

---
# 3. Information the System Needs
Before AI can generate good content, it needs shop information.
The user should be able to provide:
```text
Shop
├── Shop name
├── Shop description
├── Business category
├── Target customers
├── Brand tone
└── Contact information
```
And products:
```text
Product
├── Name
├── Description
├── Price
├── Images
├── Category
├── Benefits
└── Promotion
```
Other useful information can come later:
```text
Previous posts
Customer questions
Customer reviews
Campaigns
Seasonal events
```

---
# 4. Functional Requirements
These describe what the system must be able to do.
## FR-01 — Manage Shop Profile
The user can create and update shop information.
```text
Create shop profile
Edit shop profile
Define target customers
Define brand tone
```

---
## FR-02 — Manage Products
The user can:
```text
Add product
Edit product
Delete product
Upload product images
Add price
Add description
Add promotion
```

---
## FR-03 — Generate Content Ideas
The user can ask the system to generate ideas from existing shop data.
Example:
```text
Product:
Matcha cheesecake
        ↓
AI
        ↓
1. Why matcha lovers should try this cake
2. Today's matcha promotion
3. How we make our matcha cheesecake
4. Customer FAQ about storage
5. Matcha vs chocolate — which one do you prefer?
```
The user should be able to:
```text
Generate ideas
Regenerate ideas
Save ideas
Reject ideas
Select ideas
```

---
# 5. FR-04 — Generate Facebook Post
From one idea:
```text
Idea
 ↓
Generate Facebook post
```
The generated post could contain:
```text
Hook
Main content
Call to action
Hashtags
```
Example:
```text
Idea
"3 reasons customers love our cheesecake"
        ↓
Facebook Post
🍰 Why do customers keep coming back
for our cheesecake?
1. Soft texture
2. Fresh ingredients
3. Not overly sweet
Come try one today!
```
The user should also be able to:
```text
Regenerate
Edit
Save
Copy
```

---
# 6. FR-05 — Generate Image Content
For an idea, the system should generate either:
```text
Image
```
or at minimum:
```text
Image prompt / image concept
```
Example:
```text
Idea
 ↓
Image instruction
"Japanese cheesecake on a wooden table,
warm bakery lighting,
minimal background,
Facebook square format."
```
Later we can connect this to an image-generation service.

---
# 7. FR-06 — Generate Video Script
The system should generate a short-form video script.
For example:
```text
Idea
 ↓
Video Script
```
Output:
```text
0-3 seconds
Show cheesecake close-up
Voice:
"Looking for a cheesecake that isn't too sweet?"
3-8 seconds
Show cake being cut
Voice:
"Our Japanese cheesecake is soft,
light and freshly baked."
8-12 seconds
Show shop / product
CTA:
"Order yours today."
```

---
# 8. FR-07 — Daily Content Plan
This is one of the most important requirements.
The system should help the user reach:
```text
10 posts/day
```
For example:
```text
Today's Content
[1] Product introduction       ✓
[2] Promotion                  ✓
[3] Customer question          ✓
[4] Educational                ✓
[5] Behind the scenes          ✓
[6] Engagement question        ✓
[7] Product benefit            ✓
[8] Testimonial                ✓
[9] Video                      ✓
[10] Sales post                ✓
```
This prevents the system from generating 10 nearly identical sales posts.

---
# 9. FR-08 — Content Library
Generated content should not disappear.
The user needs a place like:
```text
Content Library
├── Ideas
├── Drafts
├── Generated posts
├── Images
├── Video scripts
└── Used content
```
The user should be able to search/filter content.

---
# 10. Important AI Requirement
The AI should use **shop data**, rather than generating completely generic content.
Bad:
```text
"Here are 10 marketing ideas for a bakery."
```
Better:
```text
Shop:
Happy Cake
Product:
Matcha Cheesecake
120,000 VND
Promotion:
10% off this weekend
        ↓
AI uses this exact information
        ↓
Relevant content
```
So one important requirement is:
> Generated content must be grounded in information available in the shop's data.

---
# 11. Non-Functional Requirements
We do not need many yet.
For the first version:
```text
NFR-01
The application should be easy for non-technical shop owners.
NFR-02
Content generation should normally complete within a reasonable time.
NFR-03
One shop's data must not be visible to another shop.
NFR-04
Generated content must be editable before use.
NFR-05
The system should preserve generated content.
NFR-06
Failures from the AI provider should not destroy existing user data.
```

---
# 12. What Should NOT Be in the First Version
This is very important because the project could become huge.
I recommend excluding these initially:
```text
❌ Facebook automatic posting
❌ Facebook Ads management
❌ Instagram / TikTok / YouTube publishing
❌ Analytics dashboard
❌ Competitor analysis
❌ Automatic customer replies
❌ Social listening
❌ Complex team permissions
❌ AI video generation
```
We can add them later.

---
# 13. Proposed MVP
Our **Version 1** can be:
```text
                    AI Content Assistant
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
      Shop              Products          Content
      Data                Data            Generation
                                              │
                                      ┌───────┼───────┐
                                      │       │       │
                                    Ideas   Posts   Video
                                                   Scripts
```
The essential user journey becomes:
```text
Create Shop
    ↓
Add Products
    ↓
Generate Ideas
    ↓
Choose Idea
    ↓
Generate Facebook Post
    ↓
Generate Image / Image Prompt
    ↓
Generate Video Script
    ↓
Save Content
```
And our MVP success question is very simple:
> **Can a shop owner open our application and prepare 10 useful Facebook posts for today much faster than doing everything manually?**
If the answer is yes, the MVP solves the main problem.
The next thing we should determine is the **use cases**—for example `Create Shop`, `Create Product`, `Generate Ideas`, `Generate Post`, `Generate Video Script`, etc.—because those use cases will later become the basis for our API and database design. 