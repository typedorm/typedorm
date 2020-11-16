
load("@build_bazel_rules_nodejs//:index.bzl", "pkg_npm")

def typedrm_package(name, readme_md, data = [], deps = [], **kwargs):
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
        srcs = [readme_md, "package.json"] + data ,
        substitutions = {
            "TAG-PLACEHOLDER": "{BUILD_SCM_TAG}"
        },
        replace_with_version = "0.0.0-PLACEHOLDER",
        deps = [
            ":license_copied",
        ] + deps,
    )