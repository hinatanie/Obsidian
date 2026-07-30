# Main Problem
Cursor has already implemented the WebSocket viewer-count feature, but its output mixes three different things:
```
1. Your original implementation requirements
2. Terminal/test output
3. Cursor’s final implementation summary
```
The important result is:
```
The WebSocket viewer tracking was created successfully.
Backend URL:
ws://localhost:8000/ws/auction-items/{itemId}
Frontend route:
 /auction-items/{id}
```
The feature now works like this:
```
User opens auction item page
    ↓
React opens WebSocket
    ↓
Backend stores that connection under itemId
    ↓
Backend counts connections
    ↓
Backend broadcasts VIEWER_COUNT_UPDATED
    ↓
All users viewing the same item see the new count
```

---
## Problem 1: Why is the frontend route different from your original route?
You originally asked for:
```
/auction-item/{itemId}
```
Cursor inspected your current React project and found that your existing route is:
```
/auction-items/{id}
```
Notice the difference:
```
Original request:
auction-item
Existing application:
auction-items
```
The existing route is plural.
## Solution
Cursor reused your existing route instead of creating a second conflicting route.  
So users open:
```
http://localhost:5173/auction-items/{itemId}
```
For example:
```
http://localhost:5173/auction-items/4381bbad-04ac-4088-b0b4-85fca226ef68
```
The React page then connects to:
```
ws://localhost:8000/ws/auction-items/4381bbad-04ac-4088-b0b4-85fca226ef68
```
These are two different URLs with two different purposes:
```
React page URL:
http://localhost:5173/auction-items/{itemId}
WebSocket backend URL:
ws://localhost:8000/ws/auction-items/{itemId}
```
The first displays the page.  
The second keeps the real-time connection open.

---
## Problem 2: Why did Cursor use port `8000` instead of `8080`?
Your prompt used:
```
ws://localhost:8080
```
But Cursor inspected your existing project and found that the backend currently runs on:
```
localhost:8000
```
## Solution
Cursor adapted the implementation to your actual project configuration.  
Your final URLs are:
```
REST:
http://localhost:8000/api/v1/auction-items/{itemId}
WebSocket:
ws://localhost:8000/ws/auction-items/{itemId}
```
Frontend environment:
```
VITE_WS_BASE_URL=ws://localhost:8000
```
This prevents the frontend from trying to connect to a backend port where nothing is running.

---
## Problem 3: What are all the created backend files doing?
Cursor created several files because each file has one responsibility.  
This is the Clean Architecture part.
## Solution
Understand them by following the runtime order rather than the folder order.
### 1. `realtime_connection.py`
```
backend/app/application/ports/realtime_connection.py
```
This defines what a real-time connection must be able to do:
```
accept
send JSON
receive text
close
```
Conceptually:
```
class RealtimeConnection(Protocol):
    async def accept(self) -> None: ...
    async def send_json(self, data: dict) -> None: ...
    async def receive_text(self) -> str: ...
    async def close(self, code: int = 1000) -> None: ...
```
It does not create a connection.  
It only describes the abilities required from a connection.  
FastAPI’s `WebSocket` already has these methods, so it can be passed wherever `RealtimeConnection` is expected.

---
### 2. `auction_connection_registry.py`
```
backend/app/application/ports/auction_connection_registry.py
```
This defines what the connection storage must support:
```
connect
disconnect
get viewer count
broadcast
```
It is an interface.  
It contains no real storage logic.  
Conceptually:
```
AuctionConnectionRegistry says:
“A connection registry must support these operations.”
```

---
### 3. `in_memory_auction_connection_registry.py`
```
backend/app/infrastructure/realtime/in_memory_auction_connection_registry.py
```
This is the real implementation of the registry.  
It stores something similar to:
```
{
    item_id_1: {
        websocket_a,
        websocket_b,
    },
    item_id_2: {
        websocket_c,
    },
}
```
Example:
```
Item 123
    ├── Tab A
    └── Tab B
Item 999
    └── Tab C
```
Therefore:
```
viewer count for Item 123 = 2
viewer count for Item 999 = 1
```
This file performs the actual connection management.

