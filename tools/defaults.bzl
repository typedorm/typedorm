
load("@npm//@bazel/typescript:index.bzl", "ts_library")

def setup_ts_build(name, deps = [], **kwargs):
    """ Sets up default build configuration to compile ts sources with npm hosted deps        
        @param name - name of the target (required)
        @param deps - list of internal targets that this build relies on
                    - external npm deps is already been taken care of
    """

    ts_library(
        name = name,
        srcs = native.glob(
            [
                "**/*.ts",
            ],
            exclude = ["**/*.test.ts", "**/*.spec.ts", "**/*.d.ts"],
        ),
        tsconfig = "//:tsconfig.json",
        deps = deps + [
            "@npm//@types/node",
        ],
        **kwargs
    )
