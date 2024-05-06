const bcrypt = require("bcrypt");

function isEmpty(value) {
  return (
    value == "" ||
    value == null ||
    value == undefined ||
    value.toString().replace(/\s/g, "") == ""
  );
}

async function hashPassword(plaintextPassword) {
  const hash = await bcrypt.hash(plaintextPassword, 10);
  return hash;
}

// compare password
async function comparePassword(plaintextPassword, hash) {
  const result = await bcrypt.compare(plaintextPassword, hash);
  return result;
}

function formatString(string) {
  const regexPattern = /\s+/g;
  const newString = string.replace(regexPattern, " ");
  return newString;
}

module.exports = {
  isEmpty,
  hashPassword,
  comparePassword,
  formatString
};
