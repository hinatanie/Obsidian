Below is a practical implementation roadmap for your existing:
FastAPI + Async SQLAlchemy + React + MySQL auction project.
The main rule is:
REST API changes auction data. WebSocket only distributes committed changes. Do not put bidding business logic inside the WebSocket endpoint.
Final architecture 
```
┌──────────────────────┐
│ React Auction Page   │
│ /auction-items/:id   │
└──────────┬───────────┘
           │
           ├── REST
           │   GET item detail
           │   POST place bid
           │
           └── WebSocket
               Receive live events
                    │
                    ▼
┌────────────────────────────────────────┐
│ Presentation Layer                     │
│ REST Router + WebSocket Router         │
└──────────────────┬─────────────────────┘
                   ▼
┌────────────────────────────────────────┐
│ Application Layer                      │
│ PlaceBidUseCase                        │
│ JoinAuctionItemUseCase                 │
│ PublishAuctionEventUseCase             │
└──────────────────┬─────────────────────┘
                   ▼
┌────────────────────────────────────────┐
│ Domain Layer                           │
│ AuctionItemEvent                       │
│ BidPlacedEvent                         │
│ ViewerCountChangedEvent                │
└──────────────────┬─────────────────────┘
                   ▼
┌────────────────────────────────────────┐
│ Infrastructure Layer                   │
│ SQLAlchemy repositories                │
│ WebSocket connection manager           │
│ In-memory event publisher / Redis      │
└────────────────────────────────────────┘
```
## Stage 1 — Define the real-time requirements Before writing code, define exactly what the page must update.
For /auction-items/{itemId}, support these events:
VIEWER_COUNT_UPDATED BID_PLACED ITEM_STATUS_UPDATED AUCTION_ENDED Recommended first version:
Stage 1 scope:
- Count active WebSocket connections.
- Update current price.
- Add the newest bid.
- Update total bid count.
- Show connection status. Do not start with every possible auction event. First make the bidding flow reliable.
## Stage 2 — Define event contracts in the domain layer
```
app/domain/events/
├── auction_item_event.py
├── bid_placed_event.py
├── viewer_count_updated_event.py
└── item_status_updated_event.py
```
Base event
```
# app/domain/events/auction_item_event.py
from datetime import datetime
from enum import Enum
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class AuctionItemEventType(str, Enum):
    VIEWER_COUNT_UPDATED = "VIEWER_COUNT_UPDATED"
    BID_PLACED = "BID_PLACED"
    ITEM_STATUS_UPDATED = "ITEM_STATUS_UPDATED"
    AUCTION_ENDED = "AUCTION_ENDED"


class AuctionItemEvent(BaseModel):
    type: AuctionItemEventType
    item_id: UUID = Field(alias="itemId")
    timestamp: datetime
    data: dict[str, Any]

    model_config = {
        "populate_by_name": True,
    }
```
This gives every event one consistent envelope:
```
{
  "type": "BID_PLACED",
  "itemId": "item-uuid",
  "timestamp": "2026-07-22T06:30:00Z",
  "data": {}
}
```
## Stage 3 — Create specific domain events
### Bid placed event
```
## app/domain/events/bid_placed_event.py
from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID
from app.domain.events.auction_item_event import (
    AuctionItemEvent,
    AuctionItemEventType,
)
def create_bid_placed_event(
    *,
    item_id: UUID,
    bid_id: UUID,
    bidder_id: UUID,
    bidder_name: str,
    amount: Decimal,
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
            "amount": str(amount),
            "currentPrice": str(current_price),
            "totalBids": total_bids,
        },
    )
```
### Viewer count event
```
## app/domain/events/viewer_count_updated_event.py
from datetime import datetime, timezone
from uuid import UUID
from app.domain.events.auction_item_event import (
    AuctionItemEvent,
    AuctionItemEventType,
)
def create_viewer_count_updated_event(
    *,
    item_id: UUID,
    viewer_count: int,
) -> AuctionItemEvent:
    return AuctionItemEvent(
        type=AuctionItemEventType.VIEWER_COUNT_UPDATED,
        itemId=item_id,
        timestamp=datetime.now(timezone.utc),
        data={
            "viewerCount": viewer_count,
        },
    )
```
### Why use factory functions?
Without factory functions, your routers may repeatedly build dictionaries:
```
{
    "type": "BID_PLACED",
    "itemId": ...,
    "data": ...
}
```
That creates inconsistent field names and duplicated code.
The factory guarantees the event format.

