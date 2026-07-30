#### 1. The problem is the model is in feature folder
##### Solution
The recommendation is to centralize SQLAlchemy models:
```
app/db/models/
├── user.py
├── category.py
├── auction_session.py
├── auction_session_rule.py
├── auction_item.py
├── item_image.py
└── bid.py
```
Then business logic remains inside feature modules:
```
modules/auth/
modules/users/
modules/categories/
modules/auctions/
```
###### Why this solution works
Database models often reference each other:
```
User
  ↓
AuctionSession
  ↓
AuctionItem
  ↓
Bid
```
For example:
```
class AuctionSession(Base):
    seller_id = mapped_column(
        ForeignKey("users.id")
    )
```
And:
```
class Bid(Base):
    user_id = mapped_column(
        ForeignKey("users.id")
    )
    item_id = mapped_column(
        ForeignKey("auction_items.id")
    )
```
As relationships increase, models become tightly connected.  
If models are scattered across many feature folders, model registration and imports can become difficult.  
Centralizing models gives Alembic one predictable location:
```
import app.db.models
```
Then Alembic can discover all tables.

#### 2. The problem is Why should `main.py` be small?
##### Solution
Use `main.py` only to assemble the application.  
For example:
```
from fastapi import FastAPI
from app.api.v1.router import api_router
from app.core.exception_handlers import register_exception_handlers
from app.lifespan import lifespan
app = FastAPI(
    title="Live Auction API",
    lifespan=lifespan,
)
register_exception_handlers(app)
app.include_router(api_router)
```
###### Why this solution works
`main.py` becomes a map of the application:
```
Create app
Register lifespan
Register handlers
Include routes
```
It does not contain the implementation of every concern.  
Without this separation, `main.py` can slowly contain:
```
Database initialization
Migration execution
Exception handlers
OpenAPI configuration
CORS
Every router
Startup hooks
Shutdown hooks
```
Then it becomes difficult to understand and test.

#### 3. The problem is why create `app/api/v1/router.py`?
##### Solution
Use one API router that includes feature routers.
```
from fastapi import APIRouter
from modules.auth.router import router as auth_router
from modules.auctions.router import router as auction_router
from modules.categories.router import router as category_router
api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth_router)
api_router.include_router(auction_router)
api_router.include_router(category_router)
```
Then `main.py` only needs:
```
app.include_router(api_router)
```
###### Why this solution works
The API version prefix is defined once:
```
/api/v1
```
You avoid repeating it in every module.  
It also makes future API versioning easier:
```
app/api/v1/router.py
app/api/v2/router.py
```

#### 3. The problem is what does “inject the database into the repository” mean?
##### Solution
Instead of passing `db` into every repository method:
```
await repository.find_by_email(db, email)
```
create the repository with the session:
```
repository = UserRepository(db)
```
Then call:
```
await repository.find_by_email(email)
```
Example:
```
class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db
    async def find_by_email(
        self,
        email: str,
    ) -> User | None:
        result = await self.db.execute(
            select(User).where(User.email == email)
        )
        return result.scalar_one_or_none()
```
Dependency:
```
def get_auth_service(
    db: DatabaseSession,
) -> AuthService:
    user_repository = UserRepository(db)
    return AuthService(user_repository)
```
###### Why this solution works
Compare these signatures:
```
await auth_service.login(db, request)
await user_repository.find_by_email(db, request.email)
```
with:
```
await auth_service.login(request)
await user_repository.find_by_email(request.email)
```
The second version is cleaner because the repository already knows which database session it uses.  
It also improves testing because you can inject a fake repository into the service.

