load("//:tools/defaults.bzl", "setup_ts_build")
load("//:tools/pkg.bzl", "typedorm_package")

setup_ts_build(
    name = "library",
    module_name = "@typedorm/document-client",
    deps = [
        "@npm//@aws-sdk/lib-dynamodb",
        "@npm//@aws-sdk/client-dynamodb",
        "@npm//aws-sdk",
        "@npm//@types/jest"
    ],
    visibility = ["//packages:__subpackages__", "//examples:__subpackages__"]

)

typedorm_package(
    name = "document-client",
    readme_md = "README.md",
    deps = [
        ":library"
    ]
)