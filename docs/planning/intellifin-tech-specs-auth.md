
# Feature Specifications

## Feature 1: User Authentication & Onboarding

### Goal
Implement a secure, multi-tenant authentication system with business onboarding that establishes the foundation for the IntelliFin platform, ensuring proper isolation between different business entities while maintaining compliance with Zambian data protection requirements.

### API Relationships
- Interacts with Auth Service for user authentication and session management
- Communicates with Organization Service for business profile management
- Integrates with Email Service for verification emails
- Connects to Azure Key Vault for secure credential management

### Detailed Requirements

#### Authentication Requirements
1. **Email/Password Authentication**
   - Secure password policies (minimum 8 characters, requiring uppercase, lowercase, numbers, and special characters)
   - Email verification via time-limited tokens
   - Password reset functionality
   - Protection against brute force attacks with rate limiting and account lockouts
   - JWT-based authentication with appropriate expiration and refresh mechanisms

2. **Multi-Factor Authentication (Optional for MVP)**
   - SMS-based verification code
   - Email-based verification code
   - Support for authenticator apps

3. **Session Management**
   - Secure, HttpOnly cookies for web sessions
   - Token-based authentication for API access
   - Automatic session timeout after period of inactivity
   - Ability to view and terminate active sessions

#### Business Onboarding Requirements
1. **Business Profile Creation**
   - Collection of essential business information:
     - Business name
     - Business type (Sole Proprietorship, Partnership, Limited Company, etc.)
     - ZRA Taxpayer Identification Number (TIN)
     - Contact details (address, phone, email)
     - Industry/sector classification
   - Validation of ZRA TIN format
   - Optional verification against ZRA database (if API available)

2. **Multi-Tenant Architecture**
   - Schema-per-tenant isolation in PostgreSQL
   - Tenant identification and routing middleware
   - Cross-tenant access prevention

3. **Role-Based Access Control**
   - Predefined roles: Owner, Admin, Staff, Accountant, Viewer
   - Custom permission sets for each role
   - Ability to invite team members with specific roles
   - Role management interface for Owner/Admin users

4. **Compliance Requirements**
   - Data residency in compliance with Zambian Data Protection Act
   - Audit logging of all authentication events
   - Privacy policy and terms of service acceptance
   - Data retention and deletion policies

### Implementation Guide

#### Database Schema

**Users Table**
```
Table users {
  id UUID [pk]
  email VARCHAR(255) [unique, not null]
  password_hash VARCHAR(255) [not null]
  first_name VARCHAR(100)
  last_name VARCHAR(100)
  phone_number VARCHAR(20)
  email_verified BOOLEAN [default: false]
  email_verification_token VARCHAR(255)
  email_verification_expires TIMESTAMP
  reset_password_token VARCHAR(255)
  reset_password_expires TIMESTAMP
  failed_login_attempts INTEGER [default: 0]
  locked_until TIMESTAMP
  last_login TIMESTAMP
  created_at TIMESTAMP [default: `now()`]
  updated_at TIMESTAMP [default: `now()`]
  
  indexes {
    email
  }
}
```

**Organizations Table**
```
Table organizations {
  id UUID [pk]
  name VARCHAR(255) [not null]
  business_type VARCHAR(50) [not null]
  zra_tin VARCHAR(20) [unique, not null]
  address VARCHAR(255)
  city VARCHAR(100)
  country VARCHAR(100) [default: 'Zambia']
  phone VARCHAR(20)
  email VARCHAR(255)
  industry VARCHAR(100)
  schema_name VARCHAR(50) [unique, not null]
  created_at TIMESTAMP [default: `now()`]
  updated_at TIMESTAMP [default: `now()`]
  
  indexes {
    zra_tin
    schema_name
  }
}
```

**Organization Users Table**
```
Table organization_users {
  id UUID [pk]
  user_id UUID [ref: > users.id, not null]
  organization_id UUID [ref: > organizations.id, not null]
  role VARCHAR(50) [not null]
  status VARCHAR(20) [not null] // 'active', 'invited', 'disabled'
  invitation_token VARCHAR(255)
  invitation_expires TIMESTAMP
  created_at TIMESTAMP [default: `now()`]
  updated_at TIMESTAMP [default: `now()`]
  
  indexes {
    (user_id, organization_id) [unique]
  }
}
```

