# BattleBrain API Documentation Standards

This guide outlines the standards for documenting APIs in the BattleBrain project. Following these guidelines ensures smooth collaboration between frontend and backend developers by establishing a clear **Contract** before code is written.

## 1. Guiding Principles

-   **Contract First**: Define the API input/output *before* implementing logic.
-   **RESTful**: Use standard HTTP methods (`GET`, `POST`, `PUT`, `DELETE`) and status codes for HTTP endpoints.
-   **Event-Based**: For real-time features, use Socket.IO events with clear payload definitions.
-   **JSON First**: All request bodies and response payloads must be valid JSON.
-   **Camel Case**: JSON keys (`userId`, `battleId`).

## 2. File Organization

API documentation should be stored in this `api/` directory.
-   `api/README.md` or `api/Endpoints.md`: Index of all available endpoints.
-   `api/resources/`: Detailed specs for complex resources (optional).

## 3. HTTP Documentation Template

For every HTTP endpoint, use the following Markdown template:

```markdown
### [METHOD] /api/path/to/resource

**Description**: Brief summary of what this endpoint does.

**Auth Required**: `Yes` / `No`

#### Request

**Headers**:
- `Authorization`: `Bearer <token>` (if auth required)

**Body Parameters**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `field_name` | String | Yes | Description of field |

**Example Request**:
```json
{
  "field_name": "value"
}
```

#### Response

**Success (200 OK)**:

```json
{
  "id": "123",
  "field_name": "value"
}
```

**Error (4xx/5xx)**:

```json
{
  "error": "Field 'field_name' is required."
}
```
```

## 4. Socket.IO Documentation Template

For real-time events, distinguish between Client->Server (Emits) and Server->Client (Listeners).

### Client -> Server (Emit)

```markdown
#### `event-name`

Description of what this event triggers.

**Emit**:
```javascript
socket.emit('event-name', payload);
```

**Payload**:
```json
{
  "field": "value"
}
```

**Server Response Events**:
- `response-event-1`
- `response-event-2`
```

### Server -> Client (Listen)

```markdown
#### `event-name`

Description of when the server sends this event.

**Listen**:
```javascript
socket.on('event-name', (data) => { ... });
```

**Payload**:
```json
{
  "field": "value"
}
```
```

## 5. Standard Response Formats

### Success Response
Return a flat JSON object containing the resource or result.

```json
{
  "id": "123",
  "name": "Object Name",
  "createdAt": "2023-01-01T00:00:00Z"
}
```

### Error Response
Use appropriate HTTP status codes (400, 401, 404, 500). The body *may* contain an error message or code.

```json
{
  "error": "Human readable message",
  "code": "OPTIONAL_ERROR_CODE"
}
```

## 6. HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| `200` | OK | Standard success. |
| `201` | Created | Resource successfully created. |
| `400` | Bad Request | Invalid input. |
| `401` | Unauthorized | Missing/Invalid token. |
| `404` | Not Found | Resource does not exist. |
| `429` | Too Many Requests | Rate limit exceeded. |
| `500` | Internal Server Error | Server issues. |