---
### 4. `auction_item_event.py`
```
backend/app/domain/events/auction_item_event.py
```
This defines the common WebSocket message structure.  
Example:
```
{
  "type": "VIEWER_COUNT_UPDATED",
  "itemId": "4381bbad-04ac-4088-b0b4-85fca226ef68",
  "timestamp": "2026-07-23T12:00:00Z",
  "data": {
    "viewerCount": 2
  }
}
```
The purpose is to guarantee consistent field names:
```
type
itemId
timestamp
data
```

---
### 5. `viewer_count_updated_event.py`
```
backend/app/domain/events/viewer_count_updated_event.py
```
This builds the specific viewer-count message.  
Conceptually:
```
event = create_viewer_count_updated_event(
    item_id=item_id,
    viewer_count=2,
)
```
It returns:
```
{
  "type": "VIEWER_COUNT_UPDATED",
  "itemId": "...",
  "timestamp": "...",
  "data": {
    "viewerCount": 2
  }
}
```
This function creates the message but does not send it.

---
### 6. `auction_event_publisher.py`
```
backend/app/application/ports/auction_event_publisher.py
```
This is the publisher interface.  
It says:
```
An event publisher must provide publish(item_id, event).
```
It does not send anything itself.

---
### 7. `websocket_auction_event_publisher.py`
```
backend/app/infrastructure/realtime/websocket_auction_event_publisher.py
```
This is the real publisher implementation.  
It performs:
```
AuctionItemEvent
    ↓
Convert to JSON dictionary
    ↓
Call registry.broadcast()
```
Conceptually:
```
message = event.model_dump(
    mode="json",
    by_alias=True,
)
await registry.broadcast(
    item_id=item_id,
    message=message,
)
```

---
### 8. `join_auction_item.py`
```
backend/app/application/use_cases/realtime/join_auction_item.py
```
This controls what happens when a user opens an auction page.  
Its flow is:
```
Check item exists
    ↓
Accept WebSocket
    ↓
Store connection
    ↓
Calculate viewer count
    ↓
Create VIEWER_COUNT_UPDATED
    ↓
Broadcast count to everyone
```
For example:
```
Before join: 1 viewer
New user joins
After join: 2 viewers
Broadcast viewerCount = 2
```

---
### 9. `leave_auction_item.py`
```
backend/app/application/use_cases/realtime/leave_auction_item.py
```
This controls what happens when the user closes or leaves the page.  
Its flow is:
```
Remove connection
    ↓
Calculate viewer count
    ↓
Create VIEWER_COUNT_UPDATED
    ↓
Broadcast count to remaining viewers
```
For example:
```
Before leave: 2 viewers
One user closes tab
After leave: 1 viewer
Broadcast viewerCount = 1
```

---
### 10. `realtime_dependencies.py`
```
backend/app/dependencies/realtime_dependencies.py
```
This creates one shared registry and one shared publisher.  
This part is very important.  
Conceptually:
```
connection_registry = InMemoryAuctionConnectionRegistry()
event_publisher = WebSocketAuctionEventPublisher(
    connection_registry=connection_registry,
)
```
Every WebSocket connection uses the same registry.  
If each connection received a new registry, viewer counting would fail.

---
### 11. `auction_item_websocket_router.py`
```
backend/app/presentation/websocket/auction_item_websocket_router.py
```
This exposes the endpoint:
```
/ws/auction-items/{itemId}
```
Its job is only to manage the WebSocket lifecycle:
```
Receive connection
    ↓
Call join use case
    ↓
Wait for messages
    ↓
Reply to ping
    ↓
Detect disconnect
    ↓
Call leave use case
```
It does not store connections or count users itself.