#### 4. The problem is deleting sessions when no related data exists
##### Solution
Run:
```
DELETE FROM auction_sessions;
```
This deletes every row but keeps the table structure.  
To reset an `AUTO_INCREMENT` counter, you could use:
```
TRUNCATE TABLE auction_sessions;
```
However, your table uses `BINARY(16)` UUIDs, so there is usually no auto-increment value to reset.
##### 5. The problem is that  Sessions already have related records
Delete child-table records first, then delete the auction sessions:
```
START TRANSACTION;
DELETE FROM bids;
DELETE FROM item_images;
DELETE FROM auction_items;
DELETE FROM auction_session_rules;
DELETE FROM wallet_transactions
WHERE session_id IS NOT NULL;
DELETE FROM auction_sessions;
COMMIT;
```
The exact order depends on your foreign keys. For example, if `bids` references `auction_items`, bids must be deleted before auction items.
##### Temporary development-only method
You can temporarily disable foreign key checking:
```
SET FOREIGN_KEY_CHECKS = 0;
DELETE FROM bids;
DELETE FROM item_images;
DELETE FROM auction_items;
DELETE FROM auction_session_rules;
DELETE FROM wallet_transactions
WHERE session_id IS NOT NULL;
DELETE FROM auction_sessions;
SET FOREIGN_KEY_CHECKS = 1;
```
Do not delete only from `auction_sessions` while foreign key checks are disabled, because this can leave orphan records in related tables.
#### 6. The problem is how is the request body validated?  
The endpoint receives several values:
```
title
description
startTime
endTime
minIncrement
```
These values need to be converted from JSON into Python values.  
For example:
```
"startTime": "2026-07-20T09:00:00"
```
must become a Python `datetime`.
##### Solution
The file:
```
modules/auction_sessions/session_schema.py
```
contains the Pydantic request and response models.  
A simplified request schema might look like:
```
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel
class CreateAuctionSessionRequest(BaseModel):
    title: str
    description: str | None = None
    start_time: datetime
    end_time: datetime
    min_increment: Decimal
```
Because your external API uses camel case, the actual model may map:
```
startTime → start_time
endTime → end_time
minIncrement → min_increment
```
###### Why this works
Pydantic validates and converts input before your business logic runs.  
For example:
```
{
  "startTime": "not-a-date"
}
```
will be rejected automatically instead of reaching the database.  
The flow becomes:
```
JSON request
    ↓
Pydantic validation
    ↓
Python request object
    ↓
Service business validation
    ↓
Database
```
Pydantic handles structural validation, while the service handles business rules.

#### 7. The problem is why validate `startTime < endTime`?  
An auction cannot end before it starts.  
This request is invalid:
```
{
  "startTime": "2026-07-20T18:00:00",
  "endTime": "2026-07-20T09:00:00"
}
```
Without validation, the database might accept the values because both columns are technically valid `DATETIME` values.  
The database understands data types, but it does not automatically understand your auction business rules.
##### Solution
The service validates:
```
if request.start_time >= request.end_time:
    raise AppException(
        status_code=400,
        code="INVALID_AUCTION_TIME",
        message="Start time must be before end time",
    )
```
#### 8. The problem is why validate `minIncrement > 0`?  
`minIncrement` defines how much higher the next bid must be.  
Suppose the current price is:
```
10,000,000 VND
```
and:
```
minIncrement = 50,000 VND
```
The next minimum valid bid is:
```
10,000,000 + 50,000 = 10,050,000 VND
```
A zero or negative increment would break bidding logic.  
For example:
```
minIncrement = 0
```
would allow repeated bids at the same price.
```
minIncrement = -50,000
```
could allow the auction price to decrease.
##### Solution
The service checks:
```
if request.min_increment <= 0:
    raise AppException(
        status_code=400,
        code="INVALID_MIN_INCREMENT",
        message="Minimum increment must be greater than zero",
    )
```
#### 9. The problem is why use `flush()` before creating the rule?  
The rule needs:
```
auction_session.id
```
But the session ID may not yet be available until SQLAlchemy sends the insert to MySQL.
##### Solution
The repository performs:
```
db.add(auction_session)
await db.flush()
await db.refresh(auction_session)
```
###### What `add()` does
```
db.add(auction_session)
```
places the object into the SQLAlchemy session.  
It does not necessarily execute the SQL immediately.
###### What `flush()` does
```
await db.flush()
```
sends pending SQL statements to the database without committing the transaction.  
After the flush, generated database values such as the ID are available.  
Conceptually:
```
db.add()
    ↓
Object is pending in SQLAlchemy
db.flush()
    ↓
INSERT is sent to MySQL
    ↓
auction_session.id becomes available
```
###### What `refresh()` does
```
await db.refresh(auction_session)
```
reloads the database row into the Python object.  
This is useful when the database generates values such as:
```
id
created_at
updated_at
default values
```
###### Important difference
```
flush = send SQL but do not permanently finish transaction
commit = permanently complete transaction
```
This is why the service can obtain the session ID while still keeping the session and rule inside one transaction.