**Audit Logs Table (per tenant schema)**
```
Table audit_logs {
  id UUID [pk]
  user_id UUID [ref: > users.id]
  action VARCHAR(100) [not null]
  entity_type VARCHAR(50)
  entity_id UUID
  old_values JSONB
  new_values JSONB
  ip_address VARCHAR(45)
  user_agent TEXT
  created_at TIMESTAMP [default: `now()`]
  
  indexes {
    user_id
    action
    entity_type, entity_id
    created_at
  }
}
```

#### Authentication Flow

**Registration Process**
```
function registerUser(email, password, firstName, lastName):
  // Validate input
  if (!isValidEmail(email)) throw new ValidationError("Invalid email format")
  if (!isStrongPassword(password)) throw new ValidationError("Password does not meet security requirements")
  
  // Check if email already exists
  existingUser = await usersRepository.findByEmail(email)
  if (existingUser) throw new ConflictError("Email already registered")
  
  // Hash password
  passwordHash = await bcrypt.hash(password, 10)
  
  // Generate email verification token
  verificationToken = generateSecureToken()
  verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
  
  // Create user
  user = await usersRepository.create({
    email,
    password_hash: passwordHash,
    first_name: firstName,
    last_name: lastName,
    email_verification_token: verificationToken,
    email_verification_expires: verificationExpires
  })
  
  // Send verification email
  await emailService.sendVerificationEmail(email, verificationToken)
  
  return {
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name
  }
```

**Email Verification Process**
```
function verifyEmail(token):
  // Find user with matching token
  user = await usersRepository.findByVerificationToken(token)
  
  // Validate token
  if (!user) throw new NotFoundError("Invalid verification token")
  if (user.email_verified) throw new BadRequestError("Email already verified")
  if (new Date() > user.email_verification_expires) throw new BadRequestError("Verification token expired")
  
  // Update user
  await usersRepository.update(user.id, {
    email_verified: true,
    email_verification_token: null,
    email_verification_expires: null
  })
  
  return {
    success: true,
    message: "Email verified successfully"
  }
```

**Login Process**
```
function login(email, password):
  // Find user
  user = await usersRepository.findByEmail(email)
  if (!user) throw new UnauthorizedError("Invalid credentials")
  
  // Check if account is locked
  if (user.locked_until && new Date() < user.locked_until) 
    throw new UnauthorizedError("Account locked. Try again later")
  
  // Verify password
  passwordValid = await bcrypt.compare(password, user.password_hash)
  
  if (!passwordValid) {
    // Increment failed attempts
    failedAttempts = user.failed_login_attempts + 1
    
    // Lock account after 5 failed attempts
    if (failedAttempts >= 5) {
      await usersRepository.update(user.id, {
        failed_login_attempts: failedAttempts,
        locked_until: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
      })
      throw new UnauthorizedError("Too many failed attempts. Account locked for 30 minutes")
    }
    
    await usersRepository.update(user.id, {
      failed_login_attempts: failedAttempts
    })
    
    throw new UnauthorizedError("Invalid credentials")
  }
  
  // Check if email is verified
  if (!user.email_verified) throw new UnauthorizedError("Email not verified")
  
  // Reset failed attempts on successful login
  await usersRepository.update(user.id, {
    failed_login_attempts: 0,
    last_login: new Date()
  })
  
  // Get user organizations
  organizations = await organizationUsersRepository.findActiveByUserId(user.id)
  
  // Generate JWT token
  token = jwt.sign(
    { 
      sub: user.id,
      email: user.email,
      organizations: organizations.map(org => ({
        id: org.organization_id,
        role: org.role
      }))
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  )
  
  // Generate refresh token
  refreshToken = generateRefreshToken(user.id)
  
  return {
    token,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name
    },
    organizations: organizations.map(org => ({
      id: org.organization.id,
      name: org.organization.name,
      role: org.role
    }))
  }
```