---
## Problem 4: What does “single shared registry” mean?
Cursor wrote:
```
Single shared registry + publisher in realtime_dependencies.py
```
Suppose User A opens the page.  
If the router creates registry A:
```
Registry A:
item123 → User A
```
Then User B opens the page and receives a separate registry B:
```
Registry B:
item123 → User B
```
Each registry sees only one user.  
Both users would incorrectly see:
```
viewerCount = 1
```
## Solution
Create one registry once:
```
auction_connection_registry = (
    InMemoryAuctionConnectionRegistry()
)
```
Then both users are placed in the same object:
```
Shared registry:
item123
    ├── User A
    └── User B
```
Now:
```
viewerCount = 2
```
That is why Cursor emphasized:
```
not per WebSocket request
```

---
## Problem 5: What does `JoinAuctionItemResult(accepted=...)` solve?
An item ID might not exist.  
For example, someone tries to connect to:
```
/ws/auction-items/fake-item-id
```
The join use case checks MySQL.  
If the item does not exist, it closes the connection with:
```
WebSocket code 1008
```
But the router needs to know whether it should continue waiting for messages.
## Solution
The join use case returns a result like:
```
JoinAuctionItemResult(
    accepted=False,
)
```
The router can then stop:
```
result = await join_use_case.execute(...)
if not result.accepted:
    return
```
Without that result, the router might do this after the connection was already rejected:
```
await websocket.receive_text()
```
That would cause unnecessary errors.  
Cause and effect:
```
Invalid item
    ↓
Join returns accepted=False
    ↓
Router exits
    ↓
No receive loop starts
```

---
## Problem 6: What does the `leave_once` guard solve?
A WebSocket can fail in different ways:
```
Normal WebSocketDisconnect
Unexpected exception
Send error
Connection closed by browser
```
Sometimes more than one cleanup path may run.  
Without protection:
```
leave use case runs once
    ↓
connection removed
    ↓
leave use case runs again
    ↓
viewer count may be broadcast unnecessarily
```
## Solution
Cursor added a `leave_once` guard.  
Conceptually:
```
left = False
async def leave_once() -> None:
    nonlocal left
    if left:
        return
    left = True
    await leave_use_case.execute(...)
```
Now the connection cleanup happens only once.

---
## Problem 7: Why does broadcast copy the connections while holding the lock?
Cursor wrote:
```
Broadcast copies connections under lock, sends outside the lock,
then prunes failed sockets.
```
Multiple users can connect and disconnect at nearly the same time.  
The dictionary of connections is shared mutable data.  
Therefore, changing and reading it concurrently can produce inconsistent behavior.
## Solution
Use the lock only while reading or changing the collection:
```
Acquire lock
    ↓
Copy connections
    ↓
Release lock
    ↓
Send messages
```
Conceptually:
```
async with self._lock:
    connections = list(
        self._connections.get(item_id, set())
    )
for connection in connections:
    await connection.send_json(message)
```
Do not do:
```
async with self._lock:
    for connection in connections:
        await connection.send_json(message)
```
Network sending may be slow.  
If the lock remains held, other users cannot join or leave until sending finishes.

---
## Problem 8: How does Cursor check whether the auction item exists?
Cursor modified:
```
backend/modules/auction_items/item_repository.py
```
and added:
```
async def exists(item_id: UUID) -> bool
```
The goal is only to answer:
```
Does this item exist?
```
It does not need the full item title, price, seller, images, and description.
## Solution
Use a SQL `EXISTS` query.  
Conceptually:
```
statement = select(
    exists().where(AuctionItem.id == item_id)
)
result = await session.execute(statement)
return bool(result.scalar())
```
This is more efficient than loading the complete auction item.

