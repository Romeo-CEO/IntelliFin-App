import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Activity,
  Database,
  Zap,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Gauge,
  Server,
  HardDrive,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PerformanceMetrics {
  queryPerformance: {
    averageResponseTime: number;
    slowQueries: Array<{
      query: string;
      duration: number;
      frequency: number;
    }>;
    totalQueries: number;
    cacheHitRate: number;
  };
  cacheMetrics: {
    hitRate: number;
    missRate: number;
    evictionRate: number;
    memoryUsage: number;
    totalKeys: number;
  };
  databaseMetrics: {
    connectionPoolSize: number;
    activeConnections: number;
    queryQueueLength: number;
    indexEfficiency: number;
  };
  recommendations: Array<{
    type: string;
    priority: string;
    description: string;
    expectedImprovement: string;
    implementationCost: string;
  }>;
}

export function PerformanceMonitoring() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadMetrics();
    
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(loadMetrics, 30000); // Refresh every 30 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const loadMetrics = async () => {
    try {
      setIsRefreshing(true);

      // TODO: Replace with actual API call
      // const response = await performanceApi.getMetrics();
      
      // Mock data
      const mockMetrics: PerformanceMetrics = {
        queryPerformance: {
          averageResponseTime: 245,
          slowQueries: [
            { query: 'Tax Rate Lookup', duration: 850, frequency: 156 },
            { query: 'Compliance Score Calculation', duration: 720, frequency: 89 },
            { query: 'Withholding Certificate Aggregation', duration: 650, frequency: 234 },
          ],
          totalQueries: 15420,
          cacheHitRate: 87,
        },
        cacheMetrics: {
          hitRate: 87,
          missRate: 13,
          evictionRate: 2,
          memoryUsage: 128,
          totalKeys: 1250,
        },
        databaseMetrics: {
          connectionPoolSize: 20,
          activeConnections: 8,
          queryQueueLength: 2,
          indexEfficiency: 92,
        },
        recommendations: [
          {
            type: 'INDEX',
            priority: 'HIGH',
            description: 'Add composite index for tax rate lookups',
            expectedImprovement: '40-60% reduction in query time',
            implementationCost: 'LOW',
          },
          {
            type: 'CACHE',
            priority: 'MEDIUM',
            description: 'Implement Redis caching for compliance scores',
            expectedImprovement: '30% improvement in response time',
            implementationCost: 'MEDIUM',
          },
          {
            type: 'QUERY',
            priority: 'HIGH',
            description: 'Optimize withholding certificate aggregation query',
            expectedImprovement: '50% reduction in execution time',
            implementationCost: 'LOW',
          },
        ],
      };

      setMetrics(mockMetrics);
    } catch (error) {
      console.error('Failed to load performance metrics:', error);
      toast({
        title: 'Error',
        description: 'Failed to load performance metrics',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const optimizeQueries = async () => {
    try {
      // TODO: Implement query optimization
      toast({
        title: 'Optimization Started',
        description: 'Query optimization process initiated',
      });
    } catch (error) {
      console.error('Failed to optimize queries:', error);
      toast({
        title: 'Error',
        description: 'Failed to start optimization',
        variant: 'destructive',
      });
    }
  };

  const clearCache = async () => {
    try {
      // TODO: Implement cache clearing
      toast({
        title: 'Cache Cleared',
        description: 'Application cache has been cleared',
      });
    } catch (error) {
      console.error('Failed to clear cache:', error);
      toast({
        title: 'Error',
        description: 'Failed to clear cache',
        variant: 'destructive',
      });
    }
  };

  const getPerformanceColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value >= thresholds.good) return 'text-green-600';
    if (value >= thresholds.warning) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'LOW': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'MEDIUM': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'HIGH': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'CRITICAL': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Performance Monitoring</h2>
          <p className="text-muted-foreground">
            Real-time performance metrics and optimization recommendations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Activity className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-pulse' : ''}`} />
            {autoRefresh ? 'Auto Refresh On' : 'Auto Refresh Off'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={loadMetrics}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Response Time</p>
                <p className={`text-2xl font-bold ${getPerformanceColor(metrics.queryPerformance.averageResponseTime, { good: 200, warning: 500 })}`}>
                  {metrics.queryPerformance.averageResponseTime}ms
                </p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Cache Hit Rate</p>
                <p className={`text-2xl font-bold ${getPerformanceColor(metrics.cacheMetrics.hitRate, { good: 80, warning: 60 })}`}>
                  {metrics.cacheMetrics.hitRate}%
                </p>
              </div>
              <Zap className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Connections</p>
                <p className="text-2xl font-bold">
                  {metrics.databaseMetrics.activeConnections}/{metrics.databaseMetrics.connectionPoolSize}
                </p>
              </div>
              <Database className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Index Efficiency</p>
                <p className={`text-2xl font-bold ${getPerformanceColor(metrics.databaseMetrics.indexEfficiency, { good: 90, warning: 70 })}`}>
                  {metrics.databaseMetrics.indexEfficiency}%
                </p>
              </div>
              <Gauge className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Query Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Query Performance
            </CardTitle>
            <CardDescription>
              Database query performance metrics and slow query analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Total Queries:</span>
                  <span className="ml-2 font-medium">{metrics.queryPerformance.totalQueries.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Avg Response:</span>
                  <span className="ml-2 font-medium">{metrics.queryPerformance.averageResponseTime}ms</span>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Slow Queries</h4>
                <div className="space-y-2">
                  {metrics.queryPerformance.slowQueries.map((query, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{query.query}</div>
                        <div className="text-xs text-muted-foreground">
                          {query.frequency} executions
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {query.duration}ms
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cache Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Cache Performance
            </CardTitle>
            <CardDescription>
              Application cache performance and memory usage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Hit Rate</span>
                    <span>{metrics.cacheMetrics.hitRate}%</span>
                  </div>
                  <Progress value={metrics.cacheMetrics.hitRate} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Memory Usage</span>
                    <span>{metrics.cacheMetrics.memoryUsage}MB</span>
                  </div>
                  <Progress value={(metrics.cacheMetrics.memoryUsage / 256) * 100} className="h-2" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Total Keys:</span>
                  <span className="ml-2 font-medium">{metrics.cacheMetrics.totalKeys.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Eviction Rate:</span>
                  <span className="ml-2 font-medium">{metrics.cacheMetrics.evictionRate}%</span>
                </div>
              </div>

              <Button variant="outline" size="sm" onClick={clearCache} className="w-full">
                Clear Cache
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Optimization Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Optimization Recommendations
          </CardTitle>
          <CardDescription>
            Actionable recommendations to improve system performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metrics.recommendations.map((recommendation, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge className={getPriorityColor(recommendation.priority)}>
                      {recommendation.priority}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {recommendation.type}
                    </Badge>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Cost: {recommendation.implementationCost}
                  </Badge>
                </div>
                <h4 className="font-medium mb-1">{recommendation.description}</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Expected improvement: {recommendation.expectedImprovement}
                </p>
                <Button variant="outline" size="sm">
                  Implement
                </Button>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t">
            <Button onClick={optimizeQueries} className="w-full">
              <TrendingUp className="h-4 w-4 mr-2" />
              Run Automatic Optimization
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Database Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Database Health
          </CardTitle>
          <CardDescription>
            Database connection and performance status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold mb-1">
                {metrics.databaseMetrics.activeConnections}
              </div>
              <div className="text-sm text-muted-foreground">Active Connections</div>
              <Progress 
                value={(metrics.databaseMetrics.activeConnections / metrics.databaseMetrics.connectionPoolSize) * 100} 
                className="h-2 mt-2" 
              />
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold mb-1">
                {metrics.databaseMetrics.queryQueueLength}
              </div>
              <div className="text-sm text-muted-foreground">Query Queue Length</div>
              <div className="mt-2">
                {metrics.databaseMetrics.queryQueueLength === 0 ? (
                  <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-yellow-500 mx-auto" />
                )}
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold mb-1">
                {metrics.databaseMetrics.indexEfficiency}%
              </div>
              <div className="text-sm text-muted-foreground">Index Efficiency</div>
              <Progress value={metrics.databaseMetrics.indexEfficiency} className="h-2 mt-2" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
