/**
 * Marathi EMI reminder voice script.
 * Example: नमस्कार किरण, तुमचे २८ तारीखला रुपये २५० चा हफ्ता आहे. तो वेळेवर भरा, अन्यथा दंड बसेल.
 */
export const buildMarathiEmiCallScript = ({ name, amount, dueDate } = {}) => {
  const firstName =
    String(name || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)[0] || 'ग्राहक';

  const amt = Math.round(Number(amount) || 0); 
  const parsed = new Date(dueDate);
  const day = Number.isNaN(parsed.getTime()) ? String(dueDate || '') : String(parsed.getDate());

  return (
    `नमस्कार ${firstName}, ` +
    `तुमचे ${day} तारीखला रुपये ${amt} चा हफ्ता आहे. ` +
    `तो वेळेवर भरा, अन्यथा दंड बसेल.`
  );
};

export default { buildMarathiEmiCallScript };