---
## Stage 4 — Define the event publisher interface
The application layer should not know whether you use:
- In-memory WebSockets.
- Redis Pub/Sub.
- RabbitMQ.
- Kafka.
Create a port:
```
app/application/ports/
└── auction_event_publisher.py
```
```
## app/application/ports/auction_event_publisher.py
from abc import ABC, abstractmethod
from uuid import UUID
from app.domain.events.auction_item_event import AuctionItemEvent
class AuctionEventPublisher(ABC):
    @abstractmethod
    async def publish(
        self,
        item_id: UUID,
        event: AuctionItemEvent,
    ) -> None:
        raise NotImplementedError
```
This is dependency inversion.
Your use case depends on the interface:
```
AuctionEventPublisher
```
not directly on:
```
FastAPI WebSocket
Redis
ConnectionManager
```


## Stage 5 — Create a WebSocket connection abstraction
Create:
```
app/application/ports/
└── auction_connection_registry.py
```
```
### app/application/ports/auction_connection_registry.py
from abc import ABC, abstractmethod
from uuid import UUID
from fastapi import WebSocket
class AuctionConnectionRegistry(ABC):
    @abstractmethod
    async def connect(
        self,
        item_id: UUID,
        websocket: WebSocket,
    ) -> None:
        raise NotImplementedError
    @abstractmethod
    async def disconnect(
        self,
        item_id: UUID,
        websocket: WebSocket,
    ) -> None:
        raise NotImplementedError
    @abstractmethod
    async def get_viewer_count(
        self,
        item_id: UUID,
    ) -> int:
        raise NotImplementedError
    @abstractmethod
    async def broadcast(
        self,
        item_id: UUID,
        message: dict,
    ) -> None:
        raise NotImplementedError
```
Strict Clean Architecture may avoid importing `FastAPI WebSocket` in the application layer. For your project, a cleaner version is to define a generic connection protocol.
```
### app/application/ports/realtime_connection.py
from typing import Protocol
class RealtimeConnection(Protocol):
    async def accept(self) -> None: ...
    async def send_json(self, data: dict) -> None: ...
    async def receive_text(self) -> str: ...
    async def close(self, code: int = 1000) -> None: ...
```
Then use:
```
from uuid import UUID
from app.application.ports.realtime_connection import RealtimeConnection
class AuctionConnectionRegistry(ABC):
    @abstractmethod
    async def connect(
        self,
        item_id: UUID,
        connection: RealtimeConnection,
    ) -> None:
        ...
```
This keeps FastAPI out of your core layers.

---
## Stage 6 — Implement the in-memory connection registry
Create:
```
app/infrastructure/realtime/
├── in_memory_auction_connection_registry.py
└── websocket_auction_event_publisher.py
```
```
### app/infrastructure/realtime/in_memory_auction_connection_registry.py
import asyncio
from collections import defaultdict
from uuid import UUID
from app.application.ports.realtime_connection import RealtimeConnection
class InMemoryAuctionConnectionRegistry:
    def __init__(self) -> None:
        self._connections: dict[
            UUID,
            set[RealtimeConnection],
        ] = defaultdict(set)
        self._lock = asyncio.Lock()
    async def connect(
        self,
        item_id: UUID,
        connection: RealtimeConnection,
    ) -> None:
        await connection.accept()
        async with self._lock:
            self._connections[item_id].add(connection)
    async def disconnect(
        self,
        item_id: UUID,
        connection: RealtimeConnection,
    ) -> None:
        async with self._lock:
            connections = self._connections.get(item_id)
            if not connections:
                return
            connections.discard(connection)
            if not connections:
                self._connections.pop(item_id, None)
    async def get_viewer_count(
        self,
        item_id: UUID,
    ) -> int:
        async with self._lock:
            return len(self._connections.get(item_id, set()))
    async def broadcast(
        self,
        item_id: UUID,
        message: dict,
    ) -> None:
        async with self._lock:
            connections = list(
                self._connections.get(item_id, set())
            )
        disconnected_connections: list[RealtimeConnection] = []
        for connection in connections:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected_connections.append(connection)
        for connection in disconnected_connections:
            await self.disconnect(item_id, connection)
```
#### Why copy the connection list?
Do not hold the lock while sending:
```
async with self._lock:
    for connection in connections:
        await connection.send_json(...)
```
A slow client could block all connection changes.
The correct flow is:
```
1. Lock.
2. Copy connections.
3. Unlock.
4. Send messages.
```