#### Business Onboarding Flow

**Organization Creation Process**
```
function createOrganization(userId, organizationData):
  // Validate input
  if (!organizationData.name) throw new ValidationError("Organization name is required")
  if (!organizationData.business_type) throw new ValidationError("Business type is required")
  if (!isValidZraTin(organizationData.zra_tin)) throw new ValidationError("Invalid ZRA TIN format")
  
  // Check if TIN already exists
  existingOrg = await organizationsRepository.findByZraTin(organizationData.zra_tin)
  if (existingOrg) throw new ConflictError("Organization with this ZRA TIN already exists")
  
  // Generate schema name
  schemaName = `org_${generateUniqueId()}`
  
  // Start transaction
  return await db.transaction(async (tx) => {
    // Create organization
    organization = await organizationsRepository.create({
      name: organizationData.name,
      business_type: organizationData.business_type,
      zra_tin: organizationData.zra_tin,
      address: organizationData.address,
      city: organizationData.city,
      phone: organizationData.phone,
      email: organizationData.email,
      industry: organizationData.industry,
      schema_name: schemaName
    }, tx)
    
    // Create organization user relationship with Owner role
    await organizationUsersRepository.create({
      user_id: userId,
      organization_id: organization.id,
      role: 'Owner',
      status: 'active'
    }, tx)
    
    // Create tenant schema
    await schemaService.createSchema(schemaName, tx)
    
    // Initialize tenant schema with required tables
    await schemaService.initializeTables(schemaName, tx)
    
    return {
      id: organization.id,
      name: organization.name,
      zra_tin: organization.zra_tin,
      schema_name: organization.schema_name
    }
  })
```

**User Invitation Process**
```
function inviteUser(organizationId, inviterUserId, email, role):
  // Validate input
  if (!isValidEmail(email)) throw new ValidationError("Invalid email format")
  if (!isValidRole(role)) throw new ValidationError("Invalid role")
  
  // Check if inviter has permission
  inviterOrgUser = await organizationUsersRepository.findByUserAndOrganization(inviterUserId, organizationId)
  if (!inviterOrgUser || !canInviteUsers(inviterOrgUser.role)) 
    throw new ForbiddenError("You don't have permission to invite users")
  
  // Check if user already exists
  existingUser = await usersRepository.findByEmail(email)
  
  // Generate invitation token
  invitationToken = generateSecureToken()
  invitationExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  
  if (existingUser) {
    // Check if user is already in organization
    existingOrgUser = await organizationUsersRepository.findByUserAndOrganization(existingUser.id, organizationId)
    if (existingOrgUser) {
      if (existingOrgUser.status === 'active')
        throw new ConflictError("User is already a member of this organization")
      
      // Update existing invitation
      await organizationUsersRepository.update(existingOrgUser.id, {
        role,
        invitation_token: invitationToken,
        invitation_expires: invitationExpires
      })
    } else {
      // Create new organization user relationship
      await organizationUsersRepository.create({
        user_id: existingUser.id,
        organization_id: organizationId,
        role,
        status: 'invited',
        invitation_token: invitationToken,
        invitation_expires: invitationExpires
      })
    }
    
    // Send invitation email to existing user
    organization = await organizationsRepository.findById(organizationId)
    await emailService.sendOrganizationInvitation(
      email, 
      invitationToken, 
      organization.name, 
      role,
      true // existing user
    )
  } else {
    // Create placeholder user
    tempUser = await usersRepository.create({
      email,
      password_hash: '', // Will be set when user accepts invitation
      email_verified: false
    })
    
    // Create organization user relationship
    await organizationUsersRepository.create({
      user_id: tempUser.id,
      organization_id: organizationId,
      role,
      status: 'invited',
      invitation_token: invitationToken,
      invitation_expires: invitationExpires
    })
    
    // Send invitation email to new user
    organization = await organizationsRepository.findById(organizationId)
    await emailService.sendOrganizationInvitation(
      email, 
      invitationToken, 
      organization.name, 
      role,
      false // new user
    )
  }
  
  return {
    success: true,
    message: "Invitation sent successfully"
  }
```

