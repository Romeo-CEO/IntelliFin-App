import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DashboardCacheService } from '../dashboard-cache.service';
import Redis from 'ioredis';

// Mock Redis
jest.mock('ioredis');
const MockedRedis = Redis as jest.MockedClass<typeof Redis>;

describe('DashboardCacheService', () => {
  let service: DashboardCacheService;
  let mockRedis: jest.Mocked<Redis>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    // Create mock Redis instance
    mockRedis = {
      get: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      keys: jest.fn(),
      ping: jest.fn(),
      info: jest.fn(),
      dbsize: jest.fn(),
      mget: jest.fn(),
      pipeline: jest.fn(),
      on: jest.fn(),
    } as any;

    // Mock Redis constructor
    MockedRedis.mockImplementation(() => mockRedis);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardCacheService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue({
              host: 'localhost',
              port: 6379,
              password: null,
              db: 0,
            }),
          },
        },
      ],
    }).compile();

    service = module.get<DashboardCacheService>(DashboardCacheService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('get', () => {
    it('should return parsed data when cache hit', async () => {
      const testData = { value: 100, name: 'test' };
      const serializedData = JSON.stringify(testData);

      mockRedis.get.mockResolvedValue(serializedData);

      const result = await service.get('test-key');

      expect(result).toEqual(testData);
      expect(mockRedis.get).toHaveBeenCalledWith(
        'intellifin:dashboard:test-key'
      );
    });

    it('should return null when cache miss', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.get('test-key');

      expect(result).toBeNull();
      expect(mockRedis.get).toHaveBeenCalledWith(
        'intellifin:dashboard:test-key'
      );
    });

    it('should return null when Redis throws error', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis connection failed'));

      const result = await service.get('test-key');

      expect(result).toBeNull();
    });

    it('should return null when JSON parsing fails', async () => {
      mockRedis.get.mockResolvedValue('invalid-json');

      const result = await service.get('test-key');

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should cache data with default TTL', async () => {
      const testData = { value: 100, name: 'test' };

      mockRedis.setex.mockResolvedValue('OK');

      await service.set('test-key', testData);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'intellifin:dashboard:test-key',
        300, // default TTL
        JSON.stringify(testData)
      );
    });

    it('should cache data with custom TTL', async () => {
      const testData = { value: 100, name: 'test' };
      const customTtl = 600;

      mockRedis.setex.mockResolvedValue('OK');

      await service.set('test-key', testData, customTtl);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'intellifin:dashboard:test-key',
        customTtl,
        JSON.stringify(testData)
      );
    });

    it('should handle Redis errors gracefully', async () => {
      const testData = { value: 100, name: 'test' };

      mockRedis.setex.mockRejectedValue(new Error('Redis connection failed'));

      // Should not throw error
      await expect(service.set('test-key', testData)).resolves.toBeUndefined();
    });
  });

  describe('delete', () => {
    it('should delete cached data', async () => {
      mockRedis.del.mockResolvedValue(1);

      await service.delete('test-key');

      expect(mockRedis.del).toHaveBeenCalledWith(
        'intellifin:dashboard:test-key'
      );
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.del.mockRejectedValue(new Error('Redis connection failed'));

      // Should not throw error
      await expect(service.delete('test-key')).resolves.toBeUndefined();
    });
  });

  describe('deletePattern', () => {
    it('should delete multiple keys matching pattern', async () => {
      const matchingKeys = [
        'intellifin:dashboard:org-123-data',
        'intellifin:dashboard:org-123-kpis',
      ];

      mockRedis.keys.mockResolvedValue(matchingKeys);
      mockRedis.del.mockResolvedValue(2);

      await service.deletePattern('org-123*');

      expect(mockRedis.keys).toHaveBeenCalledWith(
        'intellifin:dashboard:org-123*'
      );
      expect(mockRedis.del).toHaveBeenCalledWith(...matchingKeys);
    });

    it('should handle no matching keys', async () => {
      mockRedis.keys.mockResolvedValue([]);

      await service.deletePattern('non-existent*');

      expect(mockRedis.keys).toHaveBeenCalledWith(
        'intellifin:dashboard:non-existent*'
      );
      expect(mockRedis.del).not.toHaveBeenCalled();
    });
  });

  describe('invalidateOrganizationCache', () => {
    it('should invalidate all cache for organization', async () => {
      const organizationId = 'org-123';
      const matchingKeys = [
        'intellifin:dashboard:dashboard_overview_org-123_month_true',
        'intellifin:dashboard:kpi_metrics_org-123_all',
      ];

      mockRedis.keys.mockResolvedValue(matchingKeys);
      mockRedis.del.mockResolvedValue(2);

      await service.invalidateOrganizationCache(organizationId);

      expect(mockRedis.keys).toHaveBeenCalledWith(
        'intellifin:dashboard:*org-123*'
      );
      expect(mockRedis.del).toHaveBeenCalledWith(...matchingKeys);
    });
  });

  describe('invalidateWidgetCache', () => {
    it('should invalidate cache for specific widget', async () => {
      const widgetId = 'widget-456';

      mockRedis.del.mockResolvedValue(1);

      await service.invalidateWidgetCache(widgetId);

      expect(mockRedis.del).toHaveBeenCalledWith(
        'intellifin:dashboard:widget_data_widget-456'
      );
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', async () => {
      const mockInfo = 'used_memory_human:2.5M\nother_info:value';
      const mockKeyCount = 150;

      mockRedis.info.mockResolvedValue(mockInfo);
      mockRedis.dbsize.mockResolvedValue(mockKeyCount);

      const stats = await service.getCacheStats();

      expect(stats).toEqual({
        totalKeys: 150,
        memoryUsage: '2.5M',
        hitRate: 0,
      });
    });

    it('should handle Redis errors in stats', async () => {
      mockRedis.info.mockRejectedValue(new Error('Redis error'));
      mockRedis.dbsize.mockRejectedValue(new Error('Redis error'));

      const stats = await service.getCacheStats();

      expect(stats).toEqual({
        totalKeys: 0,
        memoryUsage: 'Unknown',
        hitRate: 0,
      });
    });
  });

  describe('isAvailable', () => {
    it('should return true when Redis is available', async () => {
      mockRedis.ping.mockResolvedValue('PONG');

      const isAvailable = await service.isAvailable();

      expect(isAvailable).toBe(true);
      expect(mockRedis.ping).toHaveBeenCalled();
    });

    it('should return false when Redis is not available', async () => {
      mockRedis.ping.mockRejectedValue(new Error('Connection failed'));

      const isAvailable = await service.isAvailable();

      expect(isAvailable).toBe(false);
    });
  });

  describe('getOrSet', () => {
    it('should return cached value when available', async () => {
      const cachedData = { value: 100 };
      const computeFn = jest.fn().mockResolvedValue({ value: 200 });

      mockRedis.get.mockResolvedValue(JSON.stringify(cachedData));

      const result = await service.getOrSet('test-key', computeFn, 600);

      expect(result).toEqual(cachedData);
      expect(computeFn).not.toHaveBeenCalled();
      expect(mockRedis.setex).not.toHaveBeenCalled();
    });

    it('should compute and cache value when not in cache', async () => {
      const computedData = { value: 200 };
      const computeFn = jest.fn().mockResolvedValue(computedData);

      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue('OK');

      const result = await service.getOrSet('test-key', computeFn, 600);

      expect(result).toEqual(computedData);
      expect(computeFn).toHaveBeenCalled();
      expect(mockRedis.setex).toHaveBeenCalledWith(
        'intellifin:dashboard:test-key',
        600,
        JSON.stringify(computedData)
      );
    });

    it('should return computed value even if caching fails', async () => {
      const computedData = { value: 200 };
      const computeFn = jest.fn().mockResolvedValue(computedData);

      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockRejectedValue(new Error('Cache write failed'));

      const result = await service.getOrSet('test-key', computeFn, 600);

      expect(result).toEqual(computedData);
      expect(computeFn).toHaveBeenCalled();
    });
  });

  describe('mget', () => {
    it('should return multiple cached values', async () => {
      const keys = ['key1', 'key2', 'key3'];
      const values = [
        JSON.stringify({ value: 1 }),
        JSON.stringify({ value: 2 }),
        null,
      ];

      mockRedis.mget.mockResolvedValue(values);

      const result = await service.mget(keys);

      expect(result).toEqual([{ value: 1 }, { value: 2 }, null]);
      expect(mockRedis.mget).toHaveBeenCalledWith(
        'intellifin:dashboard:key1',
        'intellifin:dashboard:key2',
        'intellifin:dashboard:key3'
      );
    });

    it('should handle Redis errors in mget', async () => {
      const keys = ['key1', 'key2'];

      mockRedis.mget.mockRejectedValue(new Error('Redis error'));

      const result = await service.mget(keys);

      expect(result).toEqual([null, null]);
    });
  });

  describe('mset', () => {
    it('should set multiple values with pipeline', async () => {
      const keyValuePairs = [
        { key: 'key1', value: { data: 1 }, ttl: 300 },
        { key: 'key2', value: { data: 2 }, ttl: 600 },
      ];

      const mockPipeline = {
        setex: jest.fn(),
        exec: jest.fn().mockResolvedValue([]),
      };

      mockRedis.pipeline.mockReturnValue(mockPipeline as any);

      await service.mset(keyValuePairs);

      expect(mockRedis.pipeline).toHaveBeenCalled();
      expect(mockPipeline.setex).toHaveBeenCalledWith(
        'intellifin:dashboard:key1',
        300,
        JSON.stringify({ data: 1 })
      );
      expect(mockPipeline.setex).toHaveBeenCalledWith(
        'intellifin:dashboard:key2',
        600,
        JSON.stringify({ data: 2 })
      );
      expect(mockPipeline.exec).toHaveBeenCalled();
    });
  });

  describe('getCacheKey', () => {
    it('should generate cache key with type and organization', () => {
      const key = service.getCacheKey('dashboard', 'org-123', 'month', 'true');

      expect(key).toBe('dashboard_org-123_month_true');
    });

    it('should generate cache key with minimal parameters', () => {
      const key = service.getCacheKey('kpis', 'org-456');

      expect(key).toBe('kpis_org-456');
    });
  });
});
