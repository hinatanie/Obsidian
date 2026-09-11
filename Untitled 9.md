I’d structure this as a **PostgreSQL relational database**. This design supports system admins, business owners, staff, AI profile generation, content recommendations, content series, scheduling, social channels, competitor monitoring, subscriptions, logs, and email notifications.
A few assumptions I used: requirement **#14 duplicates #13**, `Confirm Password` is not stored, and for requirement **#20** I use `NOT_SCHEDULED` as the default content status.
## Main relationships
```text
users
 ├── system admins
 └── business_members
       ├── business OWNER
       └── business STAFF
businesses
 ├── products_services
 ├── customer_personas
 ├── customer_insights
 ├── content_pillars
 ├── brand_guidelines
 │     └── prohibited_expressions
 ├── business_profile_completeness
 ├── ai_profile_generations
 ├── content_ideas
 │     └── content_series_items
 │            ├── content_series
 │            └── content_schedule_items
 ├── events_trends
 ├── social_channels
 │     └── channel_posts
 ├── subscriptions
 ├── activity_logs
 └── notifications
```
### 1. Users
One table stores admins, owners, and staff. Whether someone is an owner/staff member is determined through `business_members`.
```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TYPE system_role AS ENUM (
    'USER',
    'ADMIN'
);
CREATE TYPE user_status AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'DELETED'
);
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(30) UNIQUE,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(255),
    date_of_birth DATE,
    avatar_url TEXT,
    system_role system_role NOT NULL DEFAULT 'USER',
    status user_status NOT NULL DEFAULT 'ACTIVE',
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
```
Do **not** add:
```text
confirm_password
```
because it is only frontend/backend validation during registration.

---
# 2. Businesses / Stores
Admins can create, view, edit, and delete businesses.
```sql
CREATE TYPE business_status AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'DELETED'
);
CREATE TABLE businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    phone VARCHAR(30),
    email VARCHAR(255),
    address TEXT,
    logo_url TEXT,
    status business_status NOT NULL DEFAULT 'ACTIVE',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
```

---
# 3. Business owners and staff
This separates system users from their role inside a business.
```sql
CREATE TYPE business_member_role AS ENUM (
    'OWNER',
    'STAFF'
);
CREATE TYPE membership_status AS ENUM (
    'ACTIVE',
    'INACTIVE'
);
CREATE TABLE business_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL
        REFERENCES businesses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL
        REFERENCES users(id),
    role business_member_role NOT NULL,
    status membership_status NOT NULL DEFAULT 'ACTIVE',
    created_by UUID REFERENCES users(id),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deactivated_at TIMESTAMPTZ,
    UNIQUE (business_id, user_id)
);
```
For example:
```text
John
 └── Business A
      role = OWNER
Anna
 └── Business A
      role = STAFF
```
Admins don't need to belong to a business:
```text
users.system_role = ADMIN
```

---
# 4. Products / Services
Supports requirement #3.
```sql
CREATE TYPE offering_type AS ENUM (
    'PRODUCT',
    'SERVICE'
);
CREATE TABLE products_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL
        REFERENCES businesses(id) ON DELETE CASCADE,
    type offering_type NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price NUMERIC(12,2),
    currency VARCHAR(10),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
```

---
# 5. Customer personas
Requirements #4, #9 and #10.
```sql
CREATE TABLE customer_personas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL
        REFERENCES businesses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    age_range VARCHAR(100),
    gender VARCHAR(100),
    location TEXT,
    occupation TEXT,
    goals TEXT,
    pain_points TEXT,
    behaviors TEXT,
    interests TEXT,
    additional_data JSONB DEFAULT '{}'::jsonb,
    ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
```
Using `JSONB` for additional attributes gives AI some flexibility without requiring a schema migration every time you introduce another persona characteristic.

---
# 6. Customer insights
Requirements #5, #9 and #10.
```sql
CREATE TABLE customer_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL
        REFERENCES businesses(id) ON DELETE CASCADE,
    title VARCHAR(255),
    insight TEXT NOT NULL,
    category VARCHAR(100),
    ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
```
Examples:
```text
Customer wants fast service
Customer cares more about convenience than price
Customers usually buy after seeing real customer reviews
```

---
# 7. Content pillars
Requirements #6, #9 and #10.
```sql
CREATE TABLE content_pillars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL
        REFERENCES businesses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    purpose TEXT,
    example_topics JSONB DEFAULT '[]'::jsonb,
    ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
```
For example:
```text
Educational Content
Promotional Content
Customer Stories
Behind the Scenes
Entertainment
```

