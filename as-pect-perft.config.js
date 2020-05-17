module.exports = {
  include: ["assembly/__tests__/**/*.performance.ts"],
  flags: {
    "--runtime": ["half"],
    "--use": ["IS_WASI=0"],
    "--optimizeLevel": "2",
    "--shrinkLevel": "0",
    "--converge": [],
  },

  disclude: [/node_modules/],
  outputBinary: false,
};
