// utils/checkProfileCompletion.js

export const checkProfileCompletion = (user) => {
    if (!user) return false;

    const requiredFields = ['origin', 'bio', 'photos', 'interests', 'fieldOfStudy', 'graduationYear', 'currentRole', 'industry', 'linkedIn'];

    for (const field of requiredFields) {
        if (!user[field] || (Array.isArray(user[field]) && user[field].length === 0)) {
            return false;
        }
    }

    return true;
};
