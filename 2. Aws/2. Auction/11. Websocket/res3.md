# Main Problem
You now need to test the **complete browser flow**:
```
Frontend React page
    → connects to FastAPI WebSocket
    → receives AUCTION_ITEM_SNAPSHOT
    → receives VIEWER_COUNT_UPDATED
    → receives BID_PLACED after a REST bid succeeds
```
Use one real auction item ID from your database.
# Problem 1: Start the full application
## Solution
From the project root:
```
docker compose up -d
```
Check the containers:
```
docker compose ps
```
You should see MySQL, backend, and frontend running.
Watch backend logs in a separate terminal:
```
docker compose logs backend -f
```
Make sure the backend uses only one Uvicorn worker because your viewer registry is stored in memory.
# Problem 2: Open a real auction item
## Solution
Use an existing auction item UUID.
You can get one from MySQL:
```
docker compose exec mysql mysql -u root -p
```
Then:
```
USE your_database_name;
SELECT id, title, current_price, status
FROM auction_items
LIMIT 10;
```
Copy one item ID and open:
```
http://localhost:5173/auction-item/YOUR_ITEM_ID
```
For example:
```
http://localhost:5173/auction-item/fb2e25d8-46cf-4fb8-becd-ab12c0e8cbf8
```
The item must exist, or the WebSocket should close with code `1008`.
# Problem 3: Inspect the WebSocket connection
## Solution
In Chrome:
```
F12
→ Network
→ WS
```
Refresh the auction item page.
You should see a connection similar to:
```
ws://localhost:8080/ws/auction-items/YOUR_ITEM_ID
```
Click that connection and open the **Messages** tab.
After connecting, you should receive an initial snapshot similar to:
```
{
  "type": "AUCTION_ITEM_SNAPSHOT",
  "itemId": "your-item-id",
  "timestamp": "2026-08-04T09:30:00Z",
  "data": {
    "status": "OPEN",
    "currentPrice": "51000000.00",
    "startingPrice": "50000000.00",
    "minIncrement": "1000000.00",
    "openedAt": "2026-08-04T09:00:00Z",
    "closedAt": "2026-08-04T10:00:00Z"
  }
}
```
You should also receive:
```
{
  "type": "VIEWER_COUNT_UPDATED",
  "itemId": "your-item-id",
  "timestamp": "2026-08-04T09:30:00Z",
  "data": {
    "viewerCount": 1
  }
}
```
Approximately every 25 seconds, you should see:
```
ping
```
and:
```
PONG
```
# Problem 4: Test viewer count with two tabs
## Solution
Open the same auction item URL in Tab 1:
```
http://localhost:5173/auction-item/YOUR_ITEM_ID
```
Expected:
```
Live
1 person watching
```
Open exactly the same URL in Tab 2.
Expected in both tabs:
```
Live
2 people watching
```
Now close Tab 2.
Expected in Tab 1:
```
Live
1 person watching
```
This verifies:
```
JoinAuctionItemUseCase
LeaveAuctionItemUseCase
Shared registry
Viewer-count broadcasting
Frontend viewer-count handling
```
# Problem 5: Test the initial snapshot
## Solution
Before opening the page, note the database value:
```
SELECT id, current_price, starting_price, status
FROM auction_items
WHERE id = 'YOUR_ITEM_ID';
```
Then open the page and compare the displayed values with the WebSocket message.
Check:
```
[ ] status matches
[ ] currentPrice matches
[ ] startingPrice matches
[ ] minIncrement matches the session rule
[ ] openedAt and closedAt are correct
```
The WebSocket Messages panel should show `AUCTION_ITEM_SNAPSHOT`.
The UI should update its real-time-sensitive fields from that snapshot.
# Problem 6: Test BID_PLACED through the real UI
## Solution
Use two browser sessions:
```
Browser session A → watches the auction item
Browser session B → places the bid
```
A convenient setup is:
```
Normal Chrome window    → User A
Incognito Chrome window → User B
```
This allows you to log in as two different users.
Make sure:
```
The auction session is ACTIVE
The auction item is OPEN
The current time is inside the auction window
User B is not the seller
User B has ACTIVE status
The amount satisfies minIncrement
```
Example:
```
Current price: 50,000,000 ₫
Minimum increment: 1,000,000 ₫
Valid next bid: at least 51,000,000 ₫
```
In User B’s browser, enter the valid amount and submit the bid using the existing frontend bid form.
# Problem 7: Verify the bid broadcast
## Solution
Immediately after the bid REST request succeeds, both auction item tabs should receive:
```
{
  "type": "BID_PLACED",
  "itemId": "your-item-id",
  "timestamp": "2026-08-04T09:35:00Z",
  "data": {
    "bidId": "bid-uuid",
    "amount": "51000000.00",
    "currentPrice": "51000000.00",
    "placedAt": "2026-08-04T09:35:00Z"
  }
}
```
Check Chrome:
```
F12
→ Network
→ WS
→ Messages
```
The UI should update without refreshing:
```
Old current price: 50,000,000 ₫
New current price: 51,000,000 ₫
```
The latest bid display should also update if Cursor implemented it.
The correct complete flow is:
```
User submits bid
    ↓
POST /api/v1/auction-items/{itemId}/bids
    ↓
REST response succeeds
    ↓
Database transaction commits
    ↓
BID_PLACED appears in WebSocket Messages
    ↓
Current price updates in both tabs
```
# Problem 8: Inspect both REST and WebSocket traffic
## Solution
In Chrome Network, you should see two separate things.
### REST request
Filter by:
```
Fetch/XHR
```
Find:
```
POST /api/v1/auction-items/{itemId}/bids
```
Check:
```
Status: 200 or 201
```
Inspect the response to confirm the new bid and current price.
### WebSocket event
Filter by:
```
WS
```
Open the socket and check for:
```
BID_PLACED
```
The REST request creates the bid. The WebSocket only broadcasts the result.
# Problem 9: Test invalid bids
## Solution
Try a bid lower than the required minimum.
Example:
```
Current price: 50,000,000 ₫
Minimum increment: 1,000,000 ₫
Attempted bid: 50,500,000 ₫
```
Expected:
```
REST request fails with 400 or 409
No BID_PLACED WebSocket event
Current price remains unchanged
```
This is very important.
A failed bid must never produce:
```
{
  "type": "BID_PLACED"
}
```
Also test bidding as the seller.
Expected:
```
REST request fails
No WebSocket BID_PLACED event
```
# Problem 10: Test room isolation
## Solution
Open:
```
Tab 1 → /auction-item/item-A
Tab 2 → /auction-item/item-B
```
Place a bid on item A.
Expected:
```
Tab 1 receives BID_PLACED for item A
Tab 2 receives nothing for item A
```
In Tab 2’s WebSocket Messages panel, there must not be an event containing:
```
{
  "itemId": "item-A"
}
```
This confirms that broadcasts are isolated by auction item room.
# Problem 11: Test reconnection
## Solution
Keep the auction page open.
Stop the backend:
```
docker compose stop backend
```
Expected frontend:
```
Reconnecting...
```
Start it again:
```
docker compose start backend
```
Expected:
```
WebSocket reconnects
AUCTION_ITEM_SNAPSHOT is received again
VIEWER_COUNT_UPDATED is received again
UI shows the latest database price
```
In Chrome:
```
F12 → Network → WS
```
There should only be one active WebSocket after reconnection stabilizes.
If many connections keep appearing, the frontend may have duplicate reconnect timers.
# Problem 12: Test item navigation
## Solution
Open item A:
```
/auction-item/item-A
```
Then navigate to item B without closing the browser tab:
```
/auction-item/item-B
```
Expected:
```
Old item-A socket closes
New item-B socket opens
Item A viewer count decreases
Item B viewer count increases
Snapshot state resets to item B
```
Check the Network panel. The old socket should be closed rather than remaining active.
# Problem 13: Test invalid item handling
## Solution
Open:
```
http://localhost:5173/auction-item/00000000-0000-0000-0000-000000000000
```
Check:
```
F12 → Network → WS
```
The connection should close with:
```
Code: 1008
```
The frontend should not display a valid live auction state for that nonexistent item.
# Problem 14: Watch backend logs during testing
## Solution
Keep this running:
```
docker compose logs backend -f
```
You should see logs for:
```
WebSocket connected
WebSocket disconnected
Snapshot sent
Viewer count changed
BID_PLACED published
Invalid auction item
Unexpected send failure
```
Useful values include:
```
item_id
bid_id
viewer_count
event_type
```
You should not see passwords, JWT tokens, or private user details.
# Manual testing checklist
```
[ ] Frontend page opens successfully
[ ] WebSocket status is 101 Switching Protocols
[ ] AUCTION_ITEM_SNAPSHOT is received
[ ] VIEWER_COUNT_UPDATED starts at 1
[ ] Second tab changes viewerCount to 2
[ ] Closing second tab changes viewerCount to 1
[ ] Valid bid REST request succeeds
[ ] BID_PLACED is received by all viewers of that item
[ ] Current price changes without refreshing
[ ] Invalid bid does not broadcast BID_PLACED
[ ] Bid for item A does not reach item B
[ ] Backend interruption displays Reconnecting...
[ ] Reconnection receives a fresh snapshot
[ ] Item navigation closes the previous socket
[ ] Invalid item closes with code 1008
```
# Complete manual workflow
```
Start Docker services
    ↓
Find a real OPEN auction item
    ↓
Open the item page
    ↓
Inspect Network → WS → Messages
    ↓
Confirm SNAPSHOT and viewerCount 1
    ↓
Open a second tab
    ↓
Confirm viewerCount 2
    ↓
Place a valid bid from another user
    ↓
Confirm REST success
    ↓
Confirm BID_PLACED in both WebSockets
    ↓
Confirm current price changes without refresh
    ↓
Try an invalid bid
    ↓
Confirm no WebSocket bid event
    ↓
Close one tab
    ↓
Confirm viewerCount returns to 1
```