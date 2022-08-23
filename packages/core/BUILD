load("//:tools/defaults.bzl", "setup_ts_build")
load("//:tools/pkg.bzl", "typedorm_package")

setup_ts_build(
    name = "library",
    visibility = [
        "//packages:__subpackages__"
    ],
    tsconfig_cjs = "//:tsconfig_cjs",
    tsconfig_esm = "//:tsconfig_esm",
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
    package_name = "@typedorm/core",
    readme_md = "README.md",
    deps = [
        ":library",
    ],
)
