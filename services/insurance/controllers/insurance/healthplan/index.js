import { InsuranceCategory } from "./category";
import { InsuranceExclusion } from "./exclusion";
import { InsurancePlan } from "./plan";

module.exports = {
  category: new InsuranceCategory(),
  exclusion: new InsuranceExclusion(),
  plan: new InsurancePlan(),
};
