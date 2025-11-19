module.exports = {
  presets: ['babel-preset-expo'],
  plugins: [
    [
      'module:react-native-dotenv',
      {
        moduleName: '@env',       // <- how you import them
        path: '.env',             // <- your env file
        safe: false,              // set true if you want .env.example checking
        allowUndefined: true,
      },
    ],
  ],
};
