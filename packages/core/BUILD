load("//:tools/defaults.bzl", "setup_ts_build")
load("//:tools/pkg.bzl", "typedorm_package")

setup_ts_build(
    name = "library",
    module_name = "@typedorm/core",
    visibility = [
        "//examples:__subpackages__",
        "//packages:__subpackages__",
    ],
    deps = [
        "//packages/common:library",
        "//packages/document-client:library",
        "@npm//@types/uuid",
        "@npm//aws-sdk",
        "@npm//class-transformer",
        "@npm//fast-glob",
        "@npm//ksuid",
        "@npm//p-limit",
        "@npm//uuid",
    ],
)

typedorm_package(
    name = "core",
    readme_md = "README.md",
    deps = [
        ":library",
    ],
)
