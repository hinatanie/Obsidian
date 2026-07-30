Database core:
```
users
wallets
wallet_transactions
auction_sessions
auction_session_rules
auction_items
bids
payments
```
Role chỉ có:
```
ADMIN
USER
```
# 1. Auth APIs
## Register
```
POST /api/v1/auth/register
```
### Request
```
{
  "email":"user@gmail.com",
  "password":"123456",
  "fullName":"Nguyen Van A",
  "phone":"0909123456"
}
```
### Backend flow
```
1. Check email exists
2. Hash password
3. Create user with role = USER, status = ACTIVE
4. Create wallet for user
5. Return user info
```
### Response
```
{
  "status":201,
  "message":"Register successfully",
  "data": {
    "id":"uuid",
    "email":"user@gmail.com",
    "fullName":"Nguyen Van A",
    "role":"USER",
    "status":"ACTIVE"
  }
}
```
## Login
```
POST /api/v1/auth/login
```
### Request
```
{
  "email":"user@gmail.com",
  "password":"123456"
}
```
### Response
```
{
  "status":200,
  "message":"Login successfully",
  "data": {
    "accessToken":"jwt_token",
    "tokenType":"Bearer"
  }
}
```
# 2. User APIs
## Get current user profile
```
GET /api/v1/users/me
```
### Authorization
```
USER or ADMIN
```
### Response
```
{
  "status":200,
  "message":"Get current user successfully",
  "data": {
    "id":"uuid",
    "email":"user@gmail.com",
    "fullName":"Nguyen Van A",
    "phone":"0909123456",
    "role":"USER",
    "status":"ACTIVE"
  }
}
```
## Admin ban user
```
PATCH /api/v1/admin/users/{userId}/ban
```
### Authorization
```
ADMIN only
```
### Backend flow
```
1. Check current user role = ADMIN
2. Find target user
3. Update user status = BANNED
```
## Admin unban user
```
PATCH /api/v1/admin/users/{userId}/unban
```
### Authorization
```
ADMIN only
```
### Backend flow
```
1. Check current user role = ADMIN
2. Find target user
3. Update user status = ACTIVE
```
# 3. Wallet APIs
## Get my wallet
```
GET /api/v1/wallets/me
```
### Authorization
```
USER or ADMIN
```
### Response
```
{
  "status":200,
  "message":"Get wallet successfully",
  "data": {
    "id":"uuid",
    "currency":"VND",
    "balance":1000000.00,
    "lockedBalance":0.00,
    "status":"ACTIVE"
  }
}
```
## Deposit money
```
POST /api/v1/wallets/deposit
```
### Authorization
```
USER
```
### Request
```
{
  "amount":1000000
}
```
### Backend flow
```
1. Get current user
2. Find user's wallet
3. Check wallet status = ACTIVE
4. Increase wallet.balance
5. Create wallet_transactions type = DEPOSIT, status = SUCCESS
```
### Response
```
{
  "status":200,
  "message":"Deposit successfully",
  "data": {
    "balance":1000000.00,
    "lockedBalance":0.00
  }
}
```
For MVP, you can make deposit direct like this. Later, you can connect MoMo, VNPay, PayPal.
## Get my wallet transactions
```
GET /api/v1/wallets/transactions
```
### Authorization
```
USER or ADMIN
```
### Response
```
{
  "status":200,
  "message":"Get wallet transactions successfully",
  "data": [
    {
      "id":"uuid",
      "type":"DEPOSIT",
      "amount":1000000.00,
      "status":"SUCCESS",
      "description":"Deposit money to wallet",
      "createdAt":"2026-07-01T15:30:00"
    },
    {
      "id":"uuid",
      "type":"BID_HOLD",
      "amount":300000.00,
      "status":"SUCCESS",
      "description":"Hold money for auction bid",
      "createdAt":"2026-07-01T16:00:00"
    }
  ]
}
```
# 4. Auction Session APIs
## Create auction session
```
POST /api/v1/auction-sessions
```
### Authorization
```
USER
```
### Request
```
{
  "title":"Phone Auction July 2026",
  "description":"Auction for phones",
  "startTime":"2026-07-10T09:00:00",
  "endTime":"2026-07-10T18:00:00"
}
```
### Backend flow
```
1. Get current user from JWT
2. Check user status = ACTIVE
3. Create auction_sessions
4. seller_id = current user id
5. status = DRAFT
```
### Response
```
{
  "status":201,
  "message":"Create auction session successfully",
  "data": {
    "id":"uuid",
    "title":"Phone Auction July 2026",
    "description":"Auction for phones",
    "sellerId":"uuid",
    "status":"DRAFT",
    "startTime":"2026-07-10T09:00:00",
    "endTime":"2026-07-10T18:00:00"
  }
}
```
## Create auction session rules
```
POST /api/v1/auction-sessions/{sessionId}/rules
```
### Authorization
```
USER
```
### Request
```
{
  "minIncrement":50000,
  "paymentDueHours":24
}
```
### Backend flow
```
1. Get current user
2. Find auction session
3. Check session.seller_id = current user id
4. Check session status = DRAFT
5. Check this session does not already have rules
6. Create auction_session_rules
```
### Response
```
{
  "status":201,
  "message":"Create auction session rules successfully",
  "data": {
    "id":"uuid",
    "sessionId":"uuid",
    "minIncrement":50000.00,
    "paymentDueHours":24
  }
}
```
## Get all auction sessions
```
GET /api/v1/auction-sessions
```
### Query params
```
GET /api/v1/auction-sessions?status=ACTIVE&page=0&size=10
```
### Authorization
```
Public or USER
```
### Response
```
{
  "status":200,
  "message":"Get auction sessions successfully",
  "data": {
    "items": [
      {
        "id":"uuid",
        "title":"Phone Auction July 2026",
        "status":"ACTIVE",
        "startTime":"2026-07-10T09:00:00",
        "endTime":"2026-07-10T18:00:00"
      }
    ],
    "page":0,
    "size":10,
    "totalElements":1
  }
}
```
## Get auction session detail
```
GET /api/v1/auction-sessions/{sessionId}
```
### Response
```
{
  "status":200,
  "message":"Get auction session successfully",
  "data": {
    "id":"uuid",
    "title":"Phone Auction July 2026",
    "description":"Auction for phones",
    "sellerId":"uuid",
    "status":"ACTIVE",
    "startTime":"2026-07-10T09:00:00",
    "endTime":"2026-07-10T18:00:00",
    "rules": {
      "minIncrement":50000.00,
      "paymentDueHours":24
    },
    "items": [
      {
        "id":"uuid",
        "title":"iPhone 15",
        "startingPrice":1000000.00,
        "currentPrice":1000000.00,
        "status":"OPEN"
      }
    ]
  }
}
```
## Publish auction session
```
PATCH /api/v1/auction-sessions/{sessionId}/publish
```
### Authorization
```
USER
```
### Backend flow
```
1. Get current user
2. Find session
3. Check session.seller_id = current user id
4. Check session status = DRAFT
5. Check session has rules
6. Check session has at least one item
7. Change session status to SCHEDULED or ACTIVE
```
### Simple rule
```
If start_time <= now and end_time > now:
    status = ACTIVE
If start_time > now:
    status = SCHEDULED
```
## Cancel auction session
```
PATCH /api/v1/auction-sessions/{sessionId}/cancel
```
### Authorization
```
Session owner or ADMIN
```
### Backend flow
```
1. Find session
2. Check current user is seller or admin
3. Check session is not ENDED
4. Change session status = CANCELLED
5. Cancel all OPEN/READY items
6. Release locked money if needed
```
# 5. Auction Item APIs
## Add item to session
```
POST /api/v1/auction-sessions/{sessionId}/items
```
### Authorization
```
USER
```
### Request
```
{
  "title":"iPhone 15 Pro Max",
  "description":"Used 6 months, good condition",
  "startingPrice":1000000
}
```
### Backend flow
```
1. Get current user
2. Find auction session
3. Check session.seller_id = current user id
4. Check session status = DRAFT or SCHEDULED
5. Create auction item
6. status = READY
7. current_price = starting_price
```
### Response
```
{
  "status":201,
  "message":"Add auction item successfully",
  "data": {
    "id":"uuid",
    "sessionId":"uuid",
    "title":"iPhone 15 Pro Max",
    "startingPrice":1000000.00,
    "currentPrice":1000000.00,
    "status":"READY"
  }
}
```
## Get item detail
```
GET /api/v1/auction-items/{itemId}
```
### Response
```
{
  "status":200,
  "message":"Get auction item successfully",
  "data": {
    "id":"uuid",
    "sessionId":"uuid",
    "title":"iPhone 15 Pro Max",
    "description":"Used 6 months, good condition",
    "startingPrice":1000000.00,
    "currentPrice":1200000.00,
    "status":"OPEN",
    "winnerUserId":null,
    "finalPrice":null,
    "openedAt":"2026-07-10T09:00:00",
    "closedAt":null
  }
}
```
## Open auction item
```
PATCH /api/v1/auction-items/{itemId}/open
```
### Authorization
```
Session owner or ADMIN
```
### Backend flow
```
1. Get current user
2. Find item
3. Find session
4. Check current user is session seller or admin
5. Check session status = ACTIVE
6. Check item status = READY
7. Set item status = OPEN
8. Set opened_at = now
9. Set current_price = starting_price
```
## Close auction item
```
PATCH /api/v1/auction-items/{itemId}/close
```
### Authorization
```
Session owner or ADMIN
```
### Backend flow
```
1. Get current user
2. Find item
3. Check current user is seller or admin
4. Check item status = OPEN
5. Find winning bid
6. If winning bid exists:
   - item.status = SOLD
   - item.winner_user_id = winningBid.bidder_id
   - item.final_price = winningBid.amount
   - create payment status = PENDING
7. If winning bid does not exist:
   - item.status = UNSOLD
8. Set closed_at = now
```
### Response if sold
```
{
  "status":200,
  "message":"Close auction item successfully",
  "data": {
    "itemId":"uuid",
    "status":"SOLD",
    "winnerUserId":"uuid",
    "finalPrice":1200000.00,
    "paymentId":"uuid"
  }
}
```
### Response if no bid
```
{
  "status":200,
  "message":"Close auction item successfully",
  "data": {
    "itemId":"uuid",
    "status":"UNSOLD",
    "winnerUserId":null,
    "finalPrice":null
  }
}
```
# 6. Bid APIs
## Place bid
```
POST /api/v1/auction-items/{itemId}/bids
```
### Authorization
```
USER
```
### Request
```
{
  "amount":1200000
}
```
### Backend flow
```
1. Get current user from JWT
2. Check user status = ACTIVE
3. Find user wallet
4. Check wallet status = ACTIVE
5. Find auction item
6. Lock auction item row using SELECT ... FOR UPDATE
7. Find auction session
8. Check session status = ACTIVE
9. Check item status = OPEN
10. Check current user is not the seller
11. Get session rules
12. Check amount >= item.current_price + min_increment
13. Check wallet.balance >= amount
14. Find old winning bid
15. If old winning bid exists:
    - update old bid status = OUTBID
    - release old bidder locked money
    - create wallet transaction BID_RELEASE
16. Create new bid with status = WINNING
17. Lock new bidder money
18. Create wallet transaction BID_HOLD
19. Update item.current_price = amount
20. Commit transaction
```
### Important
This API must use `@Transactional`.  
Also in repository, you should lock item row:
```
SELECT*FROM auction_itemsWHERE id= ?FORUPDATE;
```
### Response
```
{
  "status":201,
  "message":"Place bid successfully",
  "data": {
    "bidId":"uuid",
    "itemId":"uuid",
    "bidderId":"uuid",
    "amount":1200000.00,
    "status":"WINNING",
    "currentPrice":1200000.00
  }
}
```
## Get bid history of item
```
GET /api/v1/auction-items/{itemId}/bids
```
### Query params
```
GET /api/v1/auction-items/{itemId}/bids?page=0&size=20
```
### Response
```
{
  "status":200,
  "message":"Get bid history successfully",
  "data": {
    "items": [
      {
        "id":"uuid",
        "bidderId":"uuid",
        "amount":1200000.00,
        "status":"WINNING",
        "createdAt":"2026-07-10T09:30:00"
      },
      {
        "id":"uuid",
        "bidderId":"uuid",
        "amount":1100000.00,
        "status":"OUTBID",
        "createdAt":"2026-07-10T09:20:00"
      }
    ],
    "page":0,
    "size":20,
    "totalElements":2
  }
}
```
## Get my bids
```
GET /api/v1/bids/me
```
### Authorization
```
USER
```
### Response
```
{
  "status":200,
  "message":"Get my bids successfully",
  "data": [
    {
      "bidId":"uuid",
      "itemId":"uuid",
      "itemTitle":"iPhone 15 Pro Max",
      "amount":1200000.00,
      "status":"WINNING",
      "createdAt":"2026-07-10T09:30:00"
    }
  ]
}
```
# 7. Payment APIs
## Get my payments
```
GET /api/v1/payments/me
```
### Authorization
```
USER
```
### Response
```
{
  "status":200,
  "message":"Get my payments successfully",
  "data": [
    {
      "id":"uuid",
      "itemId":"uuid",
      "itemTitle":"iPhone 15 Pro Max",
      "amount":1200000.00,
      "currency":"VND",
      "status":"PENDING",
      "method":"WALLET",
      "createdAt":"2026-07-10T10:00:00"
    }
  ]
}
```
## Pay winning item
```
POST /api/v1/payments/{paymentId}/pay
```
### Authorization
```
USER
```
### Backend flow
```
1. Get current user
2. Find payment
3. Check payment.payer_id = current user id
4. Check payment status = PENDING
5. Find winner wallet
6. If bid money was already locked:
   - decrease locked_balance
7. Update payment status = SUCCESS
8. Set paid_at = now
9. Create wallet transaction type = PAYMENT
10. Find seller wallet
11. Increase seller wallet balance
12. Create wallet transaction type = SELLER_RECEIVE
```
### Response
```
{
  "status":200,
  "message":"Payment successfully",
  "data": {
    "paymentId":"uuid",
    "status":"SUCCESS",
    "amount":1200000.00,
    "paidAt":"2026-07-10T10:30:00"
  }
}
```
# 8. Admin APIs
## Get all users
```
GET /api/v1/admin/users
```
### Authorization
```
ADMIN only
```
## Get all sessions
```
GET /api/v1/admin/auction-sessions
```
### Authorization
```
ADMIN only
```
## Force cancel auction session
```
PATCH /api/v1/admin/auction-sessions/{sessionId}/cancel
```
### Authorization
```
ADMIN only
```
## Lock user wallet
```
PATCH /api/v1/admin/wallets/{walletId}/lock
```
### Authorization
```
ADMIN only
```
### Backend flow
```
1. Admin finds wallet
2. Update wallet.status = LOCKED
```
## Unlock user wallet
```
PATCH /api/v1/admin/wallets/{walletId}/unlock
```
### Authorization
```
ADMIN only
```
# 9. API summary table