#### API Endpoints

**Authentication Endpoints**

1. **Register User**
   - `POST /api/auth/register`
   - Request:
     ```json
     {
       "email": "user@example.com",
       "password": "SecureP@ssw0rd",
       "firstName": "John",
       "lastName": "Doe"
     }
     ```
   - Response (201 Created):
     ```json
     {
       "id": "550e8400-e29b-41d4-a716-446655440000",
       "email": "user@example.com",
       "firstName": "John",
       "lastName": "Doe",
       "message": "Registration successful. Please verify your email."
     }
     ```
   - Error Responses:
     - 400 Bad Request: Invalid input
     - 409 Conflict: Email already exists

2. **Verify Email**
   - `GET /api/auth/verify-email?token={token}`
   - Response (200 OK):
     ```json
     {
       "success": true,
       "message": "Email verified successfully"
     }
     ```
   - Error Responses:
     - 400 Bad Request: Invalid or expired token
     - 404 Not Found: Token not found

3. **Login**
   - `POST /api/auth/login`
   - Request:
     ```json
     {
       "email": "user@example.com",
       "password": "SecureP@ssw0rd"
     }
     ```
   - Response (200 OK):
     ```json
     {
       "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
       "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
       "user": {
         "id": "550e8400-e29b-41d4-a716-446655440000",
         "email": "user@example.com",
         "firstName": "John",
         "lastName": "Doe"
       },
       "organizations": [
         {
           "id": "550e8400-e29b-41d4-a716-446655440001",
           "name": "My Business",
           "role": "Owner"
         }
       ]
     }
     ```
   - Error Responses:
     - 401 Unauthorized: Invalid credentials or account locked
     - 403 Forbidden: Email not verified

4. **Refresh Token**
   - `POST /api/auth/refresh-token`
   - Request:
     ```json
     {
       "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
     }
     ```
   - Response (200 OK):
     ```json
     {
       "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
       "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
     }
     ```
   - Error Responses:
     - 401 Unauthorized: Invalid or expired refresh token

5. **Forgot Password**
   - `POST /api/auth/forgot-password`
   - Request:
     ```json
     {
       "email": "user@example.com"
     }
     ```
   - Response (200 OK):
     ```json
     {
       "success": true,
       "message": "If your email is registered, you will receive password reset instructions"
     }
     ```

6. **Reset Password**
   - `POST /api/auth/reset-password`
   - Request:
     ```json
     {
       "token": "reset-token-from-email",
       "password": "NewSecureP@ssw0rd"
     }
     ```
   - Response (200 OK):
     ```json
     {
       "success": true,
       "message": "Password reset successful"
     }
     ```
   - Error Responses:
     - 400 Bad Request: Invalid or expired token, password requirements not met
     - 404 Not Found: Token not found

**Organization Endpoints**

1. **Create Organization**
   - `POST /api/organizations`
   - Auth: Required
   - Request:
     ```json
     {
       "name": "My Business",
       "business_type": "Limited Company",
       "zra_tin": "1000000000",
       "address": "123 Business St",
       "city": "Lusaka",
       "phone": "+260 97 1234567",
       "email": "business@example.com",
       "industry": "Retail"
     }
     ```
   - Response (201 Created):
     ```json
     {
       "id": "550e8400-e29b-41d4-a716-446655440001",
       "name": "My Business",
       "zra_tin": "1000000000"
     }
     ```
   - Error Responses:
     - 400 Bad Request: Invalid input
     - 409 Conflict: Organization with this ZRA TIN already exists

2. **Get User Organizations**
   - `GET /api/organizations`
   - Auth: Required
   - Response (200 OK):
     ```json
     {
       "organizations": [
         {
           "id": "550e8400-e29b-41d4-a716-446655440001",
           "name": "My Business",
           "zra_tin": "1000000000",
           "business_type": "Limited Company",
           "role": "Owner"
         }
       ]
     }
     ```

