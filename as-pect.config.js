module.exports = {
  include: ["assembly/__tests__/**/*.spec.ts"],
  add: ["assembly/__tests__/**/*.include.ts"],
  flags: {
    "--runtime": ["incremental"], // Acceptable values are: incremental, minimal and stub
    "--use": ["IS_WASI=0","ASC_RTRACE=1"]
  },
  disclude: [/node_modules/],
  imports: {},
  outputBinary: false,
};
