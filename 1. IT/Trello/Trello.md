[[1. ass1]]
## Problem 1: What should the main system architecture be?
## Solution
Use three main storage and communication layers:
```
React frontend
      ↓ REST / WebSocket
Spring Boot backend
      ├── PostgreSQL or MySQL
      ├── Redis
      └── Object storage for attachments
```
The responsibilities should be:

| Component        | Responsibility                           |
| ---------------- | ---------------------------------------- |
| Spring Boot      | Business logic, security, APIs           |
| PostgreSQL/MySQL | Permanent application data               |
| Redis            | Cache, sessions, temporary locks, events |
| WebSocket        | Real-time board updates                  |
| S3/MinIO         | Card attachments                         |
| React            | User interface                           |
## Why this solution works
A Trello-like application contains data that must never disappear, such as boards, cards, comments, and memberships.
That data belongs in the relational database.
Redis stores data primarily in memory. It is much faster, but it should normally be used for things such as:
```
Frequently viewed boards
Temporary card-move locks
Online-user status
Refresh-token sessions
Notification queues
WebSocket event distribution
Rate limiting
```
A good rule is:
```
Must survive a restart → relational database
Can be recreated or expires soon → Redis
```
## Common wrong approach
A beginner may store all cards and boards only in Redis.
This creates problems because:
- Redis data may be evicted
- relationships are harder to manage
- complex queries become difficult
- transaction consistency becomes harder
- permanent history is harder to preserve

---
## Problem 2: What are the main business entities?
## Solution
Start with these entities:
```
users
workspaces
workspace_members
boards
board_members
board_lists
cards
card_members
comments
labels
card_labels
attachments
activities
notifications
```
The relationship should look like this:
```
User
 └── belongs to many Workspaces
Workspace
 ├── has many Members
 └── has many Boards
Board
 ├── has many Lists
 ├── has many Members
 └── has many Activities
List
 └── has many Cards
Card
 ├── has many Assigned Members
 ├── has many Comments
 ├── has many Labels
 └── has many Attachments
```
Use `board_lists` rather than a table named `lists`, because `LIST` can be confusing in application code and SQL discussions.

---
## Problem 3: How should the database be designed?
## Solution
A practical first version could use the following structure.
### `users`
```
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(500),
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```
### `workspaces`
```
CREATE TABLE workspaces (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_workspace_owner
        FOREIGN KEY (owner_id) REFERENCES users(id)
);
```
### `workspace_members`
```
CREATE TABLE workspace_members (
    workspace_id UUID NOT NULL,
    user_id UUID NOT NULL,
    role VARCHAR(30) NOT NULL,
    joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (workspace_id, user_id),
    CONSTRAINT fk_workspace_member_workspace
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
    CONSTRAINT fk_workspace_member_user
        FOREIGN KEY (user_id) REFERENCES users(id)
);
```
Possible workspace roles:
```
OWNER
ADMIN
MEMBER
VIEWER
```
### `boards`
```
CREATE TABLE boards (
    id UUID PRIMARY KEY,
    workspace_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    visibility VARCHAR(30) NOT NULL DEFAULT 'PRIVATE',
    created_by UUID NOT NULL,
    archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_board_workspace
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
    CONSTRAINT fk_board_creator
        FOREIGN KEY (created_by) REFERENCES users(id)
);
```
### `board_lists`
```
CREATE TABLE board_lists (
    id UUID PRIMARY KEY,
    board_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    position NUMERIC(20, 10) NOT NULL,
    archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_list_board
        FOREIGN KEY (board_id) REFERENCES boards(id)
);
```
### `cards`
```
CREATE TABLE cards (
    id UUID PRIMARY KEY,
    list_id UUID NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    position NUMERIC(20, 10) NOT NULL,
    due_date TIMESTAMP,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    archived BOOLEAN NOT NULL DEFAULT FALSE,
    version BIGINT NOT NULL DEFAULT 0,
    created_by UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_card_list
        FOREIGN KEY (list_id) REFERENCES board_lists(id),
    CONSTRAINT fk_card_creator
        FOREIGN KEY (created_by) REFERENCES users(id)
);
```
The `version` column supports optimistic locking.