3. **Get Organization Details**
   - `GET /api/organizations/{id}`
   - Auth: Required, must be member of organization
   - Response (200 OK):
     ```json
     {
       "id": "550e8400-e29b-41d4-a716-446655440001",
       "name": "My Business",
       "business_type": "Limited Company",
       "zra_tin": "1000000000",
       "address": "123 Business St",
       "city": "Lusaka",
       "country": "Zambia",
       "phone": "+260 97 1234567",
       "email": "business@example.com",
       "industry": "Retail",
       "created_at": "2023-01-01T00:00:00Z"
     }
     ```
   - Error Responses:
     - 403 Forbidden: Not a member of the organization
     - 404 Not Found: Organization not found

4. **Update Organization**
   - `PUT /api/organizations/{id}`
   - Auth: Required, must be Owner or Admin
   - Request:
     ```json
     {
       "name": "My Business Updated",
       "address": "456 New Business St",
       "city": "Kitwe",
       "phone": "+260 97 7654321",
       "email": "new-business@example.com",
       "industry": "E-commerce"
     }
     ```
   - Response (200 OK):
     ```json
     {
       "id": "550e8400-e29b-41d4-a716-446655440001",
       "name": "My Business Updated",
       "business_type": "Limited Company",
       "zra_tin": "1000000000",
       "address": "456 New Business St",
       "city": "Kitwe",
       "country": "Zambia",
       "phone": "+260 97 7654321",
       "email": "new-business@example.com",
       "industry": "E-commerce"
     }
     ```
   - Error Responses:
     - 403 Forbidden: Insufficient permissions
     - 404 Not Found: Organization not found

5. **Invite User to Organization**
   - `POST /api/organizations/{id}/invitations`
   - Auth: Required, must be Owner or Admin
   - Request:
     ```json
     {
       "email": "newuser@example.com",
       "role": "Staff"
     }
     ```
   - Response (200 OK):
     ```json
     {
       "success": true,
       "message": "Invitation sent successfully"
     }
     ```
   - Error Responses:
     - 400 Bad Request: Invalid input
     - 403 Forbidden: Insufficient permissions
     - 409 Conflict: User already a member

6. **Accept Organization Invitation**
   - `POST /api/organizations/invitations/accept`
   - Request:
     ```json
     {
       "token": "invitation-token-from-email",
       "password": "SecureP@ssw0rd" // Only required for new users
     }
     ```
   - Response (200 OK):
     ```json
     {
       "success": true,
       "organization": {
         "id": "550e8400-e29b-41d4-a716-446655440001",
         "name": "My Business",
         "role": "Staff"
       }
     }
     ```
   - Error Responses:
     - 400 Bad Request: Invalid or expired token
     - 404 Not Found: Invitation not found

#### Frontend Components

**Authentication Components**

1. **RegisterForm**
   - Form for user registration with email and password
   - Client-side validation for email format and password strength
   - Submission handling with loading state
   - Error message display
   - Link to login page

2. **LoginForm**
   - Form for user login with email and password
   - "Remember me" checkbox
   - Forgot password link
   - Submission handling with loading state
   - Error message display
   - Link to registration page

3. **EmailVerificationPage**
   - Token extraction from URL
   - Automatic verification on page load
   - Success/error message display
   - Redirect to login on success

4. **ForgotPasswordForm**
   - Form for requesting password reset
   - Email input with validation
   - Submission handling with loading state
   - Success/error message display

5. **ResetPasswordForm**
   - Token extraction from URL
   - Password and confirm password inputs
   - Password strength indicator
   - Submission handling with loading state
   - Success/error message display
   - Redirect to login on success

**Onboarding Components**

1. **OnboardingWizard**
   - Multi-step form with progress indicator
   - Step navigation (next/back buttons)
   - Form state management across steps
   - Completion handling

2. **BusinessDetailsForm**
   - Form for business information
   - Input fields for name, type, contact details
   - Validation for required fields
   - Business type dropdown with common Zambian business types

3. **ComplianceForm**
   - ZRA TIN input with format validation
   - Optional TIN verification
   - Terms and conditions acceptance
   - Privacy policy acceptance