#### 10. The problem is why create the session and rule in one transaction?  
Imagine this sequence:
```
1. Auction session is inserted successfully.
2. Rule insertion fails.
```
Without a transaction, the database would contain:
```
AuctionSession exists
AuctionSessionRule does not exist
```
That creates an incomplete auction session.  
Later, bidding code may expect every session to have a rule and fail.
##### Solution
Both inserts are executed in the same transaction:
```
async with db.begin():
    auction_session = await repository.create_session(...)
    await repository.create_rule(...)
```
Or the service may explicitly use:
```
try:
    ...
    await db.commit()
except Exception:
    await db.rollback()
    raise
```
###### Why this works
A transaction provides all-or-nothing behavior:
```
Session insert succeeds
Rule insert succeeds
    ↓
COMMIT both
```
But:
```
Session insert succeeds
Rule insert fails
    ↓
ROLLBACK both
```
The database will never keep only half of the UC03 operation.  
This property is called **atomicity**.

#### 11. The problem is that why is the initial status `SCHEDULED`?  
The implementation creates the session with:
```
status=AuctionSessionStatus.SCHEDULED
```
This means the auction exists but has not started yet.  
For example:
```
Current time: 2026-07-19 11:00
Start time:   2026-07-20 09:00
```
The auction should not accept live bids yet.  
A possible lifecycle is:
```
SCHEDULED
    ↓ start time reached
ACTIVE
    ↓ end time reached
ENDED
```
Depending on your complete design, you may also use:
```
SCHEDULED → ACTIVE → COMPLETED
```
#### 12. The problem is what does the router do?  
The file:
```
modules/auction_sessions/session_router.py
```
defines the HTTP endpoint:
```
POST /api/v1/auction-sessions
```
A simplified version may look like:
```
@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=ApiResponse[CreateAuctionSessionResponse],
)
async def create_auction_session(
    request: CreateAuctionSessionRequest,
    current_user: CurrentUserDep,
    db: AsyncSessionDep,
):
    return await session_service.create_session(
        db=db,
        seller_id=current_user.id,
        request=request,
    )
```
The router’s responsibilities are:
```
Receive HTTP request
    ↓
Run authentication dependency
    ↓
Parse request body
    ↓
Call service
    ↓
Return HTTP response
```
The router should not contain complex business logic.  
That belongs in:
```
session_service.py
```

#### 13. The problem is that who is allowed to create a category?
##### Solution
The endpoint requires:
```
JWT authenticated
role = ADMIN
status = ACTIVE
```
This is handled by:
```
get_current_admin_user
```
in:
```
app/core/dependencies.py
```
The authentication flow is approximately:
```
Request
  ↓
Read Bearer token
  ↓
Decode JWT
  ↓
Get user ID from token
  ↓
Find user in database
  ↓
Check user status
  ↓
Check user role
  ↓
Allow or reject request
```
###### Why this works
A JWT only proves that the request contains a valid login token. It does not automatically prove that the user is an administrator.  
Therefore, the backend must perform two separate checks:
```
Authentication → Who is this user?
Authorization  → Is this user allowed to perform this action?
```
The endpoint is protected with an admin dependency, so the route does not need to repeat the same authorization logic.  
Possible errors include:
```
USER_BANNED
ADMIN_REQUIRED
```
For example:
```
ACTIVE + ADMIN → allowed
ACTIVE + USER  → ADMIN_REQUIRED
BANNED + ADMIN → USER_BANNED
```