## Stage 7 — Implement the event publisher adapter
```
##### app/infrastructure/realtime/websocket_auction_event_publisher.py
from uuid import UUID
from app.domain.events.auction_item_event import AuctionItemEvent
from app.infrastructure.realtime.in_memory_auction_connection_registry import (
    InMemoryAuctionConnectionRegistry,
)
class WebSocketAuctionEventPublisher:
    def __init__(
        self,
        registry: InMemoryAuctionConnectionRegistry,
    ) -> None:
        self._registry = registry
    async def publish(
        self,
        item_id: UUID,
        event: AuctionItemEvent,
    ) -> None:
        message = event.model_dump(
            mode="json",
            by_alias=True,
        )
        await self._registry.broadcast(
            item_id=item_id,
            message=message,
        )
```
Now the application layer can call:
```
await event_publisher.publish(item_id, event)
```
without knowing how WebSocket broadcasting works.

---
## Stage 8 — Create the connection use case
Create:
```
app/application/use_cases/realtime/
├── join_auction_item.py
└── leave_auction_item.py
```
###### Join use case
```
##### app/application/use_cases/realtime/join_auction_item.py
from uuid import UUID
from app.application.ports.realtime_connection import RealtimeConnection
from app.domain.events.viewer_count_updated_event import (
    create_viewer_count_updated_event,
)
class JoinAuctionItemUseCase:
    def __init__(
        self,
        connection_registry,
        event_publisher,
        auction_item_repository,
    ) -> None:
        self._connection_registry = connection_registry
        self._event_publisher = event_publisher
        self._auction_item_repository = auction_item_repository
    async def execute(
        self,
        *,
        item_id: UUID,
        connection: RealtimeConnection,
    ) -> None:
        item_exists = await self._auction_item_repository.exists(item_id)
        if not item_exists:
            await connection.close(code=1008)
            return
        await self._connection_registry.connect(
            item_id=item_id,
            connection=connection,
        )
        viewer_count = (
            await self._connection_registry.get_viewer_count(item_id)
        )
        event = create_viewer_count_updated_event(
            item_id=item_id,
            viewer_count=viewer_count,
        )
        await self._event_publisher.publish(item_id, event)
```
###### Leave use case
```
##### app/application/use_cases/realtime/leave_auction_item.py
from uuid import UUID
from app.application.ports.realtime_connection import RealtimeConnection
from app.domain.events.viewer_count_updated_event import (
    create_viewer_count_updated_event,
)
class LeaveAuctionItemUseCase:
    def __init__(
        self,
        connection_registry,
        event_publisher,
    ) -> None:
        self._connection_registry = connection_registry
        self._event_publisher = event_publisher
    async def execute(
        self,
        *,
        item_id: UUID,
        connection: RealtimeConnection,
    ) -> None:
        await self._connection_registry.disconnect(
            item_id=item_id,
            connection=connection,
        )
        viewer_count = (
            await self._connection_registry.get_viewer_count(item_id)
        )
        event = create_viewer_count_updated_event(
            item_id=item_id,
            viewer_count=viewer_count,
        )
        await self._event_publisher.publish(item_id, event)
```

---
## Stage 9 — Add a repository existence method
Your WebSocket should reject invalid item IDs.
Repository interface:
```
class AuctionItemRepository(ABC):
    @abstractmethod
    async def exists(self, item_id: UUID) -> bool:
        raise NotImplementedError
```
SQLAlchemy implementation:
```
from sqlalchemy import exists, select
async def exists(self, item_id: UUID) -> bool:
    statement = select(
        exists().where(AuctionItem.id == item_id)
    )
    result = await self._session.execute(statement)
    return bool(result.scalar())
```
This prevents users from creating rooms for random item IDs.

