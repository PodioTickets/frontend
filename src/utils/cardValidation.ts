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
  const [month, year] = expiry.split('/');
  if (!month || !year) return false;
  
  const expiryMonth = parseInt(month);
  const expiryYear = 2000 + parseInt(year);
  
  if (expiryMonth < 1 || expiryMonth > 12) return false;
  
  const expiryDate = new Date(expiryYear, expiryMonth - 1);
  const now = new Date();
  
  return expiryDate > now;
};

export const validateCVV = (cvv: string): boolean => {
  const digits = cvv.replace(/\D/g, '');
  return digits.length === 3 || digits.length === 4;
};
