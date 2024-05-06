function isEmpty(value) {
  return (
    value == "" ||
    value == null ||
    value == undefined ||
    value.toString().replace(/\s/g, "") == ""
  );
}

function formatString(string) {
  const regexPattern = /\s+/g;
  const newString = string.replace(regexPattern, " ");
  return newString;
}

module.exports = {
  isEmpty,
  formatString
};
