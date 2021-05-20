load("//:tools/defaults.bzl", "setup_ts_build")
load("//:tools/pkg.bzl", "typedorm_package")

setup_ts_build(
    name = "library",
    module_name = "@typedorm/common",
    deps = [
        "@npm//reflect-metadata",
        "@npm//uuid",
        "@npm//@types/uuid",
        "@npm//debug",
        "@npm//@types/debug",
        "@npm//chalk"
    ],
    visibility = ["//packages:__subpackages__"]
)

typedorm_package(
    name = "common",
    readme_md = "README.md",
    deps = [
        ":library"
    ]
)