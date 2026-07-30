# UC01 - Register User
[[UC01 - Register User]]
# UC02 - Login User
[[UC02 - Login User]]
# UC03 - Create Auction Session
[[UC03 - Create Auction Session]]
# UC06 - Create Auction Item
[[UC06 - Create Auction Item]]
# UC04 - View Auction Session List
[[UC04 - View Auction Session List]]
# UC05 - View Auction Session Detail
[[UC05 - View Auction Session Detail]]
# UC07 - Upload Auction Item Images
[[UC07 - Upload Auction Item Images]]
# UC08 - View Auction Item Detail
[[UC08 - View Auction Item Detail]]
# UC09 - Place Bid
[[UC09 - Place Bid]]
# UC10 - View My Bids
[[UC10 - View My Bids]]
# UC11 - View My Auction Sessions
[[UC11 - View My Auction Sessions]]
# UC12 - Start Auction Session
[[UC12 - Start Auction Session]]
# UC13 - End Auction Session
[[UC13 - End Auction Session]]
# UC14 - Cancel Auction Session
[[UC14 - Cancel Auction Session]]
# UC16 - Create Admin User
[[UC16 - Create Admin User]]
# UC15- Create Category
[[UC15- Create Category]]
# Suggested API List
```
Auth
POST   /api/v1/auth/register
POST   /api/v1/auth/login
Auction Sessions
POST   /api/v1/auction-sessions
GET    /api/v1/auction-sessions
GET    /api/v1/auction-sessions/my
GET    /api/v1/auction-sessions/{sessionId}
PATCH  /api/v1/auction-sessions/{sessionId}/start
PATCH  /api/v1/auction-sessions/{sessionId}/end
PATCH  /api/v1/auction-sessions/{sessionId}/cancel
Auction Items
POST   /api/v1/auction-sessions/{sessionId}/items
GET    /api/v1/auction-items/{itemId}
PATCH  /api/v1/auction-items/{itemId}
DELETE /api/v1/auction-items/{itemId}
Item Images
POST   /api/v1/auction-items/{itemId}/images
DELETE /api/v1/item-images/{imageId}
Bids
POST   /api/v1/auction-items/{itemId}/bids
GET    /api/v1/bids/my
GET    /api/v1/auction-items/{itemId}/bids
Categories
POST   /api/v1/categories
GET    /api/v1/categories
PATCH  /api/v1/categories/{categoryId}
```

---
# Clean FastAPI layer responsibility
## Router layer
```
Receive HTTP request
Validate request body
Get current user if needed
Call service
Return response
```
Example:
```
bid_router.py
```
Should only handle:
```
POST /auction-items/{itemId}/bids
```
Do not put business logic in router.

---
## Service layer
```
Handle business logic
Check permissions
Check status
Check bid amount
Start database transaction
Call repository
```
Example:
```
bid_service.py
```
Handles:
```
- item exists or not
- session ACTIVE or not
- bidder cannot bid own item
- amount must be valid
- old WINNING bid becomes OUTBID
- new bid becomes WINNING
- update current_price
```

---
## Repository layer
```
Only database query
No business logic
```
Example:
```
bid_repository.py
```
Handles:
```
find winning bid
create bid
update bid status
find bids by bidder
```

---
# Recommended module order to code
I suggest you code in this order:
```
1. Project setup
2. Database connection
3. User model
4. Auth register
5. Auth login + JWT
6. Auction session model
7. Create auction session
8. Create auction item
9. View session detail
10. Place bid
11. View my bids
12. Start/end/cancel session
13. Upload item images
```
This order is easier because `Place Bid` depends on many things:
```
User
JWT
Session
Rule
Item
Bid
```
So do not start with bidding first.

---
# Important FastAPI packages
```
fastapi
uvicorn
sqlalchemy
pymysql
alembic
pydantic
python-jose
passlib[bcrypt]
python-multipart
python-dotenv
```
`requirements.txt`:
```
fastapi
uvicorn[standard]
sqlalchemy
pymysql
alembic
pydantic
python-jose[cryptography]
passlib[bcrypt]
python-multipart
python-dotenv
```

---
# My recommendation for your app
For your current auction app, FastAPI is okay and clean.  
But because this is a **realtime auction app**, remember this:
```
FastAPI REST API is good for:
- register
- login
- create session
- create item
- place bid
- view history
WebSocket is needed for:
- realtime current price update
- realtime bid notification
- online green status
- auction countdown update
```
So your backend should be:
```
FastAPI REST API + FastAPI WebSocket
```
Not REST only.  
Best simple architecture:
```
React frontend
        ↓
FastAPI REST API
        ↓
MySQL database
React frontend
        ↓
FastAPI WebSocket
        ↓
Realtime bid updates
```
For your use case, this is a good clean structure.