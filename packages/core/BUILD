load("//:tools/defaults.bzl", "setup_ts_build")
load("//:tools/pkg.bzl", "typedorm_package")

setup_ts_build(
    name = "library",
    module_name = "@typedorm/core",
    deps = [
        "//packages/common:library",
        "@npm//aws-sdk",
        "@npm//uuid",
        "@npm//ksuid",
        "@npm//fast-glob",
        "@npm//@types/uuid"
    ],
    visibility = ["//packages:__subpackages__"]

)

typedorm_package(
    name = "core",
    readme_md = "README.md",
    deps = [
        ":library"
    ]
)