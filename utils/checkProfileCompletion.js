// // utils/checkProfileCompletion.js

// export const checkProfileCompletion = (user) => {
//     if (!user) return false;

//     const requiredFields = ['origin', 'bio', 'photos', 'interests', 'fieldOfStudy', 'graduationYear', 'currentRole', 'industry', 'linkedIn'];

//     for (const field of requiredFields) {
//         if (!user[field] || (Array.isArray(user[field]) && user[field].length === 0)) {
//             return false;
//         }
//     }

//     return true;
// };


// utils/checkProfileCompletion.js

// Derives user category from account type.
// Alumni have school/degree set at admin-approval time; graduation year is optional.
// Regular users (Bachelors / Masters / PhD / MBA / Degree) must fill everything.
const isAlumniType = (user) =>
  (user?.type || '').toLowerCase() === 'alumni';

export const checkProfileCompletion = (user) => {
  if (!user) return false;

  const hasText = (v) => typeof v === 'string' && v.trim().length > 0;
  const hasArray = (v) => Array.isArray(v) && v.length > 0;
  const alumni = isAlumniType(user);

  const base =
    hasText(user.email) &&
    hasText(user.origin) &&
    hasText(user.currentRole) &&
    hasText(user.industry) &&
    hasText(user.bio) &&
    hasArray(user.interests) &&
    hasArray(user.photos);

  if (alumni) {
    // School and degree were set at admin approval — no graduationYear needed.
    return base;
  }

  // Regular / school-not-listed users must also provide field of study + graduation year.
  return (
    base &&
    hasText(user.fieldOfStudy) &&
    hasText(String(user.graduationYear || ''))
  );
};

export const getProfileMissingFields = (user) => {
  if (!user) return [];

  const hasText = (v) => typeof v === 'string' && v.trim().length > 0;
  const hasArray = (v) => Array.isArray(v) && v.length > 0;
  const alumni = isAlumniType(user);

  const checks = [
    { field: 'Country of Origin', ok: hasText(user.origin) },
    // Field of study and graduation year are only required for non-alumni
    ...(!alumni
      ? [
          { field: 'Field of Study', ok: hasText(user.fieldOfStudy) },
          { field: 'Graduation Year', ok: hasText(String(user.graduationYear || '')) },
        ]
      : []),
    { field: 'Current / Previous Role', ok: hasText(user.currentRole) },
    { field: 'Industry', ok: hasText(user.industry) },
    { field: 'Bio', ok: hasText(user.bio) },
    { field: 'Interests', ok: hasArray(user.interests) },
    { field: 'Photos', ok: hasArray(user.photos) },
  ];

  return checks.filter((c) => !c.ok).map((c) => c.field);
};

// Returns a 0–1 completion ratio based on the live form values passed in.
// Used by EditProfileScreen to animate a real-time progress bar.
export const getLiveCompletionProgress = (fields, userType) => {
  const hasText = (v) => typeof v === 'string' && v.trim().length > 0;
  const hasArray = (v) => Array.isArray(v) && v.length > 0;
  const alumni = (userType || '').toLowerCase() === 'alumni';

  const checks = [
    hasText(fields.origin),
    hasText(fields.currentRole),
    hasText(fields.industry),
    hasText(fields.bio),
    hasArray(fields.interests),
    hasArray(fields.photos),
    ...(!alumni
      ? [hasText(fields.fieldOfStudy), hasText(String(fields.graduationYear || ''))]
      : []),
  ];

  const done = checks.filter(Boolean).length;
  return checks.length > 0 ? done / checks.length : 1;
};
