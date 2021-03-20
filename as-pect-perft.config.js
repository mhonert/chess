module.exports = {
  include: ["assembly/__tests__/**/*.performance.ts"],
  flags: {
    "--runtime": ["incremental"],
    "--use": ["IS_WASI=0","ASC_RTRACE=1"],
    "--optimizeLevel": "2",
    "--shrinkLevel": "0",
    "--converge": [],
  },
  disclude: [/node_modules/],
  outputBinary: false,
};
