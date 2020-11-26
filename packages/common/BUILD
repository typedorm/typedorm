load("//:tools/defaults.bzl", "setup_ts_build")
load("//:tools/pkg.bzl", "typedorm_package")

setup_ts_build(
    name = "library",
    module_name = "@typedorm/common",
    deps = [],
)

typedorm_package(
    name = "common",
    readme_md = "README.md",
    deps = [
        ":library"
    ]
)