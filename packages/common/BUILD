load("//:tools/defaults.bzl", "setup_ts_build")
load("//:tools/pkg.bzl", "typedrm_package")

setup_ts_build(
    name = "library",
    module_name = "@typedrm/common",
    deps = [],
)

typedrm_package(
    name = "common",
    readme_md = "README.md",
    deps = [
        ":library"
    ]
)