4. **TeamSetupForm (Optional for MVP)**
   - Form for inviting initial team members
   - Email inputs with role selection
   - Dynamic addition/removal of team members
   - Bulk invitation sending

5. **OnboardingComplete**
   - Success message and animation
   - Summary of business information
   - Quick start guide or tutorial offer
   - "Go to Dashboard" button

#### Security Considerations

1. **Authentication Security**
   - Password hashing using bcrypt with appropriate work factor
   - JWT tokens with short expiration (1 hour)
   - Refresh tokens with longer expiration (7 days)
   - CSRF protection for cookie-based authentication
   - Rate limiting for login attempts (5 per hour per IP)
   - Account lockout after 5 failed attempts (30 minutes)
   - Secure, HttpOnly cookies for web sessions

2. **Multi-Tenant Security**
   - Schema-per-tenant isolation
   - Tenant context middleware to validate access
   - Row-level security where applicable
   - Cross-tenant access prevention
   - Tenant identification in all logs

3. **API Security**
   - Input validation for all endpoints
   - Parameterized queries to prevent SQL injection
   - Content Security Policy (CSP) headers
   - CORS configuration
   - Helmet.js for security headers
   - API rate limiting

4. **Data Protection**
   - Encryption at rest for sensitive data
   - TLS/SSL for all connections
   - Secure credential storage in Azure Key Vault
   - Audit logging for all authentication and authorization events
   - Data minimization principles

#### Testing Strategy

1. **Unit Tests**
   - Authentication service methods
   - Password hashing and verification
   - Token generation and validation
   - Input validation
   - Permission checks

2. **Integration Tests**
   - API endpoint testing
   - Database interactions
   - Email sending
   - Multi-tenant isolation

3. **End-to-End Tests**
   - Registration flow
   - Login flow
   - Password reset flow
   - Business onboarding flow
   - Team invitation flow

4. **Security Tests**
   - Authentication bypass attempts
   - Cross-tenant access attempts
   - SQL injection protection
   - XSS protection
   - CSRF protection
   - Rate limiting effectiveness

#### Error Handling

1. **Authentication Errors**
   - Invalid credentials: Generic "Invalid email or password" message
   - Account lockout: Clear message with time remaining
   - Email verification required: Prompt with resend option
   - Expired tokens: Clear message with renewal instructions

2. **Validation Errors**
   - Field-specific error messages
   - Form-level error summary
   - Client-side validation before submission
   - Server-side validation as backup

3. **Authorization Errors**
   - Clear permission denied messages
   - Logging of access attempts
   - Appropriate HTTP status codes (403 Forbidden)

4. **System Errors**
   - Generic user-facing error messages
   - Detailed logging for debugging
   - Unique error reference IDs
   - Monitoring and alerting for critical errors

#### Logging and Monitoring

1. **Authentication Events**
   - Login attempts (successful and failed)
   - Password resets
   - Email verifications
   - Account lockouts
   - Role changes

2. **Organization Events**
   - Organization creation
   - Member invitations
   - Member role changes
   - Organization settings changes

3. **Security Events**
   - Suspicious activity detection
   - Multiple failed login attempts
   - Cross-tenant access attempts
   - API rate limit breaches

4. **Performance Monitoring**
   - Authentication response times
   - Database query performance
   - API endpoint response times
   - Error rates

### Key Edge Cases

1. **User Registration**
   - Email already registered but not verified
   - Email already registered with social provider
   - Password meets length but not complexity requirements
   - User attempts to register with disposable email domain

2. **Authentication**
   - User attempts login after long inactivity
   - Concurrent login from multiple devices
   - Login attempt during maintenance window
   - Session timeout during active use

3. **Business Onboarding**
   - ZRA TIN already registered by another user
   - Business with similar name already exists
   - Required fields missing or invalid
   - Onboarding process interrupted and resumed later

4. **Multi-Tenancy**
   - User belongs to multiple organizations
   - User switches between organizations
   - Organization data migration between schemas
   - Database schema creation failures

5. **Team Management**
   - Invitation to email already in system
   - Invitation expires before acceptance
   - Owner attempts to downgrade own role
   - Last owner attempts to leave organization
```
