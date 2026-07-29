import ExcelJS from 'exceljs';

/**
 * Export transactions to Excel buffer
 */
export const exportTransactionsExcel = async (transactions) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Transactions');

  sheet.columns = [
    { header: 'Transaction ID', key: 'transactionId', width: 18 },
    { header: 'Date', key: 'date', width: 15 },
    { header: 'User', key: 'user', width: 25 },
    { header: 'Type', key: 'type', width: 18 },
    { header: 'Amount', key: 'amount', width: 15 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Method', key: 'method', width: 15 },
    { header: 'Description', key: 'description', width: 30 },
  ];

  // Style header row
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2563EB' },
  };
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  transactions.forEach((txn) => {
    sheet.addRow({
      transactionId: txn.transactionId,
      date: new Date(txn.createdAt).toLocaleDateString('en-IN'),
      user: txn.user?.name || 'N/A',
      type: txn.type,
      amount: txn.amount,
      status: txn.status,
      method: txn.paymentMethod,
      description: txn.description,
    });
  });

  return await workbook.xlsx.writeBuffer();
};

/**
 * Export loans to Excel buffer
 */
export const exportLoansExcel = async (loans) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Loans');

  sheet.columns = [
    { header: 'Loan ID', key: 'loanId', width: 15 },
    { header: 'User', key: 'user', width: 25 },
    { header: 'Type', key: 'loanType', width: 15 },
    { header: 'Amount', key: 'amount', width: 15 },
    { header: 'Interest', key: 'interestRate', width: 10 },
    { header: 'Tenure', key: 'tenure', width: 10 },
    { header: 'EMI', key: 'emiAmount', width: 12 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Remaining', key: 'remainingBalance', width: 15 },
  ];

  sheet.getRow(1).font = { bold: true };

  loans.forEach((loan) => {
    sheet.addRow({
      loanId: loan.loanId,
      user: loan.user?.name || 'N/A',
      loanType: loan.loanType,
      amount: loan.amount,
      interestRate: `${loan.interestRate}%`,
      tenure: `${loan.tenure} months`,
      emiAmount: loan.emiAmount,
      status: loan.status,
      remainingBalance: loan.remainingBalance,
    });
  });

  return await workbook.xlsx.writeBuffer();
};

/**
 * Export users to Excel buffer
 */
export const exportUsersExcel = async (users) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Users');

  sheet.columns = [
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Role', key: 'role', width: 10 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Wallet', key: 'walletBalance', width: 15 },
    { header: 'Joined', key: 'createdAt', width: 15 },
  ];

  sheet.getRow(1).font = { bold: true };

  users.forEach((user) => {
    sheet.addRow({
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.isSuspended ? 'Suspended' : user.isActive ? 'Active' : 'Inactive',
      walletBalance: user.walletBalance,
      createdAt: new Date(user.createdAt).toLocaleDateString('en-IN'),
    });
  });

  return await workbook.xlsx.writeBuffer();
};