#### 14. The problem is how does the API receive and validate category data?
##### Solution
The request and response schemas are defined in:
```
modules/categories/category_schema.py
```
The request accepts:
```
{
  "name": "Mobile Phones",
  "slug": "mobile-phones"
}
```
The `name` field is required and must contain between 2 and 150 characters.  
The `slug` is optional.  
You can therefore send either:
```
{
  "name": "Mobile Phones",
  "slug": "mobile-phones"
}
```
or:
```
{
  "name": "Mobile Phones"
}
```
###### Why this works
Pydantic validates the request before the service runs.  
For example, this request is invalid:
```
{
  "name": "A"
}
```
because the category name is shorter than two characters.  
FastAPI rejects invalid input before it reaches the database, which keeps malformed data out of the business logic.
#### 15. The problem is what is a slug, and why is it needed?
##### Solution
A slug is a URL-friendly version of a category name.  
For example:
```
Category name: Mobile Phones
Slug: mobile-phones
```
The slug utility is located in:
```
app/utils/slug.py
```
and uses:
```
python-slugify
```
If the client does not provide a slug:
```
{
  "name": "Mobile Phones"
}
```
the backend automatically generates:
```
mobile-phones
```
Other examples:
```
Luxury Watches       → luxury-watches
Laptop & Accessories → laptop-accessories
Điện thoại di động   → dien-thoai-di-dong
```
###### Why this works
A normal category name may contain:
```
Spaces
Uppercase characters
Symbols
Vietnamese characters
```
Those values are not always convenient for URLs.  
Instead of using:
```
/api/v1/categories/Mobile Phones
```
the frontend can use:
```
/api/v1/categories/mobile-phones
```
This is cleaner, predictable, and easier to use in routes.
#### 16. The problem is why must both category name and slug be unique?
##### Solution
The service performs duplicate checks through:
```
modules/categories/category_repository.py
```
The repository contains operations such as:
```
find_by_name
find_by_slug
create
```
Before creating a category, the service checks:
```
Does this name already exist?
Does this slug already exist?
```
Possible errors are:
```
CATEGORY_NAME_ALREADY_EXISTS
CATEGORY_SLUG_ALREADY_EXISTS
```
###### Case-insensitive name checking
The name check is case-insensitive.  
Therefore, these names are considered duplicates:
```
Mobile Phones
mobile phones
MOBILE PHONES
```
###### Why this works
Without case-insensitive checking, the database might contain visually duplicated categories:
```
Mobile Phones
mobile phones
Mobile phones
```
Although their capitalization differs, users would understand them as the same category.  
The slug must also be unique because it may later identify a category in an API route or frontend URL.  
These two categories cannot share the same slug:
```
Name: Mobile Phones
Slug: mobile-phones
Name: Smartphones
Slug: mobile-phones
```
The second request should fail with:
```
CATEGORY_SLUG_ALREADY_EXISTS
```
#### 17. The problem is Why are duplicate checks needed in both code and the database?
##### Solution
The service checks for duplicates before insertion, and the model or migration adds a database unique constraint.  
The model was updated in:
```
app/models/category_model.py
```
The migration was created in:
```
alembic/versions/b7e4f1a92c03_...
```
###### Why this works
The service-level check gives a readable business error:
```
CATEGORY_NAME_ALREADY_EXISTS
```
But checking only in the service is not completely safe.  
Imagine two requests arrive at almost the same time:
```
Request A checks name → not found
Request B checks name → not found
Request A inserts category
Request B inserts category
```
Without a database constraint, both requests might create the same category.  
The database constraint is the final protection:
```
Service validation → friendly error
Database constraint → guaranteed data integrity
```
This is called defense in depth.

