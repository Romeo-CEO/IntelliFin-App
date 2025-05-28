# Airtel Money API Integration Documentation

## Overview

This document outlines the integration between IntelliFin and the Airtel Mobile Money API. The integration enables secure account linking, transaction history import, and real-time balance monitoring for Zambian SMEs using Airtel Money services.

## API Endpoints

### Base URLs
- **Sandbox**: `https://openapiuat.airtel.africa`
- **Production**: `https://openapi.airtel.africa`

### Authentication Endpoints

#### 1. OAuth Authorization
```
GET /auth/oauth/authorize
```

**Parameters:**
- `client_id` (required): Your application's client ID
- `redirect_uri` (required): Callback URL for authorization code
- `scope` (required): Requested permissions (profile,transactions,balance)
- `state` (required): Random string for CSRF protection
- `response_type` (required): Must be "code"

**Example:**
```
https://openapiuat.airtel.africa/auth/oauth/authorize?
  client_id=your_client_id&
  redirect_uri=http://localhost:3001/api/integrations/airtel/callback&
  scope=profile,transactions,balance&
  state=random_secure_state&
  response_type=code
```

#### 2. Token Exchange
```
POST /auth/oauth/token
```

**Headers:**
- `Content-Type: application/x-www-form-urlencoded`

**Body:**
```
grant_type=authorization_code&
code=authorization_code_from_callback&
client_id=your_client_id&
client_secret=your_client_secret&
redirect_uri=your_redirect_uri
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "profile transactions balance"
}
```

#### 3. Token Refresh
```
POST /auth/oauth/token
```

**Body:**
```
grant_type=refresh_token&
refresh_token=your_refresh_token&
client_id=your_client_id&
client_secret=your_client_secret
```

### Account Information Endpoints

#### 1. Get Account Profile
```
GET /standard/v1/users/profile
```

**Headers:**
- `Authorization: Bearer {access_token}`
- `X-Country: ZM`
- `X-Currency: ZMW`

**Response:**
```json
{
  "status": {
    "code": "200",
    "message": "Success",
    "result_code": "ESB000010"
  },
  "data": {
    "msisdn": "+260971234567",
    "first_name": "John",
    "last_name": "Doe",
    "status": "ACTIVE",
    "grade": "PREMIUM",
    "kyc_status": "VERIFIED"
  }
}
```

#### 2. Get Account Balance
```
GET /standard/v1/users/balance
```

**Headers:**
- `Authorization: Bearer {access_token}`
- `X-Country: ZM`
- `X-Currency: ZMW`

**Response:**
```json
{
  "status": {
    "code": "200",
    "message": "Success"
  },
  "data": {
    "msisdn": "+260971234567",
    "balance": "1000.50",
    "currency": "ZMW"
  }
}
```

### Transaction Endpoints

#### 1. Get Transaction History
```
GET /standard/v1/users/transactions
```

**Headers:**
- `Authorization: Bearer {access_token}`
- `X-Country: ZM`
- `X-Currency: ZMW`

**Query Parameters:**
- `limit` (optional): Number of transactions to return (default: 50, max: 100)
- `offset` (optional): Number of transactions to skip (default: 0)
- `start_date` (optional): Start date in YYYY-MM-DD format
- `end_date` (optional): End date in YYYY-MM-DD format
- `transaction_type` (optional): Filter by type (DEPOSIT, WITHDRAWAL, PAYMENT, TRANSFER)

**Response:**
```json
{
  "status": {
    "code": "200",
    "message": "Success"
  },
  "data": {
    "transactions": [
      {
        "transaction_id": "TXN123456789",
        "reference": "REF123456",
        "transaction_date": "2023-12-01T10:30:00Z",
        "amount": "500.00",
        "currency": "ZMW",
        "transaction_type": "PAYMENT",
        "status": "COMPLETED",
        "description": "Payment to ABC Store",
        "counterparty": {
          "name": "ABC Store",
          "msisdn": "+260977654321"
        },
        "balance_after": "1000.50",
        "fees": "10.00"
      }
    ],
    "pagination": {
      "total": 150,
      "limit": 50,
      "offset": 0,
      "has_more": true
    }
  }
}
```

## Error Handling

### Standard Error Response
```json
{
  "status": {
    "code": "400",
    "message": "Bad Request",
    "result_code": "ESB000001"
  },
  "error": {
    "error_code": "INVALID_REQUEST",
    "error_description": "The request is missing required parameters"
  }
}
```

### Common Error Codes
- `ESB000001`: Invalid request parameters
- `ESB000002`: Authentication failed
- `ESB000003`: Insufficient permissions
- `ESB000004`: Account not found
- `ESB000005`: Transaction limit exceeded
- `ESB000006`: Service temporarily unavailable

## Rate Limiting

- **Authentication endpoints**: 10 requests per minute
- **Account endpoints**: 60 requests per minute
- **Transaction endpoints**: 100 requests per minute

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Request limit per window
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Time when the rate limit resets

## Security Considerations

### Token Security
- Access tokens expire after 1 hour
- Refresh tokens expire after 30 days
- All tokens must be stored encrypted
- Use HTTPS for all API calls

### OAuth Security
- Always validate the `state` parameter to prevent CSRF attacks
- Use secure, random state values
- Validate redirect URIs match registered URIs
- Store authorization codes temporarily (max 10 minutes)

### Data Protection
- All API responses contain sensitive financial data
- Implement proper access controls
- Log all API interactions for audit purposes
- Comply with Zambian Data Protection Act requirements

## Integration Flow

### 1. Account Linking Process
1. User initiates account linking in IntelliFin
2. System generates secure state token
3. User is redirected to Airtel OAuth authorization
4. User authenticates with Airtel Money
5. Airtel redirects back with authorization code
6. System exchanges code for access/refresh tokens
7. System fetches account profile and stores encrypted tokens
8. Account is marked as linked and active

### 2. Transaction Synchronization
1. Background job runs based on sync frequency
2. System refreshes access token if needed
3. Fetch transactions since last sync
4. Process and store new transactions
5. Update account balance
6. Trigger categorization suggestions
7. Log sync results and update sync job status

### 3. Error Recovery
1. Detect API errors and rate limits
2. Implement exponential backoff for retries
3. Handle token expiration gracefully
4. Notify users of persistent connection issues
5. Maintain sync job status for monitoring

## Testing Strategy

### Mock API Endpoints
For development and testing, implement mock endpoints that simulate:
- OAuth authorization flow
- Token exchange and refresh
- Account profile retrieval
- Balance checking
- Transaction history with pagination

### Test Scenarios
1. **Happy Path**: Successful account linking and sync
2. **Error Handling**: API errors, network failures, invalid tokens
3. **Rate Limiting**: Respect rate limits and implement backoff
4. **Token Expiration**: Automatic token refresh
5. **Data Validation**: Ensure transaction data integrity
6. **Security**: Validate OAuth flow security measures

## Monitoring and Alerting

### Key Metrics
- API response times
- Error rates by endpoint
- Token refresh frequency
- Sync job success/failure rates
- Account linking conversion rates

### Alerts
- API error rate > 5%
- Token refresh failures
- Sync job failures for > 24 hours
- Rate limit violations
- Unusual API response patterns

## Compliance Notes

### Zambian Regulations
- Store all financial data within Zambian borders or approved regions
- Implement proper audit trails for all transactions
- Ensure data retention policies comply with local requirements
- Maintain user consent records for data processing

### Data Privacy
- Minimize data collection to necessary information only
- Implement data anonymization where possible
- Provide users with data export and deletion capabilities
- Regular security audits and penetration testing
