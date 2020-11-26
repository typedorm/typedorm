load("//:tools/defaults.bzl", "setup_ts_build")
load("//:tools/pkg.bzl", "typedorm_package")

setup_ts_build(
    name = "library",
    module_name = "@typedorm/testing",
    deps = [
        "//packages/core:library"
    ],
    visibility = ["//packages:__subpackages__"]

)

typedorm_package(
    name = "testing",
    readme_md = "README.md",
    deps = [
        ":library"
    ]
)