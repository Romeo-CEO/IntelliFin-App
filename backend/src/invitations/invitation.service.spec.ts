import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InvitationService } from './invitation.service';
import { InvitationRepository } from './invitation.repository';
import { UsersService } from '../users/users.service';
import { EmailService } from '../email/email.service';
import { UserRole, InvitationStatus } from '@prisma/client';

describe('InvitationService', () => {
  let service: InvitationService;
  let invitationRepository: jest.Mocked<InvitationRepository>;
  let usersService: jest.Mocked<UsersService>;
  let emailService: jest.Mocked<EmailService>;

  const mockInvitationRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    findByToken: jest.fn(),
    findByEmailAndTenant: jest.fn(),
    update: jest.fn(),
    findByTenant: jest.fn(),
    countByTenant: jest.fn(),
  };

  const mockUsersService = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
  };

  const mockEmailService = {
    sendInvitationEmail: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue(72), // Default 72 hours
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationService,
        {
          provide: InvitationRepository,
          useValue: mockInvitationRepository,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<InvitationService>(InvitationService);
    invitationRepository = module.get(InvitationRepository);
    usersService = module.get(UsersService);
    emailService = module.get(EmailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createInvitation', () => {
    const createInvitationDto = {
      email: 'test@example.com',
      role: UserRole.USER,
      message: 'Welcome to the team!',
    };
    const inviterId = 'inviter-id';
    const tenantId = 'tenant-id';

    it('should create invitation successfully', async () => {
      const mockInviter = {
        id: inviterId,
        role: UserRole.ADMIN,
        firstName: 'John',
        lastName: 'Doe',
      };

      const mockInvitation = {
        id: 'invitation-id',
        email: createInvitationDto.email,
        role: createInvitationDto.role,
        token: 'mock-token',
        status: InvitationStatus.PENDING,
        expiresAt: new Date(),
        tenantId,
        invitedBy: inviterId,
        message: createInvitationDto.message,
        inviter: mockInviter,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      usersService.findById.mockResolvedValue(mockInviter as any);
      usersService.findByEmail.mockResolvedValue(null);
      invitationRepository.findByEmailAndTenant.mockResolvedValue(null);
      invitationRepository.create.mockResolvedValue(mockInvitation as any);
      emailService.sendInvitationEmail.mockResolvedValue();

      const result = await service.createInvitation(createInvitationDto, inviterId, tenantId);

      expect(result).toBeDefined();
      expect(result.email).toBe(createInvitationDto.email);
      expect(result.role).toBe(createInvitationDto.role);
      expect(invitationRepository.create).toHaveBeenCalled();
      expect(emailService.sendInvitationEmail).toHaveBeenCalled();
    });

    it('should throw ConflictException if user already exists', async () => {
      const mockInviter = {
        id: inviterId,
        role: UserRole.ADMIN,
      };

      const existingUser = {
        id: 'existing-user-id',
        email: createInvitationDto.email,
        tenantId,
      };

      usersService.findById.mockResolvedValue(mockInviter as any);
      usersService.findByEmail.mockResolvedValue(existingUser as any);

      await expect(
        service.createInvitation(createInvitationDto, inviterId, tenantId),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if pending invitation exists', async () => {
      const mockInviter = {
        id: inviterId,
        role: UserRole.ADMIN,
      };

      const existingInvitation = {
        id: 'existing-invitation-id',
        email: createInvitationDto.email,
        status: InvitationStatus.PENDING,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Future date
      };

      usersService.findById.mockResolvedValue(mockInviter as any);
      usersService.findByEmail.mockResolvedValue(null);
      invitationRepository.findByEmailAndTenant.mockResolvedValue(existingInvitation as any);

      await expect(
        service.createInvitation(createInvitationDto, inviterId, tenantId),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('acceptInvitation', () => {
    const acceptInvitationDto = {
      token: 'valid-token',
      firstName: 'Jane',
      lastName: 'Doe',
      password: 'securepassword123',
      phone: '+260977123456',
    };

    it('should accept invitation successfully', async () => {
      const mockInvitation = {
        id: 'invitation-id',
        email: 'test@example.com',
        role: UserRole.USER,
        status: InvitationStatus.PENDING,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Future date
        tenantId: 'tenant-id',
        invitedBy: 'inviter-id',
      };

      const mockUser = {
        id: 'new-user-id',
        email: mockInvitation.email,
        firstName: acceptInvitationDto.firstName,
        lastName: acceptInvitationDto.lastName,
        role: mockInvitation.role,
        tenantId: mockInvitation.tenantId,
      };

      const updatedInvitation = {
        ...mockInvitation,
        status: InvitationStatus.ACCEPTED,
        acceptedAt: new Date(),
        invitedUser: mockUser.id,
      };

      invitationRepository.findByToken.mockResolvedValue(mockInvitation as any);
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue(mockUser as any);
      invitationRepository.update.mockResolvedValue(updatedInvitation as any);

      const result = await service.acceptInvitation(acceptInvitationDto);

      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.invitation).toBeDefined();
      expect(result.invitation.status).toBe(InvitationStatus.ACCEPTED);
      expect(usersService.create).toHaveBeenCalled();
      expect(invitationRepository.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException for invalid token', async () => {
      invitationRepository.findByToken.mockResolvedValue(null);

      await expect(
        service.acceptInvitation(acceptInvitationDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for expired invitation', async () => {
      const expiredInvitation = {
        id: 'invitation-id',
        email: 'test@example.com',
        status: InvitationStatus.PENDING,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Past date
      };

      invitationRepository.findByToken.mockResolvedValue(expiredInvitation as any);
      invitationRepository.update.mockResolvedValue({
        ...expiredInvitation,
        status: InvitationStatus.EXPIRED,
      } as any);

      await expect(
        service.acceptInvitation(acceptInvitationDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for already processed invitation', async () => {
      const processedInvitation = {
        id: 'invitation-id',
        email: 'test@example.com',
        status: InvitationStatus.ACCEPTED,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      invitationRepository.findByToken.mockResolvedValue(processedInvitation as any);

      await expect(
        service.acceptInvitation(acceptInvitationDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getInvitationsByTenant', () => {
    it('should return paginated invitations', async () => {
      const tenantId = 'tenant-id';
      const mockInvitations = [
        {
          id: 'invitation-1',
          email: 'user1@example.com',
          role: UserRole.USER,
          status: InvitationStatus.PENDING,
        },
        {
          id: 'invitation-2',
          email: 'user2@example.com',
          role: UserRole.MANAGER,
          status: InvitationStatus.ACCEPTED,
        },
      ];

      invitationRepository.findByTenant.mockResolvedValue(mockInvitations as any);
      invitationRepository.countByTenant.mockResolvedValue(2);

      const result = await service.getInvitationsByTenant(tenantId, 1, 10);

      expect(result).toBeDefined();
      expect(result.invitations).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
    });
  });
});
