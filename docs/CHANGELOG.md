# [1.16.0-beta.5](https://github.com/typedorm/typedorm/compare/v1.16.0-beta.4...v1.16.0-beta.5) (2024-09-11)


### Bug Fixes

* **core:** scan manager scan limit should reset each invocation ([#374](https://github.com/typedorm/typedorm/issues/374)) ([fa904a6](https://github.com/typedorm/typedorm/commit/fa904a65342f3cb373d9118748c76df4644ebf8b))

# [1.16.0-beta.4](https://github.com/typedorm/typedorm/compare/v1.16.0-beta.3...v1.16.0-beta.4) (2024-09-11)


### Bug Fixes

* class transformer as peer dependency ([#371](https://github.com/typedorm/typedorm/issues/371)) ([98ff026](https://github.com/typedorm/typedorm/commit/98ff026dbacabdc569c78f98ab54e849c1d2a9d8))

# [1.16.0-beta.3](https://github.com/typedorm/typedorm/compare/v1.16.0-beta.2...v1.16.0-beta.3) (2023-09-19)


### Features

* **core:** support retrieval by connection name in getConnection ([#359](https://github.com/typedorm/typedorm/issues/359)) ([406b1d7](https://github.com/typedorm/typedorm/commit/406b1d7d350bb3f5ccd70ca789d168861815d5b5))

# [1.16.0-beta.2](https://github.com/typedorm/typedorm/compare/v1.16.0-beta.1...v1.16.0-beta.2) (2023-03-26)


### Features

* **document-client:** expose translateConfig options to DocumentClientV3 ([03f4343](https://github.com/typedorm/typedorm/commit/03f4343cf53abdee2d32b60563d13411f2b296ea))

# [1.16.0-beta.1](https://github.com/typedorm/typedorm/compare/v1.15.4-beta.1...v1.16.0-beta.1) (2023-03-08)


### Features

* add schemaVersionAttribute option to enable schema versioning ([7856e29](https://github.com/typedorm/typedorm/commit/7856e2937f5d8fcb826173379c2dad2d1d553f88))

## [1.15.4-beta.1](https://github.com/typedorm/typedorm/compare/v1.15.3...v1.15.4-beta.1) (2023-02-26)

### Bug Fixes

- reset changelog file ([d0c2e40](https://github.com/typedorm/typedorm/commit/d0c2e4084f0d183dcaa188d76e407b33cc4b49f4))

# [1.12.0](https://github.com/typedorm/typedorm/compare/v1.11.2...v1.12.0) (2021-04-30)

### Bug Fixes

- **core:** condition options to incude primary keys ([0d83345](https://github.com/typedorm/typedorm/commit/0d83345b061d728a8e90130323b3c459d100eff0))
- **core:** fix issues with attributes type inference ([15935b0](https://github.com/typedorm/typedorm/commit/15935b0bd70131bebc6936cb10168be62b4cfecc))
- **core:** improve deep nested options' type inferance ([68bb8c5](https://github.com/typedorm/typedorm/commit/68bb8c5f37f12ac091ff7ae35a8cdfae68f03a19))
- **core:** mixins not rolling over expression builder and parser ([b6403fe](https://github.com/typedorm/typedorm/commit/b6403fe298cc8791665508b0cdf45a3947b13a23))

### Features

- **common:** add new errors for read transaction ([96d5f78](https://github.com/typedorm/typedorm/commit/96d5f783b81460d0ff93e75f2979f4b07c58c413))
- **common:** add transaction exceptions and errors ([6dd5d18](https://github.com/typedorm/typedorm/commit/6dd5d182067650cfc4f7d7f14122a9b91272b18d))
- **core:** add document client transaction transformer ([fe0e21a](https://github.com/typedorm/typedorm/commit/fe0e21a60fdeff8755f5cd07e4217edbe74a4b7c))
- **core:** add projection expression parser ([c6c4024](https://github.com/typedorm/typedorm/commit/c6c4024d17dba14fb5ff184ff43c06a0f3f1b766))
- **core:** add suport for codnition based updates on transaction manager ([8f60b9d](https://github.com/typedorm/typedorm/commit/8f60b9d083b18f2f893cb631c02b8e7a110fcc71))
- **core:** add support for condition expression when using entity manager to perform updates ([66defb4](https://github.com/typedorm/typedorm/commit/66defb422018988c20040ba981481a3d634e9230))
- **core:** add support for condition options to transaction manager `put` ([5cbbefc](https://github.com/typedorm/typedorm/commit/5cbbefc8324a04b87a4a9b58f623b80fd20e2c21))
- **core:** add support for getting selected attributes using entity manager ([0dd5c36](https://github.com/typedorm/typedorm/commit/0dd5c369a90d45bb00bd09b84fc1f913da3bf201))
- **core:** add support for performing conditional deletes using entity manager ([efd5310](https://github.com/typedorm/typedorm/commit/efd5310dfe45cfa5770faaf7d0774405bfd5f9df))
- **core:** add support for read transaction ([5f0ec1b](https://github.com/typedorm/typedorm/commit/5f0ec1b4b5551cdb338ffe021401f00a1a7d5478))
- **core:** add support for specifying attributes to get when using entity manager `findOne` ([af5e12f](https://github.com/typedorm/typedorm/commit/af5e12f0ce18b86b58b72b598ab927cd245f5161))
- **core:** add support for specifying condition options to entity manager `put` ([f21a05a](https://github.com/typedorm/typedorm/commit/f21a05abeaa28e20b488197c0d0ba564127a4b8d))
- **core:** add support for specifying conditions when performing a transactional write ([7588e2f](https://github.com/typedorm/typedorm/commit/7588e2f1bfe3115b57f645f438c1a5f952609591))
- **core:** expression input parser to support parsing projection exp ([f529c56](https://github.com/typedorm/typedorm/commit/f529c56d2bee2c47c56644437aaaf1c2308b3b6b))

### Performance Improvements

- **core:** imporved recursive type infering for nested condition and filter options ([4849b7d](https://github.com/typedorm/typedorm/commit/4849b7d4f3923442ba8abf15c54edc8529a9ee32))

## [1.11.2](https://github.com/typedorm/typedorm/compare/v1.11.1...v1.11.2) (2021-04-30)

### Bug Fixes

- changelog generator ([d3859ab](https://github.com/typedorm/typedorm/commit/d3859abdda783941a42360d96f11b2c782618c78))

# [1.0.0-beta.2](https://github.com/typedorm/typedorm/compare/v1.0.0-beta.1...v1.0.0-beta.2) (2020-11-27)

### Bug Fixes

- **common:** fix circular imports issue ([fd0f053](https://github.com/typedorm/typedorm/commit/fd0f053707f806d96c864029350bec028a93e977))
- **core:** incorrect imports and conflicting styling ([f29aa82](https://github.com/typedorm/typedorm/commit/f29aa82ed660380ec44cb78a7265a513e18d8895))

### Features

- int import from private ([dbc957a](https://github.com/typedorm/typedorm/commit/dbc957a14474b9961d10b7f8152af771634126be))

# 1.0.0-beta.1 (2020-11-17)

### Features

- initial npm publish ([6d3e2c5](https://github.com/typedorm/typedorm/commit/6d3e2c58b60bd508e2a99fc81bbc049ec0bf08a2))
- initial publish to npm ([dd3739d](https://github.com/typedorm/typedorm/commit/dd3739de57dc1293111ad07e3e9b94bc3a3cd6c0))
- initial release ([af58b0f](https://github.com/typedorm/typedorm/commit/af58b0f3cc6cfd2a9600dd6738b6564bf754bc57))
- **common:** initial release ([eed611f](https://github.com/typedorm/typedorm/commit/eed611f31505ebbb41ee48fe9398e35cc3bd56e9))
- **common:** release with bot configs ([4c50f29](https://github.com/typedorm/typedorm/commit/4c50f2972928ed74ead0c6bc15464936223efc27))
- initial release ([697e729](https://github.com/typedorm/typedorm/commit/697e7291688460b3a75c9617cf691b5aed047843))
