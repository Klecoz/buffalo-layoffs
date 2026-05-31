// Label aliases for WARN PDF fields. The form wording has drifted over the
// years, so each logical field maps to an ordered list of labels — the FIRST
// matching label on a "Label: value" line wins. Matching is case-insensitive and
// requires the label to be immediately followed by a colon, so e.g. the label
// "Total Number of Employees" does NOT accidentally match the longer line
// "Total Number of Employees at Site: 322".

export const FIELD_LABELS = {
  company: ["Company", "Company Name"],
  reason: ["Reason For Layoff", "Reason For Closure", "Reason for Dislocation", "Reason"],
  numberAffected: [
    "Total Number of Affected Workers",
    "Number of Affected Employees at Site",
    "Number of Affected Workers",
    "Number Affected",
  ],
  totalEmployees: ["Total Number of Employees", "Total Number of Employees at Site"],
  layoffDate: [
    "Layoff Start Date",
    "Closure Start Date",
    "Date of First Separation",
    "Layoff Date",
  ],
  layoffEndDate: ["Closure End Date", "Layoff End Date", "Closing Date", "Closure Date"],
  noticeDate: ["Date of Notice", "Notice Date", "Notice Dated"],
  region: ["Region"],
  county: ["County"],
  industry: ["Industry Type", "Industry"],
} as const;

export type FieldKey = keyof typeof FIELD_LABELS;