---
## Stage 10 — Create the WebSocket presentation router
Create:
```
app/presentation/websocket/
└── auction_item_websocket_router.py
```
```
##### app/presentation/websocket/auction_item_websocket_router.py
from uuid import UUID
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.container import get_realtime_dependencies
router = APIRouter()
@router.websocket("/ws/auction-items/{item_id}")
async def auction_item_socket(
    websocket: WebSocket,
    item_id: UUID,
) -> None:
    dependencies = get_realtime_dependencies()
    join_use_case = dependencies.join_auction_item_use_case
    leave_use_case = dependencies.leave_auction_item_use_case
    await join_use_case.execute(
        item_id=item_id,
        connection=websocket,
    )
    try:
        while True:
            message = await websocket.receive_text()
            if message == "ping":
                await websocket.send_json({
                    "type": "PONG",
                })
    except WebSocketDisconnect:
        await leave_use_case.execute(
            item_id=item_id,
            connection=websocket,
        )
```
The router should only:
```
- Read route input.
- Call use cases.
- Manage connection lifecycle.
```
It should not:
```
- Query SQLAlchemy directly.
- Calculate bid prices.
- Update auction items.
- Build complex event data.
```

---
## Stage 11 — Add dependency composition
You need one shared connection registry for the whole process.
Do not create it inside every request:
```
##### Wrong
@router.websocket(...)
async def socket(...):
    registry = InMemoryAuctionConnectionRegistry()
```
Every connection would receive its own registry.
Create it once:
```
##### app/container.py
from app.infrastructure.realtime.in_memory_auction_connection_registry import (
    InMemoryAuctionConnectionRegistry,
)
from app.infrastructure.realtime.websocket_auction_event_publisher import (
    WebSocketAuctionEventPublisher,
)
auction_connection_registry = InMemoryAuctionConnectionRegistry()
auction_event_publisher = WebSocketAuctionEventPublisher(
    registry=auction_connection_registry,
)
```
A simple dependency container:
```
from dataclasses import dataclass
@dataclass
class RealtimeDependencies:
    join_auction_item_use_case: object
    leave_auction_item_use_case: object
    event_publisher: object
```
For repositories requiring a database session, build use cases through FastAPI dependencies instead of a global session.

## Stage 12 — Integrate WebSocket publishing with Place Bid
This is the most important stage.
Your bidding transaction remains inside the normal bid service or use case.
```
PlaceBidUseCase
├── Load item with FOR UPDATE
├── Validate item status
├── Validate session
├── Validate bidder
├── Calculate minimum bid
├── Mark old winning bid OUTBID
├── Create new winning bid
├── Update current price
└── Return PlaceBidResult
```
Add an application result:
```
###### app/application/dto/place_bid_result.py
from datetime import datetime
from decimal import Decimal
from uuid import UUID
from pydantic import BaseModel
class PlaceBidResult(BaseModel):
    bid_id: UUID
    item_id: UUID
    bidder_id: UUID
    bidder_name: str
    amount: Decimal
    current_price: Decimal
    total_bids: int
    created_at: datetime
```
The use case should return this result.

---
## Stage 13 — Publish only after commit
There are two acceptable patterns.
###### Pattern A — Commit in the router
```
result = await place_bid_use_case.execute(...)
await session.commit()
event = create_bid_placed_event(
    item_id=result.item_id,
    bid_id=result.bid_id,
    bidder_id=result.bidder_id,
    bidder_name=result.bidder_name,
    amount=result.amount,
    current_price=result.current_price,
    total_bids=result.total_bids,
)
await event_publisher.publish(
    result.item_id,
    event,
)
```
###### Pattern B — Unit of Work
This is cleaner for larger projects.
```
async with unit_of_work:
    result = await place_bid_use_case.execute(...)
    await unit_of_work.commit()
event = create_bid_placed_event(...)
await event_publisher.publish(result.item_id, event)
```
The critical order is:
```
1. Save changes.
2. Commit transaction.
3. Publish event.
```
Never publish before commit.

---
## Stage 14 — Keep event publishing out of repositories
Wrong:
```
class BidRepository:
    async def create(self, bid):
        self.session.add(bid)
        await websocket_manager.broadcast(...)
```
Why this is wrong:
- Repository gains two responsibilities.
- Database code depends on WebSockets.
- Tests become difficult.
- Redis migration becomes difficult.
Correct:
```
Repository saves entities.
Use case controls business flow.
Publisher sends application events.
```

---
## Stage 15 — Register the WebSocket router
In `main.py`:
```
from app.presentation.websocket.auction_item_websocket_router import (
    router as auction_item_websocket_router,
)
app.include_router(auction_item_websocket_router)
```
Final URL:
```
ws://localhost:8080/ws/auction-items/{itemId}
```
Test in browser console:
```
const socket = new WebSocket(
  'ws://localhost:8080/ws/auction-items/YOUR-ITEM-ID'
);
socket.onmessage = event => {
  console.log(JSON.parse(event.data));
};
socket.onopen = () => {
  console.log('connected');
};
```
Open the same page in two browser tabs. You should see:
```
{
  "type": "VIEWER_COUNT_UPDATED",
  "data": {
    "viewerCount": 2
  }
}
```

