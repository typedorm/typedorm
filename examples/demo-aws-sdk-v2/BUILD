load("//:tools/defaults.bzl", "setup_ts_build")
load("@npm//@bazel/rollup:index.bzl", "rollup_bundle")

setup_ts_build(
    name = "library",
    module_name = "demo-aws-sdk-v2",
    deps = [
        "//packages/core:library",
        "//packages/document-client:library",
        "//examples/shared-base:library",
        "@npm//aws-sdk"
    ],
    visibility = ["//examples:__subpackages__"]
)

rollup_bundle(
    name = "bundle",
    srcs = ["package.json"],
    config_file = "//examples/shared-base:rollup.config.js",
    entry_point = ":index.ts",
    format = "cjs",
    deps = [
        ":library",
    ],
)