---
## Problem 4: How can cards be reordered efficiently?
Imagine a list contains:
```
Card A → position 1
Card B → position 2
Card C → position 3
```
The user moves Card C between Card A and Card B.
A simple implementation may update every card position:
```
Card A → 1
Card C → 2
Card B → 3
```
That becomes expensive when a list contains hundreds of cards.
## Solution
Use fractional positions:
```
Card A → 1000
Card B → 2000
Card C → 3000
```
When Card C moves between A and B:
```
newPosition = (1000 + 2000) / 2
newPosition = 1500
```
Only Card C needs to be updated.
```
BigDecimal calculatePosition(
        BigDecimal previousPosition,
        BigDecimal nextPosition
) {
    if (previousPosition == null && nextPosition == null) {
        return BigDecimal.valueOf(1000);
    }
    if (previousPosition == null) {
        return nextPosition.subtract(BigDecimal.valueOf(1000));
    }
    if (nextPosition == null) {
        return previousPosition.add(BigDecimal.valueOf(1000));
    }
    return previousPosition
            .add(nextPosition)
            .divide(BigDecimal.valueOf(2));
}
```
## Why this solution works
The position does not need to represent a normal array index.
It only needs to preserve sorting order:
```
ORDER BY position ASC
```
## Common wrong approach
Do not rely only on a Java `List` index.
The index disappears after the request finishes and cannot safely represent concurrent changes from multiple users.

---
## Problem 5: How should the Spring Boot project be structured?
## Solution
Use a feature-based structure rather than placing every controller, service, and repository into global folders.
```
src/main/java/com/example/taskboard
├── auth
│   ├── controller
│   ├── dto
│   ├── service
│   └── security
├── user
│   ├── controller
│   ├── domain
│   ├── repository
│   └── service
├── workspace
│   ├── controller
│   ├── domain
│   ├── dto
│   ├── repository
│   └── service
├── board
│   ├── controller
│   ├── domain
│   ├── dto
│   ├── repository
│   └── service
├── boardlist
├── card
├── comment
├── notification
├── activity
├── realtime
├── common
│   ├── exception
│   ├── response
│   ├── config
│   └── security
└── TaskBoardApplication.java
```
## Why this solution works
All code related to a feature stays close together.
For example:
```
card/controller
card/service
card/repository
card/domain
```
When you change card behavior, you do not need to search across the entire project.

---
## Problem 6: Where should Redis be used?
## Solution
Use Redis for specific problems, not everywhere.
### Use case 1: Cache board details
A board may contain:
```
Board information
Lists
Cards
Labels
Members
```
Loading all of this repeatedly can create many database queries.
Store the assembled board response temporarily:
```
Key:
board:view:{boardId}
Value:
BoardDetailResponse
TTL:
5 minutes
```
Example:
```
@Cacheable(
    cacheNames = "boardView",
    key = "#boardId"
)
public BoardDetailResponse getBoard(UUID boardId, UUID currentUserId) {
    validateBoardAccess(boardId, currentUserId);
    return boardQueryService.loadBoardDetail(boardId);
}
```
When the board changes:
```
@CacheEvict(
    cacheNames = "boardView",
    key = "#boardId"
)
public CardResponse createCard(
        UUID boardId,
        CreateCardRequest request
) {
    // Create card
}
```
### Use case 2: Refresh-token sessions
Store refresh-token information using a key such as:
```
auth:refresh:{tokenId}
```
Value:
```
{
  "userId": "user-uuid",
  "deviceId": "browser-device-id"
}
```
TTL should match refresh-token expiration.
This allows you to revoke a login session without waiting for the JWT to expire.
### Use case 3: Rate limiting
For example:
```
rate-limit:login:{ipAddress}
```
Increment the number of failed login attempts and expire it after a short period.
### Use case 4: Online presence
```
presence:user:{userId}
```
Store:
```
ONLINE
```
with a short TTL.
The client periodically sends a heartbeat. When the heartbeat stops, the key expires.
### Use case 5: Distributed locks
When multiple backend instances process the same sensitive operation, Redis can provide a temporary lock.
Example:
```
lock:card:{cardId}
```
This can help prevent two simultaneous card moves from corrupting ordering.
However, database constraints and optimistic locking should still be your main consistency protection.
### Use case 6: Pub/Sub for real-time events
When one server instance updates a card, it can publish:
```
board-events:{boardId}
```
Other backend instances receive the event and forward it to connected WebSocket clients.