---
## Stage 16 — Define frontend event types
Create:
```
src/features/auction-items/types/auctionItemEvent.ts
```
```
export type AuctionItemEvent =
  | ViewerCountUpdatedEvent
  | BidPlacedEvent
  | ItemStatusUpdatedEvent
  | AuctionEndedEvent;
export interface ViewerCountUpdatedEvent {
  type: 'VIEWER_COUNT_UPDATED';
  itemId: string;
  timestamp: string;
  data: {
    viewerCount: number;
  };
}
export interface BidPlacedEvent {
  type: 'BID_PLACED';
  itemId: string;
  timestamp: string;
  data: {
    bidId: string;
    bidderId: string;
    bidderName: string;
    amount: string;
    currentPrice: string;
    totalBids: number;
  };
}
export interface ItemStatusUpdatedEvent {
  type: 'ITEM_STATUS_UPDATED';
  itemId: string;
  timestamp: string;
  data: {
    status: 'OPEN' | 'SOLD' | 'UNSOLD' | 'CANCELLED';
  };
}
export interface AuctionEndedEvent {
  type: 'AUCTION_ENDED';
  itemId: string;
  timestamp: string;
  data: {
    status: 'SOLD' | 'UNSOLD';
    winnerUserId: string | null;
    finalPrice: string | null;
  };
}
```
Use discriminated unions so TypeScript narrows `event.data` based on `event.type`.

---
## Stage 17 — Create a dedicated WebSocket client
Do not create raw WebSocket logic directly inside the page.
Create:
```
src/features/auction-items/services/
└── auctionItemSocketClient.ts
```
```
import type {
  AuctionItemEvent,
} from '../types/auctionItemEvent';
type AuctionEventHandler = (
  event: AuctionItemEvent,
) => void;
type ConnectionStatusHandler = (
  connected: boolean,
) => void;
export class AuctionItemSocketClient {
  private socket: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private manuallyClosed = false;
  constructor(
    private readonly itemId: string,
    private readonly onEvent: AuctionEventHandler,
    private readonly onConnectionChange: ConnectionStatusHandler,
  ) {}
  connect(): void {
    this.manuallyClosed = false;
    const baseUrl =
      import.meta.env.VITE_WS_BASE_URL ??
      'ws://localhost:8080';
    this.socket = new WebSocket(
      `${baseUrl}/ws/auction-items/${this.itemId}`,
    );
    this.socket.onopen = () => {
      this.onConnectionChange(true);
      this.startHeartbeat();
    };
    this.socket.onmessage = event => {
      this.handleMessage(event.data);
    };
    this.socket.onerror = () => {
      this.socket?.close();
    };
    this.socket.onclose = () => {
      this.onConnectionChange(false);
      this.stopHeartbeat();
      if (!this.manuallyClosed) {
        this.scheduleReconnect();
      }
    };
  }
  disconnect(): void {
    this.manuallyClosed = true;
    this.stopHeartbeat();
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
    }
    this.socket?.close();
    this.socket = null;
  }
  private handleMessage(rawData: string): void {
    try {
      const event = JSON.parse(rawData) as AuctionItemEvent;
      if (event.itemId !== this.itemId) {
        return;
      }
      this.onEvent(event);
    } catch (error) {
      console.error(
        'Invalid auction WebSocket event',
        error,
      );
    }
  }
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = window.setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send('ping');
      }
    }, 25_000);
  }
  private stopHeartbeat(): void {
    if (this.heartbeatTimer !== null) {
      window.clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
  private scheduleReconnect(): void {
    this.reconnectTimer = window.setTimeout(() => {
      this.connect();
    }, 3_000);
  }
}
```