#### 18. The problem is hat does the category service do?
##### Solution
The business logic is in:
```
modules/categories/category_service.py
```
Its execution flow is approximately:
```
1. Receive validated request.
2. Normalize the category name.
3. Generate the slug if it was omitted.
4. Check whether the name already exists.
5. Check whether the slug already exists.
6. Create the category with ACTIVE status.
7. Commit the transaction.
8. Return the created category.
```
Conceptually:
```
async def create_category(db, request):
    name = request.name.strip()
    slug = request.slug or generate_slug(name)
    existing_name = await repository.find_by_name(db, name)
    if existing_name:
        raise CATEGORY_NAME_ALREADY_EXISTS
    existing_slug = await repository.find_by_slug(db, slug)
    if existing_slug:
        raise CATEGORY_SLUG_ALREADY_EXISTS
    category = await repository.create(
        db=db,
        name=name,
        slug=slug,
        status=CategoryStatus.ACTIVE,
    )
    await db.commit()
    return category
```
###### Why this works
The service is responsible for business decisions.  
The router should not contain database queries and duplicate-checking rules. The repository should not decide whether a duplicate is acceptable.  
The responsibilities are separated like this:
```
Router     → HTTP request and response
Schema     → Input/output validation
Service    → Business rules
Repository → Database operations
Model      → Database table mapping
Migration  → Actual database structure changes
```

#### 19. The problem is What does the repository do?
##### Solution
The repository is located at:
```
modules/categories/category_repository.py
```
It contains database-focused methods:
```
find_by_name
find_by_slug
create
```
For example:
```
async def find_by_slug(
    self,
    db: AsyncSession,
    slug: str,
) -> Category | None:
    result = await db.execute(
        select(Category).where(Category.slug == slug)
    )
    return result.scalar_one_or_none()
```
###### Why this works
The repository keeps SQLAlchemy logic separate from business logic.  
The service can say:
```
existing_category = await repository.find_by_slug(db, slug)
```
instead of knowing how SQLAlchemy builds and executes the query.  
This makes the code easier to maintain and test.

#### 20. The problem is Why was `find_by_id` added to the user repository?
##### Solution
The admin authentication dependency needs to load the current user from the database.  
The JWT normally stores a user identifier:
```
{
  "sub": "user-uuid"
}
```
After decoding the token, the dependency uses:
```
modules/users/user_repository.py
```
to call:
```
find_by_id
```
###### Why this works
The token may contain the user role, but the database should still be checked when current account state matters.  
For example, an admin logs in and receives a token. Later, the database status changes to:
```
BANNED
```
If the backend trusts only the old token, the banned administrator may continue creating categories until the token expires.  
Loading the user from the database allows the backend to check the latest:
```
role
status
account existence
```

#### 21. The problem is What does the router do?
##### Solution
The endpoint is declared in:
```
modules/categories/category_router.py
```
The API is:
```
POST /api/v1/categories
```
It requires:
```
Authorization: Bearer <accessToken>
Content-Type: application/json
```
The router receives:
```
Validated request body
Current authenticated administrator
Database session
Category service
```
It then calls the service and wraps the result using your existing API response format.
###### Request
```
{
  "name": "Mobile Phones"
}
```
###### Conceptual response
```
{
  "status": 201,
  "code": "CATEGORY_CREATED",
  "message": "Category created successfully",
  "data": {
    "id": "category-uuid",
    "name": "Mobile Phones",
    "slug": "mobile-phones",
    "status": "ACTIVE",
    "createdAt": "2026-07-19T12:00:00"
  }
}
```
The exact fields depend on your actual response schema.

