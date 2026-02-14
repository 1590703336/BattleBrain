# BattleBrain API Documentation Standards

This guide outlines the standards for documenting APIs in the BattleBrain project. Following these guidelines ensures smooth collaboration between frontend and backend developers by establishing a clear **Contract** before code is written.

## 1. Guiding Principles

-   **Contract First**: Define the API input/output *before* implementing logic.
-   **RESTful**: Use standard HTTP methods (`GET`, `POST`, `PUT`, `DELETE`) and status codes.
-   **JSON First**: All request bodies and response payloads must be valid JSON.
-   **Screaming Snake Case**: Environment variables and constants.
-   **Camel Case**: JSON keys (`userId`, `battleId`).

## 2. File Organization

API documentation should be stored in this `api/` directory.
-   `api/README.md`: Index of all available endpoints.
-   `api/resources/`: Detailed specs for complex resources (optional).

## 3. Documentation Template

For every endpoint, use the following Markdown template:

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
  "data": {
    "id": "123",
    "field_name": "value"
  }
}
```

**Error (4xx/5xx)**:

```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "Field 'field_name' is required."
  }
}
```
```

## 4. Standard Response Formats

All API responses should follow a consistent envelope structure.

### Success Response
```json
{
  "data": { ... },     // The actual resource or result
  "meta": { ... }      // Optional: pagination details, timestamps
}
```

### Error Response
```json
{
  "error": {
    "code": "ERROR_CODE_STRING",  // e.g., "USER_NOT_FOUND"
    "message": "Human readable message.",
    "details": { ... }            // Optional: validation errors
  }
}
```

## 5. HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| `200` | OK | Standard success. |
| `201` | Created | Resource successfully created (e.g., after POST). |
| `400` | Bad Request | Client sent invalid JSON or missing fields. |
| `401` | Unauthorized | Missing or invalid authentication token. |
| `403` | Forbidden | Authenticated, but permissions denied. |
| `404` | Not Found | Resource does not exist. |
| `429` | Too Many Requests | Rate limit exceeded. |
| `500` | Internal Server Error | Something went wrong on the server. |