---
## Stage 18 — Wrap the client in a React hook
Create:
```
src/features/auction-items/hooks/
└── useAuctionItemRealtime.ts
```
```
import {
  useEffect,
  useRef,
  useState,
} from 'react';
import { AuctionItemSocketClient } from '../services/auctionItemSocketClient';
import type {
  AuctionItemEvent,
} from '../types/auctionItemEvent';
interface UseAuctionItemRealtimeOptions {
  itemId: string;
  onEvent: (event: AuctionItemEvent) => void;
}
export function useAuctionItemRealtime({
  itemId,
  onEvent,
}: UseAuctionItemRealtimeOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const eventHandlerRef = useRef(onEvent);
  useEffect(() => {
    eventHandlerRef.current = onEvent;
  }, [onEvent]);
  useEffect(() => {
    const client = new AuctionItemSocketClient(
      itemId,
      event => eventHandlerRef.current(event),
      setIsConnected,
    );
    client.connect();
    return () => {
      client.disconnect();
    };
  }, [itemId]);
  return {
    isConnected,
  };
}
```
Using `eventHandlerRef` prevents unnecessary reconnects whenever the page rerenders.

---
## Stage 19 — Create a reducer for real-time state
Do not put a long `switch` directly inside the page.
Create:
```
src/features/auction-items/state/
└── auctionItemRealtimeReducer.ts
```
```
import type {
  AuctionItemEvent,
} from '../types/auctionItemEvent';
export interface RealtimeBid {
  id: string;
  bidderId: string;
  bidderName: string;
  amount: string;
  status: 'WINNING' | 'OUTBID';
  createdAt: string;
}
export interface AuctionItemRealtimeState {
  viewerCount: number;
  currentPrice: string;
  totalBids: number;
  status: string;
  bids: RealtimeBid[];
}
export function auctionItemRealtimeReducer(
  state: AuctionItemRealtimeState,
  event: AuctionItemEvent,
): AuctionItemRealtimeState {
  switch (event.type) {
    case 'VIEWER_COUNT_UPDATED':
      return {
        ...state,
        viewerCount: event.data.viewerCount,
      };
    case 'BID_PLACED': {
      const bidAlreadyExists = state.bids.some(
        bid => bid.id === event.data.bidId,
      );
      const updatedBids = state.bids.map(bid => ({
        ...bid,
        status:
          bid.status === 'WINNING'
            ? ('OUTBID' as const)
            : bid.status,
      }));
      return {
        ...state,
        currentPrice: event.data.currentPrice,
        totalBids: event.data.totalBids,
        bids: bidAlreadyExists
          ? updatedBids
          : [
              {
                id: event.data.bidId,
                bidderId: event.data.bidderId,
                bidderName: event.data.bidderName,
                amount: event.data.amount,
                status: 'WINNING',
                createdAt: event.timestamp,
              },
              ...updatedBids,
            ],
      };
    }
    case 'ITEM_STATUS_UPDATED':
      return {
        ...state,
        status: event.data.status,
      };
    case 'AUCTION_ENDED':
      return {
        ...state,
        status: event.data.status,
      };
    default:
      return state;
  }
}
```
This makes event behavior testable without React or WebSockets.

---
## Stage 20 — Use it in the auction item page
```
const [realtimeState, dispatchRealtimeEvent] =
  useReducer(
    auctionItemRealtimeReducer,
    {
      viewerCount: 0,
      currentPrice: item.currentPrice,
      totalBids: item.totalBids,
      status: item.status,
      bids: item.bids,
    },
  );
const { isConnected } = useAuctionItemRealtime({
  itemId,
  onEvent: dispatchRealtimeEvent,
});
```
Display:
```
<div>
  <span>
    {isConnected ? 'Live' : 'Reconnecting...'}
  </span>
  <span>
    {realtimeState.viewerCount} people watching
  </span>
  <strong>
    {formatVnd(realtimeState.currentPrice)}
  </strong>
</div>
```

---
## Stage 21 — Handle duplicate events
Duplicate delivery can happen because:
- POST response updates the UI.
- WebSocket sends the same bid.
- Reconnect causes a state refresh.
- Redis may redeliver an event.
Every bid must have a stable `bidId`.
```
const bidAlreadyExists = state.bids.some(
  bid => bid.id === event.data.bidId,
);
```
For stronger event deduplication, add `eventId`:
```
class AuctionItemEvent(BaseModel):
    event_id: UUID = Field(
        default_factory=uuid.uuid4,
        alias="eventId",
    )
```
Frontend:
```
const processedEventIds = new Set<string>();
```
For the first version, deduplicating by `bidId` is enough.