---
#### 22.The problem is Why does the implementation not use `success` and `errorCode` from the original specification?
##### Solution
It follows the response format already used by your project:
```
{
  "status": 201,
  "code": "CATEGORY_CREATED",
  "message": "Category created successfully",
  "data": {}
}
```
instead of introducing another format such as:
```
{
  "success": true,
  "errorCode": null,
  "data": {}
}
```
###### Why this works
A project should use one consistent response structure.  
Using different response formats for different modules creates unnecessary frontend logic:
```
if (response.success) {
    // category API
}
if (response.status === 200) {
    // authentication API
}
```
A consistent response structure allows the frontend to handle all APIs similarly.

Why was a database migration added?
###### Solution
Changing the SQLAlchemy model does not automatically change the MySQL table.  
The migration applies changes such as:
```
Unique category name constraint
Category status index
Other category table adjustments
```
The migration file is:
```
alembic/versions/b7e4f1a92c03_...
```
You need to run:
```
docker compose exec backend alembic upgrade head
```
###### Why this works
There are two separate structures:
```
SQLAlchemy model → Python’s description of the table
MySQL table      → Actual stored database structure
```
Alembic connects those structures by generating and applying SQL changes.  
Without running the migration, your Python code may expect a unique constraint that does not exist in MySQL.

---
#### 23.The problem is Why must the backend container be rebuilt?
###### Solution
The implementation added:
```
python-slugify
```
to:
```
requirements.txt
```
Your existing Docker image was built before that package was added.  
Therefore, run:
```
docker compose build backend
docker compose up -d backend
```
A shorter combined command is:
```
docker compose up --build -d backend
```
Then apply the migration:
```
docker compose exec backend alembic upgrade head
```
###### Why this works
Restarting a container does not necessarily reinstall Python dependencies.
```
docker compose restart backend
```
only restarts the existing container.  
It does not rebuild the image from the updated `requirements.txt`.  
You need:
```
requirements.txt changed
        ↓
Rebuild Docker image
        ↓
Install python-slugify
        ↓
Create new backend container
```

#### 24. The problem is why is email lookup case-insensitive?
##### Solution
The repository now treats these addresses as the same account:
```
admin@example.com
Admin@example.com
ADMIN@EXAMPLE.COM
```
Without case-insensitive checking, the database or application could accidentally allow logically duplicated users.  
The lookup behaves conceptually like:
```
SELECT *
FROM users
WHERE LOWER(email) = LOWER(:email);
```
Therefore, when this email already exists:
```
admin@example.com
```
the following request should also be rejected:
```
Admin@Example.com
```
This protects account uniqueness consistently.

#### 25. The problem is that what is `select ... for update`
It prevents two simultaneous bids from both reading the same current price and incorrectly becoming the winning bid


#### 26. The problem is why do we still need REST when we have WebSocket?
A user needs to place a bid.
You may think the frontend should send the bid through WebSocket
```
WebSocket -> place bid -> update database
```
But your existing bidding endpoint `POST /api/v1/auction-items/{itemId}/bids` already handles important business rules
##### The solution is only after bid is successfully committed should the backend use WebSocket to notify other users
```
Database commit succeeds
    ↓
Backend sends BID_PLACED event
    ↓
All connected browsers receive it
```
REST is responsible for changing the real database state
WebSocket is responsible only for sending news about that change
#### 27. The problem is that what does 'committed changes' means
Suppose a user bids `36,000,000VND` . The backend prepares the database changes, but something fails before the transaction is completed
```
MySQL connection fails
Transaction rolls back
```
The solution is always commit first, then broadcast
```
result = await place_bid_service.place_bid(
	item_id=item_id, 
	bidder= current_user,
	amount=request.amount
)
await session.commit()
await websocket_manager.broadcast(
	item_id=item_id,
	message={
		"type": "BID_PLACED",
		"data":{
			"currentPrice": str(result.current_price)
		}
	}
)
```
The important order is 
```
1. Validate
2. Save
3. Commit
4. Broadcast
```
#### 28. The problem is that what is the WebSocket actually doing
A WebSocket is long-running connection between the browser and backend
A normal REST request works like this
```
Browser sends request
Backend sends response
Connection finishes
```
A WebSocket works like this
```
Browser connects
Connection stays open
Backend can send messages anytime
Browser disconnects when page closes
```
##### The solution is creating one websocket room for each auction item
Example
```
Auction item A:
ws://localhost:8000/ws/auction-items/item-a
Auction item B:
ws://localhost:8000/ws/auction-items/item-b
```
Users viewing item A join the item A room
Users viewing item B join the item B room
When someone bids on item A, only users watching item A receive the event.
#### 29. The problem is that what is an event?
An event is simple a message telling the frontend what happend
For example
```
{
	"type": "BID_PLACED",
	"itemId": "item-123"
	"data": {
		"currentPrice": "36000000.00"
	}
}
```

