const fs = require('fs');
const path = require('path');

// List of files and their unused parameter fixes
const fixes = [
  // Reports page
  {
    file: 'src/app/dashboard/reports/page.tsx',
    replacements: [
      { from: 'Calendar,', to: '' },
      { from: 'Filter,', to: '' },
      { from: 'const availableReports =', to: 'const _availableReports =' },
      { from: '(report, index)', to: '(report, _index)' }
    ]
  },
  // Transactions sync page
  {
    file: 'src/app/dashboard/transactions/sync/page.tsx',
    replacements: [
      { from: 'setSelectedAccountId', to: '_setSelectedAccountId' }
    ]
  },
  // Approval Dashboard
  {
    file: 'src/components/approvals/ApprovalDashboard.tsx',
    replacements: [
      { from: 'Badge,', to: '' },
      { from: 'CheckCircle,', to: '' },
      { from: 'Filter,', to: '' },
      { from: 'Users,', to: '' },
      { from: 'Calendar,', to: '' },
      { from: 'DollarSign,', to: '' },
      { from: 'formatCurrency,', to: '' },
      { from: 'const userRole =', to: 'const _userRole =' },
      { from: 'pendingLoading,', to: '_pendingLoading,' },
      { from: 'statsLoading,', to: '_statsLoading,' },
      { from: 'getStatusBadgeProps,', to: '_getStatusBadgeProps,' },
      { from: 'getPriorityBadgeProps,', to: '_getPriorityBadgeProps,' },
      { from: 'getTimeUntilDue', to: '_getTimeUntilDue' }
    ]
  }
];

// Apply fixes
fixes.forEach(({ file, replacements }) => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    replacements.forEach(({ from, to }) => {
      content = content.replace(new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), to);
    });
    
    fs.writeFileSync(filePath, content);
    console.log(`Fixed ${file}`);
  } else {
    console.log(`File not found: ${file}`);
  }
});

console.log('Batch fixes applied!');