---
## Problem 9: What are the frontend files doing?
Cursor created:
```
auctionItemSocketClient.ts
useAuctionItemRealtime.ts
```
They solve different problems.
## Solution
### `auctionItemSocketClient.ts`
This manages the low-level WebSocket connection:
```
Connect
Parse messages
Send heartbeat
Reconnect
Disconnect
Clear timers
```
Conceptually:
```
const socket = new WebSocket(
  `${baseUrl}/ws/auction-items/${itemId}`,
);
```
When a message arrives:
```
socket.onmessage = message => {
  const event = JSON.parse(message.data);
  if (event.type === 'VIEWER_COUNT_UPDATED') {
    // pass the count to React
  }
};
```
It also sends:
```
ping
```
every 25 seconds to keep the connection active.

---
### `useAuctionItemRealtime.ts`
This connects the WebSocket client to React state.  
It returns:
```
{
  viewerCount,
  isConnected,
}
```
The page can use:
```
const {
  viewerCount,
  isConnected,
} = useAuctionItemRealtime(itemId);
```
Then display:
```
<span>
  {isConnected ? 'Live' : 'Reconnecting...'}
</span>
<span>
  {viewerCount} people watching
</span>
```
When the component unmounts, the hook closes the WebSocket.  
That triggers the backend leave flow.

---
## Problem 10: What does the frontend environment variable do?
Cursor added:
```
VITE_WS_BASE_URL=ws://localhost:8000
```
Without this, the frontend does not know where the WebSocket backend is running.
## Solution
Create:
```
frontend/.env.local
```
Add:
```
VITE_WS_BASE_URL=ws://localhost:8000
```
Then restart the frontend development server because Vite reads environment variables at startup.
```
npm run dev
```
The full WebSocket URL is built as:
```
`${import.meta.env.VITE_WS_BASE_URL}/ws/auction-items/${itemId}`
```
For example:
```
ws://localhost:8000/ws/auction-items/4381bbad-04ac-4088-b0b4-85fca226ef68
```

---
## Problem 11: What does the strange PowerShell error mean?
Your pasted output includes:
```
Add-Content -Path $OutputFile -Value $Content -Encoding UTF8
CategoryInfo : InvalidArgument
GetContentWriterArgumentError
```
This appears to be a Cursor or PowerShell temporary-output error.  
It is related to writing content into a temporary file such as:
```
C:\Users\ADMIN\...\37dcba06d3f.txt
```
It is not a WebSocket runtime error.
## Solution
Judge the implementation using the actual checks reported afterward:
```
Backend tests: 11 passed
Frontend typecheck/test completed
Files were created and modified
```
Still, you should verify the repository files actually exist.  
In PowerShell:
```
Test-Path backend/app/presentation/websocket/auction_item_websocket_router.py
Test-Path frontend/src/features/auction-items/hooks/useAuctionItemRealtime.ts
```
You can also inspect Git changes:
```
git status
git diff --stat
```
The `Add-Content` error may mean Cursor failed to save one temporary command-output file, not necessarily your source code.

---
## Problem 12: What do the strange test fragments mean?
The pasted output includes fragments such as:
```
assert await registry.get_viewer_count(item_id) == 2
assert first.sent_messages[-1]["data"]["viewerCount"] == 1
```
These are lines from backend tests.  
They check that the implementation behaves correctly.
## Solution
Read them as expected behaviors.
### This assertion:
```
assert await registry.get_viewer_count(item_id) == 2
```
means:
```
After two clients connect to the same item,
the registry must report 2 viewers.
```
### This assertion:
```
assert first.sent_messages[-1]["data"]["viewerCount"] == 1
```
means:
```
After one viewer leaves,
the remaining client must receive viewerCount = 1.
```
### This assertion:
```
assert first.sent_messages[-1]["data"]["viewerCount"] == 2
```
means:
```
After the second client joins,
the first client must also receive viewerCount = 2.
```
That last check is important because the viewer count should be sent to the entire room, not only to the new viewer.