This message means
```
Something happened: BID_PLACED
It happend to: item-123
The new value is: 36,000,000 VND
```
The frontend reads `type` and decides what part of the page to update
##### The solution is for the first version, support only two events `VIEWER_COUNT_UPDATED` and `BID_PLACED`
Do not build all four events immediately.
###### Event 1: Viewer count changed
```
{
	"type": "VIEWER_COUNT_UPDATED",
	"itemId": "item-123",
	"data": {
		"viewerCount": 3
	}
}
```
The frontend updates 3 people watching
###### Event 2: Bid placed
```
{
	"type": "BID_PLACED",
	"itemId": "item-123",
	"data": {
		"bidId": "bid-456",
		"bidderName": "Nguyen A",
		"amount": "36000000.00",
		"currentPrice": "36,000,000 VND",
		"totalBids": 8
	}
}
```
The frontend updates
```
Current price
Newest bid
Total number of bids
```
Later, add:
```
ITEM_STATUS_UPDATED
AUCTION_ENDED
```
#### 30. The problem is why do all events need the same structure
Without a standard format, you might send messages with different formats
##### The solution is giving every event the same outer format
```
{
	"type": "EVENT_NAME",
	"itemId": "item-uuid",
	"timestamp": "2026-07-22T06:30:00Z",
	"data": {}
}
```
Only the contents of data change
Example viewer event
```
{
	"type": "VIEWER_COUNT_UDATED",
	"itemId": "item-123",
	"timestamp": "2026-07-22T06:30:00Z",
	"data": {
		"viewerCount": 3
	}
}
```
Example bid event
```
{
	"type": "BID_PLACED",
	"itemId": "item123",
	"timestamp": "2026-07-22T06:30:00Z",
	"data": {
		"currentPrice": "36000000",
		"totalBids": 8
	}
}
```
The frontend always knows where to find the important fields
#### 32. The problem is what is `AuctionItemEventType`
This code
```
class AuctionItemEventType(str,Enum):
	VIEWER_COUNT_UPDATED = "VIEWER_COUNT_UPDATED"
	BID_PLACED = "BID_PLACED"
	ITEM_STATUS_UPDATED = "ITEM_STATUS_UPDATED"
	AUCTION_ENDED = "AUCTION_ENDED"
```
is simple a controlled list of allowed event names.
Without it, you may accidentally write `BID_PLACE` instead of `BID_PLACED`
##### The solution is using an enum to prevent spelling differences
```
from enum import Enum
class AuctionItemEventType(str, Enum):
```
#### 33. The problem is what is the `AuctionItemEvent` class
This class
`app/realtime/schemas/auction_item_event.py`
```
class AuctionItemEvent(BaseModel):
	type: AuctionItemEventType
	item_id: UUID = Field(alias="itemId")
	timestamp: datetime
	data: dict[str, Any]
```
describes the standard message structure
It means every event must contain 
```
type
itemId
timestamp
data
```
#### 34. The problem is what does alias="itemId" do
Python normally uses snake case `item_id`
Your frontend uses camel case `itemId`
The alias lets Python use `item_id` internally while sending `itemId` to React