|Feature|Method|Endpoint|Auth|  
|||||  
|Register|POST|`/api/v1/auth/register`|Public|  
|Login|POST|`/api/v1/auth/login`|Public|  
|Me|GET|`/api/v1/users/me`|USER/ADMIN|  
|My wallet|GET|`/api/v1/wallets/me`|USER/ADMIN|  
|Deposit|POST|`/api/v1/wallets/deposit`|USER|  
|Wallet history|GET|`/api/v1/wallets/transactions`|USER|  
|Create session|POST|`/api/v1/auction-sessions`|USER|  
|Create rules|POST|`/api/v1/auction-sessions/{sessionId}/rules`|USER|  
|Add item|POST|`/api/v1/auction-sessions/{sessionId}/items`|USER|  
|Publish session|PATCH|`/api/v1/auction-sessions/{sessionId}/publish`|USER|  
|List sessions|GET|`/api/v1/auction-sessions`|Public|  
|Session detail|GET|`/api/v1/auction-sessions/{sessionId}`|Public|  
|Item detail|GET|`/api/v1/auction-items/{itemId}`|Public|  
|Open item|PATCH|`/api/v1/auction-items/{itemId}/open`|Seller/Admin|  
|Close item|PATCH|`/api/v1/auction-items/{itemId}/close`|Seller/Admin|  
|Place bid|POST|`/api/v1/auction-items/{itemId}/bids`|USER|  
|Bid history|GET|`/api/v1/auction-items/{itemId}/bids`|Public|  
|My bids|GET|`/api/v1/bids/me`|USER|  
|My payments|GET|`/api/v1/payments/me`|USER|  
|Pay|POST|`/api/v1/payments/{paymentId}/pay`|USER|  
|Ban user|PATCH|`/api/v1/admin/users/{userId}/ban`|ADMIN|  
|Lock wallet|PATCH|`/api/v1/admin/wallets/{walletId}/lock`|ADMIN|
# 10. Recommended controller structure
chia controller như này:
```
AuthController
UserController
WalletController
AuctionSessionController
AuctionItemController
BidController
PaymentController
AdminUserController
AdminWalletController
AdminAuctionController
```
Package suggestion:
```
com.example.auction.auth
com.example.auction.user
com.example.auction.wallet
com.example.auction.auction.session
com.example.auction.auction.item
com.example.auction.bid
com.example.auction.payment
com.example.auction.admin
```
# 11. Standard response format
dùng một response chung:
```
{
  "status":200,
  "message":"Success",
  "data": {}
}
```
Java class:
```
public class ApiResponse<T> {
private int status;
private String message;
private <T> data;
}
```
# 12. Important backend rules
## Rule 1: User cannot bid on their own item
Khi đặt bid:
```
currentUser.id != auctionSession.sellerId
```
Nếu không, seller tự đẩy giá sản phẩm của mình lên.
## Rule 2: Place bid must use transaction
```
@Transactional
publicBidResponseplaceBid(UUIDitemId,UUIDbidderId,BigDecimalamount) {
// lock item
// check price
// create bid
// update wallet
// update item current price
}
```
## Rule 3: Only seller can manage their session
Ví dụ với API:
```
PATCH /api/v1/auction-items/{itemId}/open
```
Backend phải check:
```
auctionSession.sellerId == currentUser.id
or currentUser.role == ADMIN
```
## Rule 4: Wallet must be ACTIVE
Trước khi bid hoặc pay:
```
wallet.status = ACTIVE
```
## Rule 5: User must be ACTIVE
Trước khi tạo session, bid, pay:
```
user.status = ACTIVE
```
# 13. MVP coding order
code API theo thứ tự này:
```
1. Register
2. Login
3. Get my wallet
4. Deposit
5. Create auction session
6. Create rules
7. Add item
8. Publish session
9. Open item
10. Place bid
11. Close item
12. Pay
13. Wallet transaction history
14. Bid history
15. Admin lock/ban APIs
```
Core nhất là:
```
Create session
Add item
Deposit
Place bid
Close item
Pay
```