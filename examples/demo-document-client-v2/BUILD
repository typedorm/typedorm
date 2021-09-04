load("//:tools/defaults.bzl", "setup_ts_build")
load("@npm//@bazel/rollup:index.bzl", "rollup_bundle")

setup_ts_build(
    name = "library",
    module_name = "demo-document-client-v2",
    deps = [
        "//packages/common:library",
        "//packages/core:library",
        "//packages/document-client:library",        
        "@npm//aws-sdk",
        "@npm//reflect-metadata",
        "@npm//rollup-plugin-commonjs",
        "@npm//rollup-plugin-node-resolve",
        "@npm//@rollup/plugin-json"        
    ],
    visibility = ["//packages:__subpackages__"]

)

rollup_bundle(
    name = "bundle",
    srcs = [],
    config_file = ":rollup.config.js",
    entry_point = ":index.ts",
    format = "cjs",
    deps = [":library"],
)