---
## Problem 13: Why does this implementation require one Uvicorn worker?
The connection registry is stored in Python memory:
```
{
    item_id: {connections}
}
```
Each Uvicorn worker is a separate process with separate memory.  
Suppose there are two workers:
```
Worker 1:
item123 → User A
Worker 2:
item123 → User B
```
Worker 1 counts one viewer.  
Worker 2 also counts one viewer.  
Neither knows the total is two.
## Solution
Run one worker for now:
```
python -m uvicorn app.main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --workers 1
```
On PowerShell, use one line:
```
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1
```
Later, Redis can store shared presence across workers.  
For your first version, one worker is correct.

---
## Problem 14: How should you test the full feature manually?
Automated tests confirm individual code behavior, but you also need to see the real page update.
## Solution
### Step 1: Start MySQL and backend
Using Docker:
```
docker compose up -d mysql backend
```
Or run backend locally:
```
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1
```
### Step 2: Configure frontend
Create or update:
```
frontend/.env.local
```
```
VITE_WS_BASE_URL=ws://localhost:8000
```
### Step 3: Start frontend
```
cd frontend
npm install
npm run dev
```
### Step 4: Open a valid auction item
Open the exact same valid URL in two tabs:
```
http://localhost:5173/auction-items/{valid-item-uuid}
```
### Step 5: Check expected result
First tab:
```
Live · 1 person watching
```
After opening the second tab:
```
Live · 2 people watching
```
Both tabs should show `2`.  
After closing one tab, the remaining tab should show:
```
Live · 1 person watching
```

---
# Common Wrong Approach 1: Testing with `item123`
Your database uses UUID item IDs.  
This example:
```
/auction-items/item123
```
may not work because `item123` is not a valid UUID and likely does not exist.
## Solution
Use a real auction item UUID from your database or API response:
```
/auction-items/4381bbad-04ac-4088-b0b4-85fca226ef68
```
Otherwise, the WebSocket should close with code `1008`.

---
# Common Wrong Approach 2: Opening different auction items
If Tab A opens:
```
/auction-items/item-a
```
and Tab B opens:
```
/auction-items/item-b
```
each item should show:
```
1 viewer
```
That is correct because WebSocket rooms are isolated by `itemId`.  
To test count `2`, both tabs must use the exact same item UUID.

---
# Common Wrong Approach 3: Using multiple backend workers
This breaks the in-memory count:
```
uvicorn app.main:app --workers 4
```
Use:
```
uvicorn app.main:app --workers 1
```
until Redis is added.

---
# Common Wrong Approach 4: Forgetting to restart Vite
Changing:
```
VITE_WS_BASE_URL=ws://localhost:8000
```
does not always affect an already-running Vite process.  
Restart it:
```
Ctrl+C
npm run dev
```

---
# Complete Execution Flow
```
User opens /auction-items/{itemId}
    ↓
AuctionDetailPage loads
    ↓
useAuctionItemRealtime receives itemId
    ↓
AuctionItemSocketClient opens:
ws://localhost:8000/ws/auction-items/{itemId}
    ↓
FastAPI WebSocket router receives connection
    ↓
JoinAuctionItemUseCase checks item exists
    ↓
InMemoryAuctionConnectionRegistry accepts and stores connection
    ↓
Registry calculates viewer count
    ↓
create_viewer_count_updated_event() creates event
    ↓
WebSocketAuctionEventPublisher publishes event
    ↓
Registry broadcasts event to all connections for that item
    ↓
React receives VIEWER_COUNT_UPDATED
    ↓
Page shows “Live · 2 people watching”
    ↓
User closes tab
    ↓
WebSocket disconnects
    ↓
LeaveAuctionItemUseCase removes connection
    ↓
New viewer count is broadcast
    ↓
Remaining page shows “Live · 1 person watching”
```
The simplest summary is:
```
Registry stores the connected tabs.
Join use case adds a tab.
Leave use case removes a tab.
Publisher sends the new count.
React displays the count.
```