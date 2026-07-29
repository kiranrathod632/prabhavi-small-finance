import PDFDocument from 'pdfkit';

/**
 * Generate EMI receipt PDF
 */
export const generateEMIReceipt = (payment, emi, loan, user) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.fontSize(20).text('EMI Payment Receipt', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`Receipt No: ${payment.receiptNumber}`, { align: 'right' });
    doc.text(`Date: ${new Date(payment.createdAt).toLocaleDateString('en-IN')}`, { align: 'right' });
    doc.moveDown();

    // Company info
    doc.fontSize(12).text(process.env.COMPANY_NAME || 'Finance Loan Management', { align: 'center' });
    doc.moveDown(2);

    // Customer details
    doc.fontSize(11).text('Customer Details', { underline: true });
    doc.fontSize(10);
    doc.text(`Name: ${user.name}`);
    doc.text(`Email: ${user.email}`);
    doc.moveDown();

    // Loan details
    doc.fontSize(11).text('Loan Details', { underline: true });
    doc.fontSize(10);
    doc.text(`Loan ID: ${loan.loanId}`);
    doc.text(`Loan Type: ${loan.loanType}`);
    doc.moveDown();

    // Payment details
    doc.fontSize(11).text('Payment Details', { underline: true });
    doc.fontSize(10);
    doc.text(`Payment ID: ${payment.paymentId}`);
    doc.text(`EMI Number: ${emi.emiNumber}`);
    doc.text(`EMI Amount: ₹${emi.amount.toLocaleString('en-IN')}`);
    if (emi.penalty > 0) doc.text(`Penalty: ₹${emi.penalty.toLocaleString('en-IN')}`);
    doc.text(`Total Paid: ₹${payment.amount.toLocaleString('en-IN')}`);
    doc.text(`Payment Method: ${payment.method}`);
    doc.text(`Status: ${payment.status.toUpperCase()}`);
    doc.moveDown(2);

    doc.fontSize(9).text('This is a computer-generated receipt.', { align: 'center' });
    doc.end();
  });
};

/**
 * Generate transaction statement PDF
 */
export const generateTransactionStatement = (transactions, user, dateRange) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(18).text('Transaction Statement', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10);
    doc.text(`Account: ${user.name} (${user.email})`);
    if (dateRange) {
      doc.text(`Period: ${dateRange.from} to ${dateRange.to}`);
    }
    doc.moveDown();

    // Table header
    doc.fontSize(9);
    const startY = doc.y;
    doc.text('Date', 50, startY);
    doc.text('ID', 120, startY);
    doc.text('Type', 200, startY);
    doc.text('Amount', 300, startY);
    doc.text('Status', 400, startY);
    doc.moveDown();

    let totalCredit = 0;
    let totalDebit = 0;

    transactions.forEach((txn) => {
      const y = doc.y;
      doc.text(new Date(txn.createdAt).toLocaleDateString('en-IN'), 50, y);
      doc.text(txn.transactionId, 120, y);
      doc.text(txn.type, 200, y);
      doc.text(`₹${txn.amount.toLocaleString('en-IN')}`, 300, y);
      doc.text(txn.status, 400, y);
      doc.moveDown(0.5);

      if (['credit', 'loan_disbursement', 'refund'].includes(txn.type)) {
        totalCredit += txn.amount;
      } else {
        totalDebit += txn.amount;
      }
    });

    doc.moveDown();
    doc.text(`Total Credit: ₹${totalCredit.toLocaleString('en-IN')}`);
    doc.text(`Total Debit: ₹${totalDebit.toLocaleString('en-IN')}`);
    doc.text(`Net: ₹${(totalCredit - totalDebit).toLocaleString('en-IN')}`);

    doc.end();
  });
};

/**
 * Generate loan statement PDF
 */
export const generateLoanStatement = (loan, emis, user) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(18).text('Loan Statement', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10);
    doc.text(`Borrower: ${user.name}`);
    doc.text(`Loan ID: ${loan.loanId}`);
    doc.text(`Type: ${loan.loanType}`);
    doc.text(`Amount: ₹${loan.amount.toLocaleString('en-IN')}`);
    doc.text(`Interest Rate: ${loan.interestRate}%`);
    doc.text(`Tenure: ${loan.tenure} months`);
    doc.text(`EMI: ₹${loan.emiAmount.toLocaleString('en-IN')}`);
    doc.text(`Status: ${loan.status}`);
    doc.text(`Paid: ${loan.paidEmis}/${loan.totalEmis} EMIs`);
    doc.text(`Remaining: ₹${loan.remainingBalance.toLocaleString('en-IN')}`);
    doc.moveDown();

    doc.fontSize(11).text('EMI Schedule', { underline: true });
    doc.moveDown(0.5);

    emis.forEach((emi) => {
      doc.fontSize(9).text(
        `EMI #${emi.emiNumber} | Due: ${new Date(emi.dueDate).toLocaleDateString('en-IN')} | ` +
        `₹${emi.amount.toLocaleString('en-IN')} | ${emi.status.toUpperCase()}`
      );
    });

    doc.end();
  });
};