---
# 8. Brand tone of voice
Requirement #7.
```sql
CREATE TABLE brand_guidelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL UNIQUE
        REFERENCES businesses(id) ON DELETE CASCADE,
    tone_of_voice TEXT,
    writing_style TEXT,
    preferred_words JSONB DEFAULT '[]'::jsonb,
    ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```
### Prohibited topics / expressions
```sql
CREATE TABLE prohibited_expressions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL
        REFERENCES businesses(id) ON DELETE CASCADE,
    expression TEXT NOT NULL,
    reason TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```
Examples:
```text
Do not mention competitors directly.
Do not use offensive language.
Do not make medical claims.
```

---
# 9. AI profile completion
This supports requirement #8.
Your five areas can be considered:
```text
1. Products / Services
2. Customer Personas
3. Customer Insights
4. Content Pillars
5. Brand Guidelines
```
```sql
CREATE TABLE business_profile_completeness (
    business_id UUID PRIMARY KEY
        REFERENCES businesses(id) ON DELETE CASCADE,
    products_services_score NUMERIC(5,2) NOT NULL DEFAULT 0,
    personas_score NUMERIC(5,2) NOT NULL DEFAULT 0,
    insights_score NUMERIC(5,2) NOT NULL DEFAULT 0,
    pillars_score NUMERIC(5,2) NOT NULL DEFAULT 0,
    brand_guidelines_score NUMERIC(5,2) NOT NULL DEFAULT 0,
    overall_score NUMERIC(5,2) NOT NULL DEFAULT 0,
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```
For example:
```text
Products / Services     100%
Customer Personas        80%
Insights                 60%
Content Pillars         100%
Brand Voice              70%
Overall                   82%
```

---
# 10. AI profile generation
Supports requirement #9.
The business owner enters something like:
```text
I own a coffee shop in Ho Chi Minh City targeting university
students aged 18-25. We focus on affordable specialty coffee...
```
The AI generates the five profile areas.
```sql
CREATE TYPE ai_job_status AS ENUM (
    'PENDING',
    'PROCESSING',
    'COMPLETED',
    'FAILED'
);
CREATE TABLE ai_profile_generations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL
        REFERENCES businesses(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL
        REFERENCES users(id),
    input_text TEXT NOT NULL,
    generated_result JSONB,
    status ai_job_status NOT NULL DEFAULT 'PENDING',
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);
```

---
# 11. AI recommended content ideas
Requirements #11–13.
```sql
CREATE TABLE content_ideas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL
        REFERENCES businesses(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    hook TEXT,
    content_body TEXT,
    call_to_action TEXT,
    content_type VARCHAR(100),
    platform VARCHAR(100),
    content_pillar_id UUID
        REFERENCES content_pillars(id),
    recommendation_date DATE,
    ai_score NUMERIC(5,2),
    ai_reason TEXT,
    is_ai_generated BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```
`ai_score` allows:
```text
Idea A     96%
Idea B     89%
Idea C     82%
```
So you can:
```sql
ORDER BY ai_score DESC
```
to implement the **Top AI Ranking**.

---
# 12. Content idea tags
This is useful for filtering recommendation results.
```sql
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID
        REFERENCES businesses(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL
);
```
```sql
CREATE TABLE content_idea_tags (
    content_idea_id UUID NOT NULL
        REFERENCES content_ideas(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL
        REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (content_idea_id, tag_id)
);
```
You can filter by things such as:
```text
Facebook
TikTok
Instagram
Promotion
Educational
Trending
Video
Image
High AI Score
```

---
# 13. Content series
Requirements #13–17.
```sql
CREATE TABLE content_series (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL
        REFERENCES businesses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by UUID NOT NULL
        REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
```

---
# 14. Ideas inside a content series
I recommend copying the idea information into the series item.
Why?
Suppose AI recommends:
```text
"5 Coffee Tips for Students"
```
The employee adds it to a content series and changes it to:
```text
"5 Coffee Tips Every University Student Should Know"
```
You probably **don't want this edit to modify the original AI recommendation**.
Therefore:
```sql
CREATE TYPE content_status AS ENUM (
    'NOT_SCHEDULED',
    'SCHEDULED',
    'COMPLETED',
    'NOT_COMPLETED',
    'PUBLISHED'
);
CREATE TABLE content_series_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    series_id UUID NOT NULL
        REFERENCES content_series(id) ON DELETE CASCADE,
    source_idea_id UUID
        REFERENCES content_ideas(id) ON DELETE SET NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    hook TEXT,
    content_body TEXT,
    call_to_action TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    status content_status NOT NULL DEFAULT 'NOT_SCHEDULED',
    assigned_to UUID
        REFERENCES users(id),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
```
This covers:
```text
View
Add
Edit
Delete
Assign
Update status
```

