load("//:tools/defaults.bzl", "setup_ts_build")
load("//:tools/pkg.bzl", "typedorm_package")

setup_ts_build(
    name = "library",
    visibility = ["//packages:__subpackages__"],
    deps = [
        "//packages/common:library",
        "//packages/core:library",
        "@npm//@types/jest",
        "@npm//aws-sdk",
    ],
)

typedorm_package(
    name = "testing",
    package_name = "@typedorm/testing",
    readme_md = "README.md",
    deps = [
        ":library",
    ],
)