---
## Problem 7: How should Redis be configured?
## Solution
Add these dependencies:
```
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-cache</artifactId>
</dependency>
```
Configure Redis:
```
spring:
  data:
    redis:
      host: localhost
      port: 6379
      timeout: 2s
  cache:
    type: redis
```
Enable caching:
```
@Configuration
@EnableCaching
public class CacheConfig {
}
```
A practical Redis cache configuration:
```
@Configuration
@EnableCaching
public class RedisCacheConfig {
    @Bean
    public RedisCacheManager cacheManager(
            RedisConnectionFactory connectionFactory,
            ObjectMapper objectMapper
    ) {
        ObjectMapper redisObjectMapper = objectMapper.copy();
        GenericJackson2JsonRedisSerializer serializer =
                new GenericJackson2JsonRedisSerializer(redisObjectMapper);
        RedisCacheConfiguration configuration =
                RedisCacheConfiguration.defaultCacheConfig()
                        .entryTtl(Duration.ofMinutes(5))
                        .disableCachingNullValues()
                        .serializeValuesWith(
                                RedisSerializationContext
                                        .SerializationPair
                                        .fromSerializer(serializer)
                        );
        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(configuration)
                .build();
    }
}
```

---
## Problem 8: How should authentication and permissions work?
## Solution
Use two permission layers:
```
Application authentication
Workspace and board authorization
```
### Authentication
JWT access token:
```
Authorization: Bearer <access-token>
```
The access token identifies the user.
### Authorization
Being logged in does not mean the user can access every board.
Every board operation should verify membership.
```
public void validateBoardAccess(UUID boardId, UUID userId) {
    boolean hasAccess = boardMemberRepository
            .existsByBoardIdAndUserId(boardId, userId);
    if (!hasAccess) {
        throw new ForbiddenException("BOARD_ACCESS_DENIED");
    }
}
```
For board modifications:
```
public void validateBoardWritePermission(
        UUID boardId,
        UUID userId
) {
    BoardRole role = boardMemberRepository
            .findRoleByBoardIdAndUserId(boardId, userId)
            .orElseThrow(() ->
                    new ForbiddenException("BOARD_ACCESS_DENIED")
            );
    if (role == BoardRole.VIEWER) {
        throw new ForbiddenException("BOARD_WRITE_DENIED");
    }
}
```
Possible roles:
```
OWNER
ADMIN
MEMBER
VIEWER
```
## Common wrong approach
Do not check only whether the JWT is valid.
A valid user may still be unauthorized to view or edit a particular board.

---
## Problem 9: How should moving a card work?
## Solution
Create an endpoint such as:
```
PATCH /api/v1/cards/{cardId}/move
```
Request:
```
{
  "targetListId": "7db038a4-4e21-49ab-a94d-5a86cf4129bc",
  "previousCardId": "ca9b3277-ebda-47bf-a16f-f8414fa5ebbd",
  "nextCardId": "eb2a2d8c-d104-4638-93fc-bf341a5c1de7",
  "version": 4
}
```
Service logic:
```
@Transactional
public CardResponse moveCard(
        UUID cardId,
        UUID currentUserId,
        MoveCardRequest request
) {
    Card card = cardRepository.findById(cardId)
            .orElseThrow(() ->
                    new NotFoundException("CARD_NOT_FOUND")
            );
    BoardList targetList = boardListRepository
            .findById(request.targetListId())
            .orElseThrow(() ->
                    new NotFoundException("TARGET_LIST_NOT_FOUND")
            );
    UUID boardId = targetList.getBoard().getId();
    boardPermissionService.validateBoardWritePermission(
            boardId,
            currentUserId
    );
    BigDecimal previousPosition =
            findPosition(request.previousCardId());
    BigDecimal nextPosition =
            findPosition(request.nextCardId());
    BigDecimal newPosition =
            positionService.calculate(
                    previousPosition,
                    nextPosition
            );
    card.moveTo(targetList, newPosition);
    activityService.recordCardMoved(
            card,
            currentUserId
    );
    boardEventPublisher.publishCardMoved(card);
    return cardMapper.toResponse(card);
}
```
## Why this solution works
The operation performs the important database changes inside one transaction:
```
Validate permission
Find target list
Calculate position
Update card
Create activity
Commit
```
If one important database operation fails, the transaction rolls back.

---
## Problem 10: How do you prevent users from overwriting each other's changes?
Two users may edit the same card at nearly the same time.
Without protection:
```
User A loads version 4
User B loads version 4
User A updates title
User B updates description
User B may accidentally overwrite User A's change
```
## Solution
Use optimistic locking.
```
@Entity
@Table(name = "cards")
public class Card {
    @Id
    private UUID id;
    @Version
    private Long version;
    private String title;
    private String description;
}
```
The generated SQL will verify the version:
```
UPDATE cards
SET title = ?,
    version = 5
WHERE id = ?
  AND version = 4;
```
If another user has already changed the record, no row matches version `4`.
Spring throws an optimistic-lock exception.
Return:
```
409 Conflict
```
```
{
  "code": "CARD_WAS_MODIFIED",
  "message": "This card was changed by another user. Reload and try again."
}
```
## Why Redis alone is not enough
A Redis lock may expire, fail, or be bypassed by another application path.
Optimistic locking protects the actual database record and should remain the main safety mechanism.

