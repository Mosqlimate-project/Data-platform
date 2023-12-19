Release Notes
---

# 1.0.0 (2023-12-19)


### Bug Fixes

* **api:** fix validations ([#138](https://github.com/Mosqlimate-project/Data-platform/issues/138)) ([b45743d](https://github.com/Mosqlimate-project/Data-platform/commit/b45743d7c497b5575b4b3d49234aae1e5ea9fb24))
* **API:** include missing parameters on dj models & more ([#120](https://github.com/Mosqlimate-project/Data-platform/issues/120)) ([b77fc82](https://github.com/Mosqlimate-project/Data-platform/commit/b77fc825331ee9d6b36f9cdfb3f8351e5514f2b6))
* **contaovos api - datastore:** change contaovos api POST method to GET ([#105](https://github.com/Mosqlimate-project/Data-platform/issues/105)) ([a131009](https://github.com/Mosqlimate-project/Data-platform/commit/a131009aa0e964cfb7112a29b5229fccd4fab05a))
* **models-box:** improve models-box layout & profile container ([#104](https://github.com/Mosqlimate-project/Data-platform/issues/104)) ([302e787](https://github.com/Mosqlimate-project/Data-platform/commit/302e78733f8fdd8701480092e0aad2ba411bdca8))
* **packages:** fix pydantic version ([#59](https://github.com/Mosqlimate-project/Data-platform/issues/59)) ([2b07955](https://github.com/Mosqlimate-project/Data-platform/commit/2b0795522d506c29095614f967580e7d0f1b7987))
* **postgres:** force postgres to use 1000 max_connections ([#113](https://github.com/Mosqlimate-project/Data-platform/issues/113)) ([0cc51a3](https://github.com/Mosqlimate-project/Data-platform/commit/0cc51a3d7afa57130ac6163d9376d47a09686cda))
* **predictions-api:** ADM_level as None is breaking api result ([#110](https://github.com/Mosqlimate-project/Data-platform/issues/110)) ([097e022](https://github.com/Mosqlimate-project/Data-platform/commit/097e02268a969f0dc3bad374ae405fe22989e073))
* **release:** fix semantic-release ([#147](https://github.com/Mosqlimate-project/Data-platform/issues/147)) ([1689e93](https://github.com/Mosqlimate-project/Data-platform/commit/1689e932bccc27412228e4a957cbb0d6396c9a3a))
* **release:** move GITHUB_TOKEN to a scope above ([#149](https://github.com/Mosqlimate-project/Data-platform/issues/149)) ([32403a8](https://github.com/Mosqlimate-project/Data-platform/commit/32403a82e4c60a2ca23d299090be96b11f02d52d))
* **templates:** models template JS returns error w prod config ([#82](https://github.com/Mosqlimate-project/Data-platform/issues/82)) ([2b4f693](https://github.com/Mosqlimate-project/Data-platform/commit/2b4f693edce398a6d075232ef8b263467be0d1a8))
* **users:** profile page is getting other users' models ([918b0b6](https://github.com/Mosqlimate-project/Data-platform/commit/918b0b6a28e90917fb6b9e0a189c27f7f0d707e6))


### Features

* Add prediction data validation module with initial API tests ([#121](https://github.com/Mosqlimate-project/Data-platform/issues/121)) ([601da56](https://github.com/Mosqlimate-project/Data-platform/commit/601da561946db95cf45901b84c09b9574403cf71))
* **containers:** add postgres container ([192b57d](https://github.com/Mosqlimate-project/Data-platform/commit/192b57d7a53420af2fc54914a817a204c93775be))
* **copernicus_brasil:** include 'uf' filter to copernicus_brasil api call ([#72](https://github.com/Mosqlimate-project/Data-platform/issues/72)) ([ab62c68](https://github.com/Mosqlimate-project/Data-platform/commit/ab62c68fb59df50325c2ed54fb2b43e509ef1e59))
* **datastore:** create connection with infodengue db & api for historico_alerta table ([#66](https://github.com/Mosqlimate-project/Data-platform/issues/66)) ([de157c1](https://github.com/Mosqlimate-project/Data-platform/commit/de157c1cfdc352bba0d83a294fa74f6bd11dc7b5))
* **datastore:** create datastore API endpoint for contaovos API ([#102](https://github.com/Mosqlimate-project/Data-platform/issues/102)) ([37490bc](https://github.com/Mosqlimate-project/Data-platform/commit/37490bc889d6ba409d71f3e65c8bd24ac9a567d3))
* **historico_alerta:** include 'disease' filter field and connect to zika and chik tables ([#70](https://github.com/Mosqlimate-project/Data-platform/issues/70)) ([fd3390a](https://github.com/Mosqlimate-project/Data-platform/commit/fd3390a532e6d4d66c15ffa3ae35f1d5f5759d0f))
* Implement ECharts Visualization for Disease Data ([#77](https://github.com/Mosqlimate-project/Data-platform/issues/77)) ([c07263f](https://github.com/Mosqlimate-project/Data-platform/commit/c07263f820529d3391b01e8cd04dcd82d7ccde72))
* Implement validation functions and tests for TestValidCreateModel ([#132](https://github.com/Mosqlimate-project/Data-platform/issues/132)) ([cf7f6a8](https://github.com/Mosqlimate-project/Data-platform/commit/cf7f6a875eea585c8d7ccf36ff899c9a9b000ec8))
* **linter:** add pre-commit config ([e1395ab](https://github.com/Mosqlimate-project/Data-platform/commit/e1395ab8ae066776de69c17cacf0f11a03f94f6b))
* **predictions:** include /edit-prediction/ ([#83](https://github.com/Mosqlimate-project/Data-platform/issues/83)) ([a152154](https://github.com/Mosqlimate-project/Data-platform/commit/a152154ca7ad1eb0657280b8b1c8e17b6f16e2c1))
* **registry - docs:** include ADM_level field & add translations tags on views and docs & more ([#108](https://github.com/Mosqlimate-project/Data-platform/issues/108)) ([ed6e687](https://github.com/Mosqlimate-project/Data-platform/commit/ed6e6877ba6051d1639e0839d323f75d728d3890))
* **tasks:** add periodic task to update TotalCases model ([#124](https://github.com/Mosqlimate-project/Data-platform/issues/124)) ([f593c6d](https://github.com/Mosqlimate-project/Data-platform/commit/f593c6d1a8b0b0f6433ad479c9a31d113062233d))
* **templates:** add /datastore/ page ([#122](https://github.com/Mosqlimate-project/Data-platform/issues/122)) ([189c9d6](https://github.com/Mosqlimate-project/Data-platform/commit/189c9d6197a133de976ee224590ab9be0d1cd6bb))
* **templates:** include translations blocks ([#107](https://github.com/Mosqlimate-project/Data-platform/issues/107)) ([d6add3f](https://github.com/Mosqlimate-project/Data-platform/commit/d6add3f939882ef42af0f95e11247ad5b6f968d3))
* **vis:** include /vis/home/ ([#130](https://github.com/Mosqlimate-project/Data-platform/issues/130)) ([5fe2f00](https://github.com/Mosqlimate-project/Data-platform/commit/5fe2f0054c4c407db1c9e82bb44bdbfc95089868))
* **visualization:** prepare environment to include Plotly Dash ([#111](https://github.com/Mosqlimate-project/Data-platform/issues/111)) ([745324f](https://github.com/Mosqlimate-project/Data-platform/commit/745324facbcf4521b30533638791325e96d09184))