---
# 15. Publishing schedule settings
Requirement #18 says users can specify:
```text
How many contents each day?
Which days should have content?
```
I'd have a schedule configuration:
```sql
CREATE TABLE publishing_schedule_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL
        REFERENCES businesses(id) ON DELETE CASCADE,
    posts_per_day INTEGER NOT NULL DEFAULT 1,
    monday BOOLEAN DEFAULT TRUE,
    tuesday BOOLEAN DEFAULT TRUE,
    wednesday BOOLEAN DEFAULT TRUE,
    thursday BOOLEAN DEFAULT TRUE,
    friday BOOLEAN DEFAULT TRUE,
    saturday BOOLEAN DEFAULT FALSE,
    sunday BOOLEAN DEFAULT FALSE,
    timezone VARCHAR(100) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---
# 16. Scheduled content
```sql
CREATE TABLE content_schedule_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL
        REFERENCES businesses(id) ON DELETE CASCADE,
    series_item_id UUID NOT NULL
        REFERENCES content_series_items(id) ON DELETE CASCADE,
    scheduled_at TIMESTAMPTZ NOT NULL,
    assigned_to UUID
        REFERENCES users(id),
    created_by UUID
        REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
```
Example:
```text
Sep 5
  09:00 → Content A
  18:00 → Content B
Sep 6
  10:00 → Content C
```

---
# 17. Events and trends
Requirement #21.
```sql
CREATE TYPE event_trend_type AS ENUM (
    'EVENT',
    'TREND'
);
CREATE TABLE events_trends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL
        REFERENCES businesses(id) ON DELETE CASCADE,
    type event_trend_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    source_url TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
