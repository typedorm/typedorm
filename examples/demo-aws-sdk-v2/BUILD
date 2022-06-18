package(default_visibility = ['//visibility:public'])

load("//:tools/defaults.bzl", "setup_ts_build")
load("@npm//@bazel/rollup:index.bzl", "rollup_bundle")

setup_ts_build(
    name = "library",
    visibility = ["//examples:__subpackages__"],
    tsconfig = "//:tsconfig.json",
    deps = [
        "//examples/shared-base:library",
        "//packages/core:library",
        "//packages/document-client:library",
        "@npm//aws-sdk",
    ],
)

rollup_bundle(
    name = "bundle",
    srcs = ["package.json"],
    config_file = "//examples/shared-base:rollup.config.js",
    entry_point = ":index.ts",
    output_dir = True,
    deps = [
        ":library",
        "@npm//reflect-metadata",
        "@npm//@rollup/plugin-json",
        "@npm//@rollup/plugin-commonjs",
        "@npm//@rollup/plugin-node-resolve",        
    ],
)
