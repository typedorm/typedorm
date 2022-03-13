load("//:tools/defaults.bzl", "setup_ts_build")

exports_files(
    ["rollup.config.js"],
    visibility = ["//examples:__subpackages__"]
)

setup_ts_build(
    name = "library",
    module_name = "@typedorm-example/shared-base",
    deps = [
        "//packages/common:library",
        "//packages/core:library",
        "@npm//rollup-plugin-commonjs",        
        "@npm//rollup-plugin-node-resolve",
        "@npm//@rollup/plugin-json",
        "@npm//reflect-metadata"
    ],
    visibility = ["//examples:__subpackages__"]

)