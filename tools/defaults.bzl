load("@npm//@bazel/typescript:index.bzl", "ts_project")

def setup_ts_build(name, visibility, tsconfig_cjs = "", tsconfig_esm = "", tsconfig = "", srcs = [], deps = [], **kwargs):
    """ Sets up default build configuration to compile ts sources with npm hosted deps        
        @param name - name of the target (required)
        @param deps - list of internal targets that this build relies on
                    - external npm deps is already been taken care of
    """

    filegroup_srcs = []
    filegroup_data = []

    if tsconfig_cjs != "":
        ts_project(
            name = name + "_cjs",
            visibility = visibility,
            srcs = srcs + native.glob(
                [
                    "**/*.ts",
                ],
                exclude = [
                    "**/*.test.ts",
                    "**/*.spec.ts",
                    "**/*.config.js",
                    "**/*.d.ts",
                    "**/__mocks__/*",
                ],
            ),
            out_dir = "cjs",
            declaration = True,
            tsconfig = tsconfig_cjs,
            deps = deps + [
                "@npm//@types/node",
            ],
            **kwargs
        )
        native.genrule(
            name = name + "_cjs" + "_package_json",
            srcs = [],
            outs = ["cjs/" + "package.json"],
            cmd = """
            echo '{\n\t\"type\": \"commonjs\"\n}' >> $(@D)/package.json
            """
        )
        filegroup_srcs.append(":" + name + "_cjs")
        filegroup_data.append(":" + name + "_cjs" + "_package_json")

    if tsconfig_esm != "":
        ts_project(
            name = name + "_esm",
            visibility = visibility,
            srcs = srcs + native.glob(
                [
                    "**/*.ts",
                ],
                exclude = [
                    "**/*.test.ts",
                    "**/*.spec.ts",
                    "**/*.config.js",
                    "**/*.d.ts",
                    "**/__mocks__/*",
                ],
            ),
            out_dir = "esm",
            declaration = True,
            tsconfig = tsconfig_esm,
            deps = deps + [
                "@npm//@types/node",
            ],
            **kwargs
        )
        native.genrule(
            name = name + "_esm" + "_package_json",
            srcs = [],
            outs = ["esm/" + "package.json"],
            cmd = """
            echo '{\n\t\"type\": \"module\"\n}' >> $(@D)/package.json
            """
        )
        filegroup_srcs.append(":" + name + "_esm")
        filegroup_data.append(":" + name + "_esm" + "_package_json")

    if tsconfig != "":
        ts_project(
            name = name + "_default",
            visibility = visibility,
            srcs = srcs + native.glob(
                [
                    "**/*.ts",
                ],
                exclude = [
                    "**/*.test.ts",
                    "**/*.spec.ts",
                    "**/*.config.js",
                    "**/*.d.ts",
                    "**/__mocks__/*",
                ],
            ),
            declaration = True,
            tsconfig = tsconfig,
            deps = deps + [
                "@npm//@types/node",
            ],
            **kwargs
        )
        filegroup_srcs.append(":" + name + "_default")

    ts_project(
            name = name,
            visibility = visibility,
            tsconfig = "//:tsconfig.json",
            srcs = native.glob(
                exclude = [
                    "**/*.test.ts",
                    "**/*.spec.ts",
                    "**/*.config.js",
                    "**/*.d.ts",
                    "**/__mocks__/*",
                ],
            ),            
            declaration = True,
            data = filegroup_data,
            deps = filegroup_srcs,
    )