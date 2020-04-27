module.exports = {
  include: ["assembly/__tests__/**/*.performance.ts"],
  flags: {
    "--runtime": ["full"],
    "--use": ["IS_WASI=0"],
    "--optimizeLevel": "2",
    "--shrinkLevel": "0",
    "--runPasses": ["flatten", "simplify-globals-optimizing","local-cse","simplify-locals-notee-nostructure","licm","vacuum"],
  },

  disclude: [/node_modules/],
  outputBinary: false,
};
