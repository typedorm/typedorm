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
        "@npm//@aws-sdk/client-dynamodb",
        "@npm//@aws-sdk/lib-dynamodb",
        "@npm//@types/jest",
        "@npm//aws-sdk",
    ],
)

typedorm_package(
    name = "document-client",
    package_name = "@typedorm/document-client",
    readme_md = "README.md",
    deps = [
        ":library",
    ],
)
