load("//:tools/defaults.bzl", "setup_ts_build")

exports_files(
    ["rollup.config.js"],
    visibility = ["//examples:__subpackages__"],
)

setup_ts_build(
    name = "library",
    visibility = ["//examples:__subpackages__"],
    tsconfig = "//:tsconfig.json",
    deps = [
        "//packages/common:library",
        "//packages/core:library",
        "@npm//reflect-metadata"
    ],
)
