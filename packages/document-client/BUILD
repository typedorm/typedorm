load("//:tools/defaults.bzl", "setup_ts_build")
load("//:tools/pkg.bzl", "typedorm_package")

setup_ts_build(
    name = "library",
    module_name = "@typedorm/document-client",
    visibility = [
        "//examples:__subpackages__",
        "//packages:__subpackages__",
    ],
    deps = [
        "@npm//@aws-sdk/client-dynamodb",
        "@npm//@aws-sdk/lib-dynamodb",
        "@npm//@types/jest",
        "@npm//aws-sdk",
    ],
)

typedorm_package(
    name = "document-client",
    readme_md = "README.md",
    deps = [
        ":library",
    ],
)