---
## Stage 22 — Add authentication
You have three choices.
###### Option 1 — Public read-only WebSocket
Guests and logged-in users can connect.
```
Use when:
- Auction item page is public.
- WebSocket only sends public information.
```
This is the simplest starting point.
###### Option 2 — Token in query string
```
const token = localStorage.getItem('accessToken');
new WebSocket(
  `${url}?token=${encodeURIComponent(token ?? '')}`,
);
```
Easy, but tokens may appear in logs.
###### Option 3 — Authentication message
Recommended production pattern:
```
{
  "type": "AUTH",
  "accessToken": "jwt-token"
}
```
Server flow:
```
1. Accept socket.
2. Wait for AUTH message.
3. Decode JWT.
4. Reject invalid token.
5. Add connection to room.
```
For your auction detail page, public read-only connections are reasonable. Bid creation remains protected through REST.

---
## Stage 23 — Add initial synchronization after reconnect
A WebSocket only receives future events.
Suppose:
```
User disconnects at price 30,000,000.
Another user bids 35,000,000.
User reconnects.
```
If you only reconnect, the page may still show `30,000,000`.
After reconnect, refresh the item data:
```
socket.onopen = async () => {
  onConnectionChange(true);
  await queryClient.invalidateQueries({
    queryKey: ['auction-item', itemId],
  });
};
```
Recommended flow:
```
Initial page load:
GET auction item detail
WebSocket connected:
Receive future changes
WebSocket reconnected:
GET auction item detail again
```
WebSocket events are not a replacement for authoritative REST state.

---
## Stage 24 — Add backend tests
Test business events separately from WebSocket transport.
###### Event factory test
```
def test_create_bid_placed_event():
    event = create_bid_placed_event(
        item_id=item_id,
        bid_id=bid_id,
        bidder_id=user_id,
        bidder_name="Nguyen A",
        amount=Decimal("35000000"),
        current_price=Decimal("35000000"),
        total_bids=4,
    )
    assert event.type == AuctionItemEventType.BID_PLACED
    assert event.data["currentPrice"] == "35000000"
```
###### Registry test
Use fake connections:
```
class FakeConnection:
    def __init__(self):
        self.messages = []
        self.accepted = False
    async def accept(self):
        self.accepted = True
    async def send_json(self, data):
        self.messages.append(data)
    async def receive_text(self):
        return "ping"
    async def close(self, code=1000):
        pass
```
Test:
```
async def test_broadcast_sends_message_to_all_connections():
    registry = InMemoryAuctionConnectionRegistry()
    connection_1 = FakeConnection()
    connection_2 = FakeConnection()
    await registry.connect(item_id, connection_1)
    await registry.connect(item_id, connection_2)
    await registry.broadcast(
        item_id,
        {"type": "TEST"},
    )
    assert len(connection_1.messages) == 1
    assert len(connection_2.messages) == 1
```
###### Place bid test
Mock the event publisher:
```
class FakeAuctionEventPublisher:
    def __init__(self):
        self.events = []
    async def publish(self, item_id, event):
        self.events.append(event)
```
Verify that the event is created after a successful bid.

## Stage 25 — Add frontend reducer tests
```
it('updates price when BID_PLACED is received', () => {
  const nextState = auctionItemRealtimeReducer(
    initialState,
    {
      type: 'BID_PLACED',
      itemId: 'item-1',
      timestamp: '2026-07-22T12:00:00Z',
      data: {
        bidId: 'bid-1',
        bidderId: 'user-1',
        bidderName: 'Nguyen',
        amount: '35000000.00',
        currentPrice: '35000000.00',
        totalBids: 5,
      },
    },
  );
  expect(nextState.currentPrice).toBe('35000000.00');
  expect(nextState.totalBids).toBe(5);
  expect(nextState.bids[0].id).toBe('bid-1');
});
```
Your reducer should be tested more heavily than your page component.

---
## Stage 26 — Add Redis when scaling
The in-memory registry only works correctly with:
```
One FastAPI process
One backend container
One Uvicorn worker
```
It does not synchronize multiple workers.
Wrong for the in-memory version:
```
uvicorn app.main:app --workers 4
```
Use:
```
uvicorn app.main:app --workers 1
```
When scaling, use Redis Pub/Sub:
```
POST bid request
      │
      ▼
Backend worker 1
      │
      ├── Commit database transaction
      │
      └── Publish Redis event
                  │
           ┌──────┴──────┐
           ▼             ▼
       Worker 1       Worker 2
           │             │
           ▼             ▼
      Local sockets  Local sockets
```
Infrastructure structure:
```
app/infrastructure/realtime/
├── in_memory_auction_connection_registry.py
├── websocket_auction_event_publisher.py
├── redis_auction_event_publisher.py
└── redis_auction_event_subscriber.py
```
The application interface remains unchanged:
```
AuctionEventPublisher
```
That is the benefit of Clean Architecture.

