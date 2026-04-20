module.exports = function(api) {
    api.cache(true);
    return {
      presets: ['babel-preset-expo'],
    };
  };
  

// module.exports = function (api) {
//   api.cache(true);
//   return {
//     presets: ['babel-preset-expo'],
//     plugins: [
//       // other plugins (if any) go here…
//       'react-native-worklets/plugin', // MUST be last
//     ],
//   };
// };
