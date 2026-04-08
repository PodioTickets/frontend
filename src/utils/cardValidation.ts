// Validação de cartão de crédito conforme documentação

export const validateCardNumber = (cardNumber: string): boolean => {
  const digits = cardNumber.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;
  
  let sum = 0;
  let isEven = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i]);

    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
};

export const getCardBrand = (cardNumber: string): string => {
  const number = cardNumber.replace(/\D/g, '');
  
  if (/^4/.test(number)) return 'VISA';
  if (/^5[1-5]/.test(number)) return 'MASTERCARD';
  if (/^3[47]/.test(number)) return 'AMEX';
  if (/^6(?:011|5)/.test(number)) return 'DISCOVER';
  
  return 'UNKNOWN';
};

export const validateExpiry = (expiry: string): boolean => {
  const normalized = expiry.replace(/\s/g, "");
  const [monthStr, yearStr] = normalized.split("/");
  if (!monthStr || !yearStr) return false;

  const expiryMonth = parseInt(monthStr, 10);
  const yearDigits = yearStr.replace(/\D/g, "");
  if (!Number.isFinite(expiryMonth) || yearDigits.length < 2) return false;

  const expiryYear =
    yearDigits.length >= 4
      ? parseInt(yearDigits.slice(0, 4), 10)
      : 2000 + parseInt(yearDigits.slice(-2), 10);

  if (expiryMonth < 1 || expiryMonth > 12 || !Number.isFinite(expiryYear)) {
    return false;
  }

  // Válido até o fim do mês de expiração (não só o dia 1).
  const endOfExpiryMonth = new Date(
    expiryYear,
    expiryMonth,
    0,
    23,
    59,
    59,
    999,
  );
  return endOfExpiryMonth.getTime() >= Date.now();
};

export const validateCVV = (cvv: string): boolean => {
  const digits = cvv.replace(/\D/g, '');
  return digits.length === 3 || digits.length === 4;
};
