load("//:tools/defaults.bzl", "setup_ts_build")
load("//:tools/pkg.bzl", "typedorm_package")

setup_ts_build(
    name = "library",
    visibility = [
        "//examples:__subpackages__",
        "//packages:__subpackages__",
    ],
    deps = [
        "@npm//@types/debug",
        "@npm//@types/uuid",
        "@npm//chalk",
        "@npm//class-transformer",
        "@npm//debug",
        "@npm//reflect-metadata",
        "@npm//uuid",
    ],
)

typedorm_package(
    name = "common",
    package_name = "@typedorm/common",
    readme_md = "README.md",
    deps = [
        ":library",
    ],
)
