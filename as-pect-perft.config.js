module.exports = {
  include: ["assembly/__tests__/**/*.performance.ts"],
  add: ["assembly/__tests__/**/*.include.ts"],
  flags: {
    "--runtime": ["full"],
    "--optimizeLevel": "3",
    "--shrinkLevel": "0",
  },
  disclude: [/node_modules/],
  outputBinary: false,
};