#### 35. The problem is what is dict[str, Any]?
It means data can hold different fields depending on the event
Viewer event
```
data= {
	"viewerCount": 3
}
```
Bid event
```
data={ 
	"bidId": "bid-123",
	"currentPrice": "36000000",
	"totalBids": 8
}
```

#### 36. The problem is why create a factory function
Without a factory, every place that publishes a bid might manually build the message:
```
event = AuctionItemEvent(
	type=AuctionItemEventType.BID_PLACED,
	itemId=item_id,
	timestamp=datetime.now(timezone.utc),
	data={
		"bidId": str(bid_id),
		"currentPrice": str(current_price)
	},
)
```
If you repeat this in several files, one file might forget `totalBids`, another might call it `totalBid`, and another might send a `Decimal` that cannot be converted properly
##### The solution is creating one function responsible for building the bid event
```
def create_bid_placed_event(
	*,
	item_id:UUID,
	bid_id:UUID,
	bidder_id:UUID,
	bidder_name:str,
	amount:Decimal,
	current_price: Decimal,
	total_bids: int,
) -> AuctionItemEvent:
	return AuctionItemEvent(
		type=AuctionItemEventType.BID_PLACED,
		itemId=item_id,
		timestamp=datetime.now(timezone.utc),
		data={
			"bidId": str(bid_id),
			"bidderId": str(bidder_id),
			"bidderName": bidder_name,
			"amount" : str(amount),
			"currentPrice": str(current_price),
			"totalBids": total_bids
		},
	)
```
Now the place-bid endpoint only calls
```
event = create_bid_placed_event(
	item_id=result.item_id,
	bid_id=result.bid_id,
	bidder_id=result.bidder_id,
	bidder_name=result.bidder_name,
	amount=result.amount,
	current_price=result.curren_price,
	total_bids=result.total_bids
)
```
When you change the message format, you change one function instead of searching through every router and service.
#### 37. The problem is why convert `Decimal` to `str`
Your MySQL price uses `DECIMAL(18,2)` 
Your Python code uses `Decimal`
But JSON does not safely support Python `Decimal` directly in every situation
Javascript also uses floating-point numbers, which can introduce precision problem
##### The solution is sending money as strings 
```
"amount": str(amount),
"currentPrice": str(current_price),
```
JSON 
```
{
	"amount": "36000000.00",
	"currentPrice": "36,000,000 VND"
}
```
The frontend can format it for display
```
function formatVnd(value: string): string {
	return new Intl.NumberFormat('vi-VN,{
		style: 'currency',
		currency: 'VND'
	}).format(Number(value))
}
```
Usage
```
<span>{formatVnd(event.data.currentPrice)}</span>
```
#### 38. The problem is that one wrong approach is using WebSocket to place the bid
#### 39. The problem is that one wrong approach is starting with too many event types
Starting immediately with
```
VIEWER_COUNT_UPDATED
BID_PLACED
ITEM_STATUS_UPDATED
AUCTION_ENDED
SESSION_STARTED
USER_JOINED
USER_LEFT
BID_REJECTED
PRICE_UPDATED
```
creates too much code before the basic connection works
#### 40. The problem is one wrong approach is putting event dictionaries directly in router
```
await manager.broadcast(
	item_id,
	{
		"type": "BID_PLACED",
		"item": str(item_id),
		"price": result.current_price
	}
)
```
This causes duplicated and inconsistent formats
Use
```
event = create_bid_placed_event(...)
await publisher.publish(item_id,event)
```

#### 41. The problem is one wrong approach is thinking `domain event` is database table
These events do not need to be stored in MySQL for your first version
They are just temporary messages
For now, you do not need an `auction_events` table