---
## Problem 11: How should real-time updates work?
## Solution
Use WebSocket with STOMP.
Dependency:
```
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-websocket</artifactId>
</dependency>
```
Configuration:
```
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig
        implements WebSocketMessageBrokerConfigurer {
    @Override
    public void configureMessageBroker(
            MessageBrokerRegistry registry
    ) {
        registry.enableSimpleBroker("/topic");
        registry.setApplicationDestinationPrefixes("/app");
    }
    @Override
    public void registerStompEndpoints(
            StompEndpointRegistry registry
    ) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .withSockJS();
    }
}
```
Users subscribe to:
```
/topic/boards/{boardId}
```
When a card moves, send an event:
```
{
  "type": "CARD_MOVED",
  "boardId": "board-id",
  "cardId": "card-id",
  "sourceListId": "list-a",
  "targetListId": "list-b",
  "position": 1500,
  "performedBy": "user-id"
}
```
Publisher:
```
@Component
@RequiredArgsConstructor
public class BoardEventPublisher {
    private final SimpMessagingTemplate messagingTemplate;
    public void publishCardMoved(Card card) {
        CardMovedEvent event = new CardMovedEvent(
                "CARD_MOVED",
                card.getBoardId(),
                card.getId(),
                card.getList().getId(),
                card.getPosition()
        );
        messagingTemplate.convertAndSend(
                "/topic/boards/" + card.getBoardId(),
                event
        );
    }
}
```
For one backend instance, Spring's simple broker can be sufficient.
For multiple instances:
```
Backend A receives card update
       ↓
Redis publishes board event
       ↓
Backend A, B, and C receive event
       ↓
Each instance informs its WebSocket clients
```

---
## Problem 12: How should activity history be stored?
## Solution
Store activities permanently in the database.
Example activities:
```
CARD_CREATED
CARD_MOVED
CARD_UPDATED
CARD_ASSIGNED
COMMENT_ADDED
DUE_DATE_CHANGED
MEMBER_ADDED
```
Table:
```
CREATE TABLE activities (
    id UUID PRIMARY KEY,
    board_id UUID NOT NULL,
    actor_id UUID NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    metadata JSON,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```
Example metadata:
```
{
  "cardTitle": "Implement login",
  "fromList": "To Do",
  "toList": "In Progress"
}
```
## Why this solution works
Redis may distribute an event immediately, but the activity table preserves the historical record.
Think of them as two different requirements:
```
Redis event → inform users now
Activity table → show what happened later
```

---
## Problem 13: What APIs should the first version contain?
## Solution
### Authentication
```
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
```
### Workspaces
```
POST   /api/v1/workspaces
GET    /api/v1/workspaces
GET    /api/v1/workspaces/{workspaceId}
PATCH  /api/v1/workspaces/{workspaceId}
POST   /api/v1/workspaces/{workspaceId}/members
DELETE /api/v1/workspaces/{workspaceId}/members/{userId}
```
### Boards
```
POST   /api/v1/workspaces/{workspaceId}/boards
GET    /api/v1/boards/{boardId}
PATCH  /api/v1/boards/{boardId}
DELETE /api/v1/boards/{boardId}
```
### Lists
```
POST  /api/v1/boards/{boardId}/lists
PATCH /api/v1/lists/{listId}
PATCH /api/v1/lists/{listId}/position
DELETE /api/v1/lists/{listId}
```
### Cards
```
POST   /api/v1/lists/{listId}/cards
GET    /api/v1/cards/{cardId}
PATCH  /api/v1/cards/{cardId}
PATCH  /api/v1/cards/{cardId}/move
DELETE /api/v1/cards/{cardId}
```
### Card members
```
POST   /api/v1/cards/{cardId}/members/{userId}
DELETE /api/v1/cards/{cardId}/members/{userId}
```
### Comments
```
POST   /api/v1/cards/{cardId}/comments
GET    /api/v1/cards/{cardId}/comments
PATCH  /api/v1/comments/{commentId}
DELETE /api/v1/comments/{commentId}
```
### Activities
```
GET /api/v1/boards/{boardId}/activities
```
### Notifications
```
GET   /api/v1/notifications
PATCH /api/v1/notifications/{notificationId}/read
PATCH /api/v1/notifications/read-all
```

