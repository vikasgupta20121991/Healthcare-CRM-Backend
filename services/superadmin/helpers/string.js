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

module.exports = {
  isEmpty,
  hashPassword
};
