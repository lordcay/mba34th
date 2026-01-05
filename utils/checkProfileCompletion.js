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