---
# Recommended Development Order
Do not build every Trello feature immediately.
## Phase 1: Foundation
```
1. Create Spring Boot project
2. Configure PostgreSQL
3. Configure Flyway
4. Create global exception handling
5. Create standard API response
6. Add Docker Compose
```
## Phase 2: Authentication
```
1. Register
2. Login
3. JWT access token
4. Refresh token in Redis
5. Logout and revoke token
```
## Phase 3: Core board features
```
1. Workspace
2. Workspace membership
3. Board
4. Board list
5. Card
6. Move and reorder cards
```
## Phase 4: Collaboration
```
1. Assign card members
2. Comments
3. Labels
4. Due dates
5. Activity history
```
## Phase 5: Redis integration
```
1. Cache board details
2. Store refresh sessions
3. Rate-limit authentication
4. Online presence
5. Cache invalidation
```
## Phase 6: Real-time behavior
```
1. WebSocket connection
2. Board subscriptions
3. Card-created event
4. Card-moved event
5. Comment-added event
6. Redis Pub/Sub for multiple backend instances
```
## Phase 7: Advanced features
```
1. Attachments
2. Search
3. Notifications
4. Archived boards and cards
5. Background jobs
6. Email invitations
```

---
# Suggested Technology Stack
```
Java
Spring Boot
Spring Web
Spring Data JPA
Spring Security
Spring Validation
Spring Data Redis
Spring Cache
Spring WebSocket
PostgreSQL
Flyway
MapStruct
Lombok
Testcontainers
JUnit
Mockito
Docker Compose
MinIO or AWS S3
```
For background jobs, you can initially use:
```
Spring @Scheduled
```
Later, when the system becomes more complex:
```
RabbitMQ
Kafka
or Redis Streams
```
Do not introduce Kafka at the beginning. It adds operational complexity before the project actually needs it.

---
# Initial Docker Compose
```
services:
  postgres:
    image: postgres:17
    container_name: taskboard-postgres
    environment:
      POSTGRES_DB: taskboard_db
      POSTGRES_USER: taskboard
      POSTGRES_PASSWORD: taskboard_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
  redis:
    image: redis:8-alpine
    container_name: taskboard-redis
    command: redis-server --appendonly yes
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
volumes:
  postgres_data:
  redis_data:
```
Application configuration:
```
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/taskboard_db
    username: taskboard
    password: taskboard_password
  jpa:
    hibernate:
      ddl-auto: validate
    open-in-view: false
  flyway:
    enabled: true
  data:
    redis:
      host: localhost
      port: 6379
  cache:
    type: redis
```
Use Flyway migrations rather than:
```
ddl-auto: update
```
because Flyway gives you a visible and repeatable database history.

---
# Common Beginner Mistakes
## Mistake 1: Treating Redis as the main database
Use Redis to support the application, not as the default place for permanent business data.
## Mistake 2: Building WebSocket before CRUD works
First ensure this flow works through normal REST APIs:
```
Create board
Create list
Create card
Move card
```
Then add real-time broadcasting.
## Mistake 3: Caching JPA entities
Cache response DTOs instead.
JPA entities may contain lazy relationships and Hibernate-specific proxy objects.
## Mistake 4: Forgetting cache invalidation
When a card changes, cached board data becomes stale.
Every write operation should consider:
```
Which Redis keys are now invalid?
```
## Mistake 5: Checking authentication but not membership
A valid token proves identity. It does not prove permission to access a specific workspace or board.
## Mistake 6: Using Redis locks for every operation
Most normal CRUD operations should use:
```
Database transaction
Database constraints
Optimistic locking
```
Redis locks should be reserved for operations that genuinely cross processes or backend instances.

---
# Final Reusable Framework
When deciding how to implement a feature, follow this process:
```
1. Is this data permanent?
   Yes → relational database
2. Is this data temporary or frequently accessed?
   Yes → consider Redis
3. Can multiple users change it simultaneously?
   Yes → transaction plus optimistic locking
4. Must connected users see the change immediately?
   Yes → publish WebSocket event
5. Are there multiple backend instances?
   Yes → distribute events through Redis Pub/Sub or Streams
6. Does the user have permission?
   Check workspace or board membership
7. Does this change affect cached data?
   Evict or update the related Redis cache
8. Should the action appear in history?
   Store an activity record in the database
```
A strong first milestone is:
```
User registers
User logs in
User creates workspace
User creates board
User creates three lists
User creates cards
User moves a card between lists
Another connected browser receives the movement in real time
```
That milestone gives you a real Trello-like foundation without making the first version unnecessarily large.


```md
- [ ] #task 08:00 - 10:00 This task uses the shorthand format ⏳ 2021-08-29
- [ ] #task 11:00 - 13:00 This task uses the Dataview property format [scheduled:: 2021-08-29]
```


