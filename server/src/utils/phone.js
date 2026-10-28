const { parsePhoneNumberFromString } = require('libphonenumber-js');

const normalizePhoneNumber = (value) => {
  if (typeof value !== 'string' || !value.trim().startsWith('+')) return null;

  const parsed = parsePhoneNumberFromString(value.trim());
  if (!parsed?.isValid()) return null;
  return parsed.number;
};

module.exports = { normalizePhoneNumber };
