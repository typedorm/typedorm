load("@build_bazel_rules_nodejs//:index.bzl", "pkg_npm")

def typedorm_package(name, package_name, readme_md, data = [], deps = [], **kwargs):
    """ Creates Publishable npm package with additional artifacts bundled together        
    """

    native.genrule(
        name = "license_copied",
        srcs = ["//:LICENSE"],
        outs = ["LICENSE"],
        cmd = "cp $< $@",
    )

    pkg_npm(
        name = name,
        package_name = package_name,
        srcs = [readme_md, "package.json"] + data,
        substitutions = {
            "TAG-PLACEHOLDER": "{BUILD_SCM_TAG}",
            "0.0.0-PLACEHOLDER": "{BUILD_SCM_VERSION}",
        },
        deps = [
            ":license_copied",
        ] + deps,
    )