```
Examples:
```text
EVENT
Valentine's Day
Tet Holiday
Business Anniversary
TREND
TikTok trend
Trending audio
Viral topic
```

---
# 18. Social / content channels
Requirements #22 and #24 can use the same table.
```sql
CREATE TYPE channel_scope AS ENUM (
    'OWN',
    'COMPETITOR'
);
CREATE TYPE social_platform AS ENUM (
    'FACEBOOK',
    'INSTAGRAM',
    'TIKTOK',
    'YOUTUBE',
    'X',
    'LINKEDIN',
    'OTHER'
);
CREATE TABLE social_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL
        REFERENCES businesses(id) ON DELETE CASCADE,
    scope channel_scope NOT NULL,
    platform social_platform NOT NULL,
    channel_name VARCHAR(255),
    channel_url TEXT NOT NULL,
    competitor_name VARCHAR(255),
    external_channel_id VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_synced_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```
For your shop:
```text
scope = OWN
```
For a competitor:
```text
scope = COMPETITOR
```

---
# 19. Imported social content
Requirements #23 and #25.
```sql
CREATE TABLE channel_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL
        REFERENCES social_channels(id) ON DELETE CASCADE,
    external_post_id VARCHAR(255),
    post_url TEXT,
    caption TEXT,
    media_type VARCHAR(100),
    media_urls JSONB DEFAULT '[]'::jsonb,
    published_at TIMESTAMPTZ,
    views BIGINT,
    likes BIGINT,
    comments BIGINT,
    shares BIGINT,
    raw_data JSONB,
    imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (channel_id, external_post_id)
);
```
This is particularly useful because later AI can analyze:
```text
Your best-performing posts
Competitor posts
Views
Likes
Comments
Shares
Publishing time
Content style
```

---
# 20. Subscription plans
Requirements #26 and #27.
Don't create separate monthly and yearly subscription tables.
Instead:
```sql
CREATE TYPE billing_period AS ENUM (
    'MONTHLY',
    'YEARLY'
);
CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    billing_period billing_period NOT NULL,
    price NUMERIC(12,2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    max_staff INTEGER,
    max_channels INTEGER,
    max_ai_generations INTEGER,
    features JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```
For example:
```text
Pro Monthly
$20/month
Pro Yearly
$200/year
```

---
# 21. Business subscriptions
```sql
CREATE TYPE subscription_status AS ENUM (
    'TRIAL',
    'ACTIVE',
    'PAST_DUE',
    'CANCELLED',
    'EXPIRED'
);
CREATE TABLE business_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL
        REFERENCES businesses(id),
    plan_id UUID NOT NULL
        REFERENCES subscription_plans(id),
    status subscription_status NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ,
    auto_renew BOOLEAN NOT NULL DEFAULT TRUE,
    payment_provider VARCHAR(100),
    external_subscription_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---
# 22. Employee activity logs
Requirement #34.
This is important for your system.
```sql
CREATE TABLE activity_logs (
    id BIGSERIAL PRIMARY KEY,
    business_id UUID
        REFERENCES businesses(id),
    user_id UUID
        REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```
For example:
```text
Anna
EDIT_CONTENT
content_series_item
10:32 AM
Anna
CHANGE_CONTENT_STATUS
NOT_SCHEDULED → COMPLETED
11:04 AM
Anna
DELETE_CONTENT
2:35 PM
```
The business owner can see these records.

---
# 23. Notifications
Requirement #35.
```sql
CREATE TYPE notification_type AS ENUM (
    'AI_CONTENT_READY',
    'CONTENT_ASSIGNED',
    'CONTENT_SCHEDULED',
    'SYSTEM'
);
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,
    business_id UUID
        REFERENCES businesses(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at TIMESTAMPTZ
);
```

---
# 24. Email notification queue
I'd keep email delivery separately from UI notifications.
```sql
CREATE TYPE email_status AS ENUM (
    'PENDING',
    'SENDING',
    'SENT',
    'FAILED'
);
CREATE TABLE email_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID
        REFERENCES users(id),
    recipient_email VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    body TEXT NOT NULL,
    status email_status NOT NULL DEFAULT 'PENDING',
    retry_count INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ
);
```
When daily AI generation finishes:
```text
AI generation completed
        ↓
Find active business employees
        ↓
notifications
        +
email_queue
        ↓
Send email
```

---
# Recommended final database structure
Your main database would therefore contain roughly these tables:

|Table|Purpose|
|---|---|
|`users`|Admin, owner and staff accounts|
|`businesses`|Stores/businesses|
|`business_members`|Connect users to businesses|
|`products_services`|Products and services|
|`customer_personas`|Target customers|
|`customer_insights`|Customer insights|
|`content_pillars`|Content strategy pillars|
|`brand_guidelines`|Brand voice|
|`prohibited_expressions`|Forbidden topics/words|
|`business_profile_completeness`|AI completion percentage|
|`ai_profile_generations`|AI-generated business profiles|
|`content_ideas`|Daily AI recommendations|
|`tags`|Content filters|
|`content_idea_tags`|Idea ↔ tag relationship|
|`content_series`|Content series|
|`content_series_items`|Ideas added to series|
|`publishing_schedule_settings`|Posting frequency/settings|
|`content_schedule_items`|Scheduled individual posts|
|`events_trends`|Events and trends|
|`social_channels`|Own + competitor channels|
|`channel_posts`|Imported social content|
|`subscription_plans`|Monthly/yearly plans|
|`business_subscriptions`|Business subscription|
|`activity_logs`|Employee activity history|
|`notifications`|In-app notifications|
|`email_queue`|Email notifications|
### The most important relationship is
```text
                      ┌──────────── ADMIN
                      │
USERS ─────────────────
  │
  │
  └──── BUSINESS_MEMBERS
              │
              ▼
         BUSINESSES
              │
      ┌───────┼────────────┬────────────┐
      ▼       ▼            ▼            ▼
   PRODUCTS PERSONAS    INSIGHTS     PILLARS
                                     +
                              BRAND GUIDELINES
              │
              ▼
        AI CONTENT IDEAS
              │
              ▼
        CONTENT SERIES
              │
              ▼
     CONTENT SERIES ITEMS
              │
              ▼
          SCHEDULE
              │
              ▼
          PUBLISHED
BUSINESSES
    │
    ├──── OWN SOCIAL CHANNELS
    │          └── POSTS
    │
    ├──── COMPETITOR CHANNELS
    │          └── POSTS
    │
    ├──── SUBSCRIPTIONS
    │
    └──── ACTIVITY LOGS
```
This structure also avoids tying `staff` directly to an owner account. Staff belong to a **business**, which is much cleaner. For example, if the owner changes later, you do not have to migrate every employee record—the employees are still members of the same business.