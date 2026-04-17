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

export const checkProfileCompletion = (user) => {
  if (!user) return false;

  const hasText = (v) => typeof v === 'string' && v.trim().length > 0;
  const hasArray = (v) => Array.isArray(v) && v.length > 0;

  // Accept multiple DOB keys
  const dob = user.DOB || user.dob || user.dateOfBirth;

  return (
    hasText(user.email) &&
    hasText(user.origin) &&
    hasText(user.fieldOfStudy) &&
    hasText(String(user.graduationYear || '')) &&
    hasText(user.currentRole) &&
    hasText(user.industry) &&
    hasText(user.bio) &&
    hasArray(user.interests) &&
    hasArray(user.photos)
  );
};

export const getProfileMissingFields = (user) => {
  if (!user) return [];

  const hasText = (v) => typeof v === 'string' && v.trim().length > 0;
  const hasArray = (v) => Array.isArray(v) && v.length > 0;

  const checks = [
    { field: 'Country of Origin', ok: hasText(user.origin) },
    { field: 'Field of Study', ok: hasText(user.fieldOfStudy) },
    { field: 'Graduation Year', ok: hasText(String(user.graduationYear || '')) },
    { field: 'Current / Previous Role', ok: hasText(user.currentRole) },
    { field: 'Industry', ok: hasText(user.industry) },
    { field: 'Bio', ok: hasText(user.bio) },
    { field: 'Interests', ok: hasArray(user.interests) },
    { field: 'Photos', ok: hasArray(user.photos) },
  ];

  return checks.filter((c) => !c.ok).map((c) => c.field);
};
