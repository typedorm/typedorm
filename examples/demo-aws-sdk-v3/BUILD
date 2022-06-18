load("//:tools/defaults.bzl", "setup_ts_build")
load("@npm//@bazel/rollup:index.bzl", "rollup_bundle")

setup_ts_build(
    name = "library",
    visibility = ["//examples:__subpackages__"],
    deps = [
        "//examples/shared-base:library",
        "//packages/core:library",
        "//packages/document-client:library",
        "@npm//@aws-sdk/client-dynamodb",
        "@npm//@aws-sdk/lib-dynamodb",
    ],
)

rollup_bundle(
    name = "bundle",
    srcs = [],
    config_file = "//examples/shared-base:rollup.config.js",
    entry_point = ":index.ts",
    format = "cjs",
    deps = [":library"],
)