---
###### Recommended project structure
```
app/
├── domain/
│   ├── entities/
│   ├── enums/
│   └── events/
│       ├── auction_item_event.py
│       ├── bid_placed_event.py
│       ├── viewer_count_updated_event.py
│       └── item_status_updated_event.py
│
├── application/
│   ├── dto/
│   │   └── place_bid_result.py
│   ├── ports/
│   │   ├── auction_event_publisher.py
│   │   ├── auction_connection_registry.py
│   │   └── realtime_connection.py
│   └── use_cases/
│       ├── bids/
│       │   └── place_bid.py
│       └── realtime/
│           ├── join_auction_item.py
│           └── leave_auction_item.py
│
├── infrastructure/
│   ├── database/
│   │   └── repositories/
│   └── realtime/
│       ├── in_memory_auction_connection_registry.py
│       └── websocket_auction_event_publisher.py
│
├── presentation/
│   ├── api/
│   │   └── bid_router.py
│   └── websocket/
│       └── auction_item_websocket_router.py
│
├── dependencies/
│   └── realtime_dependencies.py
│
└── main.py
```
Frontend:
```
src/features/auction-items/
├── api/
│   ├── getAuctionItem.ts
│   └── placeBid.ts
├── components/
│   ├── AuctionItemPrice.tsx
│   ├── AuctionViewerCount.tsx
│   ├── BidHistory.tsx
│   └── RealtimeStatus.tsx
├── hooks/
│   └── useAuctionItemRealtime.ts
├── services/
│   └── auctionItemSocketClient.ts
├── state/
│   └── auctionItemRealtimeReducer.ts
└── types/
    └── auctionItemEvent.ts
```

---
###### Implementation stages summary
###### Stage A — Minimum working real-time
Build:
```
1. Event contract.
2. In-memory connection registry.
3. WebSocket endpoint.
4. Viewer count.
5. Frontend connection.
```
Success condition:
```
Opening two tabs shows viewerCount = 2.
Closing one tab shows viewerCount = 1.
```
###### Stage B — Real-time bidding
Build:
```
1. BID_PLACED domain event.
2. Publish after database commit.
3. Frontend reducer.
4. Price and bid history updates.
5. Duplicate bid protection.
```
Success condition:
```
User A bids.
User B sees the price and bid immediately.
```
###### Stage C — Reliability
Build:
```
1. Heartbeat.
2. Automatic reconnect.
3. REST refresh after reconnect.
4. Invalid message handling.
5. Logging.
```
Success condition:
```
Stopping and restarting the backend reconnects the browser
and refreshes the correct auction state.
```
###### Stage D — Auction lifecycle
Build:
```
1. ITEM_STATUS_UPDATED.
2. AUCTION_ENDED.
3. Disable bid form when closed.
4. Show winner and final price.
```
Success condition:
```
All connected users see the auction close at the same time.
```
###### Stage E — Production scaling
Build:
```
1. Redis Pub/Sub.
2. Multiple backend workers.
3. Distributed viewer presence.
4. Metrics and monitoring.
```
Success condition:
```
Users receive events even when connected to different workers.
```

---
###### Clean-code rules for this feature
```
Router:
Connection and HTTP concerns only.
Use case:
Coordinates the application flow.
Domain event:
Describes what happened.
Repository:
Reads and writes database entities.
Event publisher:
Distributes events.
Connection registry:
Tracks active socket connections.
React socket client:
Manages transport and reconnecting.
Reducer:
Transforms events into UI state.
```
Avoid one large class such as:
```
AuctionWebSocketService
```
that handles:
```
connections
authentication
database queries
bid validation
event creation
broadcasting
logging
```
That class would become difficult to test and change.
Your reusable framework is:
```
Command through REST
        ↓
Business use case
        ↓
Database transaction
        ↓
Commit
        ↓
Create domain event
        ↓
Event publisher
        ↓
WebSocket clients
        ↓
Frontend reducer
        ↓
Updated UI
```