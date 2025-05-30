/**
 * Swagger Examples for Analytics API
 *
 * Provides comprehensive examples for all analytics endpoints
 * to improve API documentation and developer experience.
 */

export const SwaggerExamples = {
  // ============================================================================
  // REVENUE ANALYTICS EXAMPLES
  // ============================================================================

  revenueForecast: {
    summary: 'Revenue forecast for next 6 months',
    value: {
      data: [
        {
          period: '2024-07',
          predictedValue: 125000.5,
          confidenceInterval: {
            lower: 106250.43,
            upper: 143750.58,
          },
          confidence: 0.85,
          factors: [
            {
              factor: 'Historical Average',
              impact: 0.7,
              description: 'Based on 12-month historical revenue patterns',
            },
            {
              factor: 'Seasonal Adjustment',
              impact: 0.1,
              description: 'Dry season seasonal pattern adjustment',
            },
          ],
        },
        {
          period: '2024-08',
          predictedValue: 132000.75,
          confidenceInterval: {
            lower: 112200.64,
            upper: 151800.86,
          },
          confidence: 0.82,
          factors: [
            {
              factor: 'Historical Average',
              impact: 0.7,
              description: 'Based on 12-month historical revenue patterns',
            },
            {
              factor: 'Growth Trend',
              impact: 0.05,
              description: 'Positive growth trend detected',
            },
          ],
        },
      ],
      metadata: {
        organizationId: 'org-123',
        dateRange: {
          startDate: '2024-01-01',
          endDate: '2024-06-30',
        },
        generatedAt: '2024-07-01T10:30:00Z',
        cacheKey: 'analytics:org-123:REVENUE_FORECAST:2024-01-01_2024-06-30',
      },
      insights: [
        {
          id: 'insight-1',
          type: 'REVENUE_FORECAST',
          title: 'Positive revenue growth expected',
          description:
            'Revenue is forecasted to grow by 8% over the next 6 months',
          priority: 'MEDIUM',
          actionable: true,
          recommendations: [
            'Prepare for increased demand by optimizing inventory',
            'Consider expanding marketing efforts during peak periods',
          ],
        },
      ],
    },
  },

  revenueTrends: {
    summary: 'Revenue trends analysis',
    value: {
      data: {
        trends: [
          {
            period: '2024-01',
            revenue: 98500.0,
            invoiceCount: 45,
            averageInvoiceValue: 2188.89,
          },
          {
            period: '2024-02',
            revenue: 105200.5,
            invoiceCount: 52,
            averageInvoiceValue: 2023.09,
          },
          {
            period: '2024-03',
            revenue: 112750.25,
            invoiceCount: 48,
            averageInvoiceValue: 2349.0,
          },
        ],
        summary: {
          totalRevenue: 316450.75,
          averageMonthlyRevenue: 105483.58,
          growthRate: 14.5,
          seasonalPattern: 'MODERATE_SEASONALITY',
        },
      },
      metadata: {
        organizationId: 'org-123',
        dateRange: {
          startDate: '2024-01-01',
          endDate: '2024-03-31',
        },
        generatedAt: '2024-04-01T09:15:00Z',
      },
    },
  },

  // ============================================================================
  // EXPENSE ANALYTICS EXAMPLES
  // ============================================================================

  expenseTrends: {
    summary: 'Expense trends with anomaly detection',
    value: {
      data: {
        trends: [
          {
            period: '2024-01',
            totalExpenses: 75200.0,
            expenseCount: 128,
            averageExpenseAmount: 587.5,
            taxDeductibleExpenses: 52640.0,
            taxDeductiblePercentage: 70.0,
          },
          {
            period: '2024-02',
            totalExpenses: 82150.5,
            expenseCount: 142,
            averageExpenseAmount: 578.52,
            taxDeductibleExpenses: 57505.35,
            taxDeductiblePercentage: 70.0,
          },
        ],
        summary: {
          totalExpenses: 157350.5,
          averageMonthlyExpenses: 78675.25,
          growthRate: 9.2,
          seasonalPattern: 'LOW_SEASONALITY',
          totalTaxDeductible: 110145.35,
        },
        insights: [
          {
            type: 'INFO',
            title: 'Expense growth within normal range',
            description:
              'Monthly expense growth of 9.2% is within expected parameters',
            recommendation:
              'Continue monitoring expense categories for optimization opportunities',
          },
        ],
      },
    },
  },

  expenseAnomalies: {
    summary: 'Detected expense anomalies',
    value: {
      data: {
        anomalies: [
          {
            expenseId: 'exp-456',
            description: 'Office equipment purchase',
            amount: 15000.0,
            expectedAmount: 3500.0,
            variance: 11500.0,
            anomalyScore: 3.2,
            category: 'Equipment',
            date: '2024-03-15T00:00:00Z',
            reason:
              'Extreme outlier - amount significantly above normal pattern',
          },
          {
            expenseId: 'exp-789',
            description: 'Utility bill - electricity',
            amount: 2800.0,
            expectedAmount: 1200.0,
            variance: 1600.0,
            anomalyScore: 2.1,
            category: 'Utilities',
            date: '2024-03-20T00:00:00Z',
            reason: 'Significant deviation from normal pattern',
          },
        ],
        summary: {
          totalAnomalies: 2,
          totalAnomalyAmount: 13100.0,
          highSeverityCount: 1,
          mediumSeverityCount: 1,
        },
      },
    },
  },

  // ============================================================================
  // PROFITABILITY ANALYTICS EXAMPLES
  // ============================================================================

  customerProfitability: {
    summary: 'Customer profitability analysis',
    value: {
      data: {
        customers: [
          {
            customerId: 'cust-001',
            customerName: 'ABC Trading Ltd',
            revenue: 150000.0,
            directCosts: 105000.0,
            allocatedCosts: 15000.0,
            grossProfit: 45000.0,
            netProfit: 30000.0,
            profitMargin: 20.0,
            ranking: 1,
            riskLevel: 'LOW',
          },
          {
            customerId: 'cust-002',
            customerName: 'XYZ Services',
            revenue: 85000.0,
            directCosts: 59500.0,
            allocatedCosts: 8500.0,
            grossProfit: 25500.0,
            netProfit: 17000.0,
            profitMargin: 20.0,
            ranking: 2,
            riskLevel: 'LOW',
          },
        ],
        summary: {
          totalCustomers: 2,
          totalRevenue: 235000.0,
          totalNetProfit: 47000.0,
          averageProfitMargin: 20.0,
          top10Revenue: 235000.0,
          profitableCustomers: 2,
          unprofitableCustomers: 0,
        },
      },
    },
  },

  // ============================================================================
  // TAX ANALYTICS EXAMPLES
  // ============================================================================

  taxOptimization: {
    summary: 'Tax optimization recommendations',
    value: {
      data: {
        currentLiability: 25000.0,
        optimizedLiability: 22000.0,
        potentialSavings: 3000.0,
        strategies: [
          {
            strategy: 'VAT Input Credit Optimization',
            description: 'Ensure all eligible VAT input credits are claimed',
            potentialSaving: 1250.0,
            implementationComplexity: 'LOW',
            riskLevel: 'LOW',
            deadline: '2024-08-18T00:00:00Z',
          },
          {
            strategy: 'Expense Deduction Maximization',
            description:
              'Review and maximize allowable business expense deductions',
            potentialSaving: 1750.0,
            implementationComplexity: 'MEDIUM',
            riskLevel: 'LOW',
          },
        ],
        riskLevel: 'LOW',
        complianceScore: 95,
      },
    },
  },

  taxCompliance: {
    summary: 'Tax compliance score and assessment',
    value: {
      data: {
        score: 85,
        rating: 'GOOD',
        issues: ['One overdue VAT filing'],
        recommendations: [
          'Complete overdue VAT filing immediately',
          'Set up automated reminders for tax deadlines',
        ],
        breakdown: {
          filingCompliance: 80,
          paymentCompliance: 100,
          penaltyAvoidance: 100,
        },
      },
    },
  },

  // ============================================================================
  // FINANCIAL RATIOS EXAMPLES
  // ============================================================================

  financialRatios: {
    summary: 'Comprehensive financial ratios',
    value: {
      data: {
        liquidity: {
          currentRatio: 1.85,
          quickRatio: 1.42,
          cashRatio: 0.35,
          workingCapital: 125000.0,
        },
        profitability: {
          grossMargin: 32.5,
          netMargin: 12.8,
          operatingMargin: 15.2,
          returnOnAssets: 8.5,
          returnOnEquity: 15.2,
        },
        efficiency: {
          inventoryTurnover: 6.2,
          receivablesTurnover: 8.5,
          payablesTurnover: 12.3,
          assetTurnover: 0.67,
          daysSalesOutstanding: 43,
        },
        leverage: {
          debtToEquity: 0.42,
          debtToAssets: 0.28,
          equityRatio: 0.72,
          debtServiceCoverage: 2.8,
        },
        industryComparison: {
          industry: 'Zambian SME Average',
          percentileRanking: 75,
          comparison: 'ABOVE_AVERAGE',
        },
        period: {
          startDate: '2024-01-01',
          endDate: '2024-06-30',
        },
        calculatedAt: '2024-07-01T14:20:00Z',
      },
    },
  },

  // ============================================================================
  // ERROR EXAMPLES
  // ============================================================================

  insufficientDataError: {
    summary: 'Insufficient data error',
    value: {
      message:
        'Insufficient data for reliable analytics: Insufficient invoices (3/5), Period too short (15/30 days)',
      code: 'INSUFFICIENT_DATA',
      suggestions: [
        'Create more invoices to improve forecast accuracy',
        'Use a longer period for more reliable analytics',
      ],
      details: {
        issues: [
          'Insufficient invoices (3/5)',
          'Period too short (15/30 days)',
        ],
        recommendations: [
          'Create more invoices to improve forecast accuracy',
          'Use a longer period for more reliable analytics',
        ],
      },
    },
  },

  validationError: {
    summary: 'Request validation error',
    value: {
      message: 'Invalid date format. Use YYYY-MM-DD format.',
      code: 'VALIDATION_ERROR',
      suggestions: [
        'Ensure dates are in YYYY-MM-DD format',
        'Check that start date is before end date',
      ],
    },
  },
};

/**
 * Common response schemas for Swagger documentation
 */
export const SwaggerSchemas = {
  AnalyticsResponse: {
    type: 'object',
    properties: {
      data: {
        type: 'object',
        description: 'Analytics data specific to the endpoint',
      },
      metadata: {
        type: 'object',
        properties: {
          organizationId: { type: 'string' },
          dateRange: {
            type: 'object',
            properties: {
              startDate: { type: 'string', format: 'date' },
              endDate: { type: 'string', format: 'date' },
            },
          },
          generatedAt: { type: 'string', format: 'date-time' },
          cacheKey: { type: 'string' },
          expiresAt: { type: 'string', format: 'date-time' },
        },
      },
      insights: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            type: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            priority: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'] },
            actionable: { type: 'boolean' },
            recommendations: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
      },
    },
  },

  AnalyticsError: {
    type: 'object',
    properties: {
      message: { type: 'string' },
      code: { type: 'string' },
      suggestions: {
        type: 'array',
        items: { type: 'string' },
      },
      details: { type: 'object' },
    },
  },
};
