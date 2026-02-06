Release Notes
---

## [2.0.5](https://github.com/Mosqlimate-project/Data-platform/compare/2.0.4...2.0.5) (2026-02-05)


### Bug Fixes

* some bugfixes on frontend container's volumes for dev ([#391](https://github.com/Mosqlimate-project/Data-platform/issues/391)) ([0184177](https://github.com/Mosqlimate-project/Data-platform/commit/01841776ac19f290fed5998c66a966f1e7ede5b5))

## [2.0.4](https://github.com/Mosqlimate-project/Data-platform/compare/2.0.3...2.0.4) (2026-02-05)


### Bug Fixes

* include translations; add curl and R examples on non-predictions models page & more ([#390](https://github.com/Mosqlimate-project/Data-platform/issues/390)) ([5ec1877](https://github.com/Mosqlimate-project/Data-platform/commit/5ec187760415faeedf5563d228d00437236c1c4e))

## [2.0.3](https://github.com/Mosqlimate-project/Data-platform/compare/2.0.2...2.0.3) (2026-02-03)


### Bug Fixes

* **dashboard:** minor dashboard fixes ([#388](https://github.com/Mosqlimate-project/Data-platform/issues/388)) ([deff1cd](https://github.com/Mosqlimate-project/Data-platform/commit/deff1cd1683f9ebc886e2aceb129797f893f5ac2))

## [2.0.2](https://github.com/Mosqlimate-project/Data-platform/compare/2.0.1...2.0.2) (2026-01-31)


### Bug Fixes

* **models:** include back the endpoints for uploading models & predictions ([#384](https://github.com/Mosqlimate-project/Data-platform/issues/384)) ([f5a8b07](https://github.com/Mosqlimate-project/Data-platform/commit/f5a8b07b07449a941a0d2f69bad955500c7acb45))

## [2.0.1](https://github.com/Mosqlimate-project/Data-platform/compare/2.0.0...2.0.1) (2026-01-29)


### Bug Fixes

* **prod:** production fixes & publications/papers & finishing dashboa… ([#369](https://github.com/Mosqlimate-project/Data-platform/issues/369)) ([f26e879](https://github.com/Mosqlimate-project/Data-platform/commit/f26e8799b8aec74dc33f86cc5919ede0fec287ca))

# [2.0.0](https://github.com/Mosqlimate-project/Data-platform/compare/1.2.2...2.0.0) (2026-01-23)


### Features

* include sprint param back in the dashboard fetch & model and predictions search ([#366](https://github.com/Mosqlimate-project/Data-platform/issues/366)) ([db51e71](https://github.com/Mosqlimate-project/Data-platform/commit/db51e7112a9dc8ba4411bdbeb7c70ef3930c0698))
* restructure dashboard api response ([#364](https://github.com/Mosqlimate-project/Data-platform/issues/364)) ([6a7b951](https://github.com/Mosqlimate-project/Data-platform/commit/6a7b951909c577948aecd0bd4a8a17033ff9de31))


### BREAKING CHANGES

* The /dashboard/ now contains the sprint=bool in the param

* include contaovos link

* link to model

* toggle interval bounds
* The /dashboard/categories endpoint now returns sections instead of a flat list.

* chore: include translations on frontend

* chore: include install route on frontend

## [1.2.2](https://github.com/Mosqlimate-project/Data-platform/compare/1.2.1...1.2.2) (2026-01-22)


### Performance Improvements

* login on production & much more ([#361](https://github.com/Mosqlimate-project/Data-platform/issues/361)) ([bb7cf2e](https://github.com/Mosqlimate-project/Data-platform/commit/bb7cf2e0a2b7535a023b51a9882dc86755c71160))

## [1.2.1](https://github.com/Mosqlimate-project/Data-platform/compare/1.2.0...1.2.1) (2026-01-19)


### Bug Fixes

* **prod:** minor fixes to work properly on production ([#355](https://github.com/Mosqlimate-project/Data-platform/issues/355)) ([72d1366](https://github.com/Mosqlimate-project/Data-platform/commit/72d1366128745442595736b01a0871075cc919f6))

# [1.2.0](https://github.com/Mosqlimate-project/Data-platform/compare/1.1.0...1.2.0) (2026-01-15)


### Bug Fixes

* **about:** fix video playlist, include carrossel; show videos based on browser locale ([#290](https://github.com/Mosqlimate-project/Data-platform/issues/290)) ([ce908a3](https://github.com/Mosqlimate-project/Data-platform/commit/ce908a30006dc49136c83902519e2133737b6336))
* **api:** replace 'chik' by 'chikungunya' in the platform ([#228](https://github.com/Mosqlimate-project/Data-platform/issues/228)) ([71cd922](https://github.com/Mosqlimate-project/Data-platform/commit/71cd9221fd6e38c1e98383657a93553acc1f431e))
* **chatbot:** chatbot bugfix on prod; spawn django using Daphne ([#285](https://github.com/Mosqlimate-project/Data-platform/issues/285)) ([972c7a4](https://github.com/Mosqlimate-project/Data-platform/commit/972c7a4e77238e4233d6598613ec91170a1bff0e))
* **chatbot:** decouple chatbot consumer from main thread, use redis instead ([#299](https://github.com/Mosqlimate-project/Data-platform/issues/299)) ([bb6cd1e](https://github.com/Mosqlimate-project/Data-platform/commit/bb6cd1e46fa495185d50cbced53df34240ac7afb))
* **climate_weekly:** fix MacroSaude filter on climate/weekly ([#262](https://github.com/Mosqlimate-project/Data-platform/issues/262)) ([50b7ace](https://github.com/Mosqlimate-project/Data-platform/commit/50b7ace3a867a24447eb15433c0a49a49971b425))
* **dashboard:** clear localStorage after 12 hour ([#315](https://github.com/Mosqlimate-project/Data-platform/issues/315)) ([b3ab648](https://github.com/Mosqlimate-project/Data-platform/commit/b3ab648e0b897c099d036092fd56de671571ca3a))
* **dashboard:** fix dashboard bugs ([#318](https://github.com/Mosqlimate-project/Data-platform/issues/318)) ([d01eb61](https://github.com/Mosqlimate-project/Data-platform/commit/d01eb61281015fb36781be13e1ffaf8a0f35a39f))
* **dashboard:** include adm2 filter if adm2 ([#232](https://github.com/Mosqlimate-project/Data-platform/issues/232)) ([eb3b85d](https://github.com/Mosqlimate-project/Data-platform/commit/eb3b85d0c4102373ae6b43a68c5209486a2f4ab1))
* **dashboard:** make adm select always visible ([#272](https://github.com/Mosqlimate-project/Data-platform/issues/272)) ([057f599](https://github.com/Mosqlimate-project/Data-platform/commit/057f5998298eaad30f2781b0bf2e8f41020d6d9c))
* **dashboard:** minor fixes and enable sprint checkbox ([#222](https://github.com/Mosqlimate-project/Data-platform/issues/222)) ([4e6c279](https://github.com/Mosqlimate-project/Data-platform/commit/4e6c279838db7b3c354e2d6041e7ff1233fb270e))
* **dashboard:** replace API calls by client side logic ([#230](https://github.com/Mosqlimate-project/Data-platform/issues/230)) ([6625b0b](https://github.com/Mosqlimate-project/Data-platform/commit/6625b0b8fee24fe572a9142e879d99d250aeb1a6))
* define as standard api_key as X-UID-Key to be consistent through the examples ([3dd3cc1](https://github.com/Mosqlimate-project/Data-platform/commit/3dd3cc195c48ccba81e2fa7b5f125092af6a1164))
* **logreport:** include a general report view with more information ([#293](https://github.com/Mosqlimate-project/Data-platform/issues/293)) ([6c3acac](https://github.com/Mosqlimate-project/Data-platform/commit/6c3acac7a1465a5dda9e29d4987e65a574fb78b3))
* minor update ([352b472](https://github.com/Mosqlimate-project/Data-platform/commit/352b4727e3886df80755be92e8cf3aabe85e4c3b))
* **platform:** minor fixes ([#312](https://github.com/Mosqlimate-project/Data-platform/issues/312)) ([a6e01a4](https://github.com/Mosqlimate-project/Data-platform/commit/a6e01a4f328b53906f7809ee34a47e4febaaa7d9))
* **predictions:** include edit button on Prediction page ([#314](https://github.com/Mosqlimate-project/Data-platform/issues/314)) ([9fa492b](https://github.com/Mosqlimate-project/Data-platform/commit/9fa492be8bfcdf2a41354c15e1d71c15b873f8c2))
* **prod:** chatbot fixes to work on production ([#286](https://github.com/Mosqlimate-project/Data-platform/issues/286)) ([75a991a](https://github.com/Mosqlimate-project/Data-platform/commit/75a991a49a1c31ec22dabccbe082962b616bea2b))
* **prod:** minor production fixes ([#291](https://github.com/Mosqlimate-project/Data-platform/issues/291)) ([c9aaea4](https://github.com/Mosqlimate-project/Data-platform/commit/c9aaea4e23a091355493605db61123220f87ed36))
* **profile:** fix model field lookup error ([#233](https://github.com/Mosqlimate-project/Data-platform/issues/233)) ([c1be6ef](https://github.com/Mosqlimate-project/Data-platform/commit/c1be6ef34a5b0eb19ee6982bde8add749ce915fd))
* **registry:** enable sprint Prediction to be deleted ([#313](https://github.com/Mosqlimate-project/Data-platform/issues/313)) ([5ed2fbe](https://github.com/Mosqlimate-project/Data-platform/commit/5ed2fbee05c5171fd159469696f02edf007eb513))
* **registry:** include pagination on Author; add adm filter on Predictions ([#256](https://github.com/Mosqlimate-project/Data-platform/issues/256)) ([dcd6faf](https://github.com/Mosqlimate-project/Data-platform/commit/dcd6faf71a643d7e54e6e5dcb10e2f445195567f))
* run pre-commit all files ([c44c187](https://github.com/Mosqlimate-project/Data-platform/commit/c44c18709217333a9939ed4428f974e66accdf3a))
* **scores:** use mosqlient.Scorer to calculate scores & include wis ([#308](https://github.com/Mosqlimate-project/Data-platform/issues/308)) ([e76e229](https://github.com/Mosqlimate-project/Data-platform/commit/e76e229259ce7c0074e54b9cd72bca51a49fd67a))
* update docs ([3687a8b](https://github.com/Mosqlimate-project/Data-platform/commit/3687a8b098b99c49627edbc023e62afbe297f846))
* Update python examples to mosqlient and update R codes ([44352d1](https://github.com/Mosqlimate-project/Data-platform/commit/44352d153f2b91b48bad8daf7d24d19487f82d2e))
* **worker:** set data_iniSE as index to prevent query overheads & fix vis_echarts last_available_year ([#240](https://github.com/Mosqlimate-project/Data-platform/issues/240)) ([97ae5cd](https://github.com/Mosqlimate-project/Data-platform/commit/97ae5cd4a142516cee57fd90b98f4d77a3160e54))


### Features

* **backend:** integrate git repos with user profile ([#330](https://github.com/Mosqlimate-project/Data-platform/issues/330)) ([4a0d666](https://github.com/Mosqlimate-project/Data-platform/commit/4a0d666f41e12f8281a7316c7ca8930ce1cd3729))
* **chatbot:** chatbot version 0.0.1a (alpha) ([#284](https://github.com/Mosqlimate-project/Data-platform/issues/284)) ([3cf48ca](https://github.com/Mosqlimate-project/Data-platform/commit/3cf48ca5054e3333a5d8e56e4f1c6070fae77cf3))
* **dashboard:** toggle confidence bounds on legend click also ([#235](https://github.com/Mosqlimate-project/Data-platform/issues/235)) ([6d14085](https://github.com/Mosqlimate-project/Data-platform/commit/6d14085b080654d2ad1825a325ac47824859c2f5))
* **datastore:** include /climate/weekly/ endpoint ([#245](https://github.com/Mosqlimate-project/Data-platform/issues/245)) ([dd67395](https://github.com/Mosqlimate-project/Data-platform/commit/dd67395c7c0a78f0deafb2ec4a3f40703b369d68))
* **docs:** include API Overview (automatically updated documentation) ([#254](https://github.com/Mosqlimate-project/Data-platform/issues/254)) ([a21e056](https://github.com/Mosqlimate-project/Data-platform/commit/a21e0560a51035c07dab32540bedfac3440ec39e)), closes [#243](https://github.com/Mosqlimate-project/Data-platform/issues/243)
* **frontend:** include a better layout ([#326](https://github.com/Mosqlimate-project/Data-platform/issues/326)) ([220fc38](https://github.com/Mosqlimate-project/Data-platform/commit/220fc38856e65f7bdd485eaf09e292a35f6829f3))
* **frontend:** include dashboard endpoints ([#339](https://github.com/Mosqlimate-project/Data-platform/issues/339)) ([74b7bae](https://github.com/Mosqlimate-project/Data-platform/commit/74b7bae23e9c3bd75347079074f211c1769928a1))
* **frontend:** repository listing; numerous tweaks & improvs ([#331](https://github.com/Mosqlimate-project/Data-platform/issues/331)) ([8e375dd](https://github.com/Mosqlimate-project/Data-platform/commit/8e375dd6fb3a62797a2a4820545fb02a54da6e1e))
* **maps:** implement API to serve raster data ([#271](https://github.com/Mosqlimate-project/Data-platform/issues/271)) ([0edbd60](https://github.com/Mosqlimate-project/Data-platform/commit/0edbd607c1bb09b1f565f025aa5986724e35b10c))
* **prediction:** download prediction as csv; show prediction table; minor fixes ([#289](https://github.com/Mosqlimate-project/Data-platform/issues/289)) ([bf28480](https://github.com/Mosqlimate-project/Data-platform/commit/bf284802d75f51d14af572a49bd245e48b0cd6e0))
* profile page with settings ([#329](https://github.com/Mosqlimate-project/Data-platform/issues/329)) ([0ec5055](https://github.com/Mosqlimate-project/Data-platform/commit/0ec505556fc3b36b05f155a4c200bf6383bd39de))
* **registry:** include /registry/prediction/id/ page; update about and more ([#287](https://github.com/Mosqlimate-project/Data-platform/issues/287)) ([94d0984](https://github.com/Mosqlimate-project/Data-platform/commit/94d0984fc76ebbdda5afc9d6fda07abf299fd539))
* **registry:** include model page with its predictions and configs ([#303](https://github.com/Mosqlimate-project/Data-platform/issues/303)) ([bafbccc](https://github.com/Mosqlimate-project/Data-platform/commit/bafbccc4616a0809413cf3238f3e1bac43519e8a))
* **registry:** replace adm_1_geocode and adm_2_geocode by FKs ([#279](https://github.com/Mosqlimate-project/Data-platform/issues/279)) ([9f493a6](https://github.com/Mosqlimate-project/Data-platform/commit/9f493a65615bf3b55d1720f2d3b51f6405b3fd3e))
* **users:** API Report page ([#292](https://github.com/Mosqlimate-project/Data-platform/issues/292)) ([66b033e](https://github.com/Mosqlimate-project/Data-platform/commit/66b033ead4659d9160517a927c8597b972e112aa))
* **vis:** include dashboard for Sprint Predictions ([#224](https://github.com/Mosqlimate-project/Data-platform/issues/224)) ([0d4a45a](https://github.com/Mosqlimate-project/Data-platform/commit/0d4a45af521310018624f739e83ed0e07e7bb41b))

# [1.1.0](https://github.com/Mosqlimate-project/Data-platform/compare/1.0.0...1.1.0) (2024-07-15)


### Bug Fixes

* **api:** increase max items per page to 300 ([#200](https://github.com/Mosqlimate-project/Data-platform/issues/200)) ([d68a7f1](https://github.com/Mosqlimate-project/Data-platform/commit/d68a7f12225f388ad50f53ee925a8be5d758fef3))
* **api:** remove TagSchema from ModelSchema due to pre-initialization error ([#209](https://github.com/Mosqlimate-project/Data-platform/issues/209)) ([f7966a1](https://github.com/Mosqlimate-project/Data-platform/commit/f7966a16446cfd9950db64676c1ef13a52ee6e3f))
* **dashboard:** fix models/predictions visualize button ([#166](https://github.com/Mosqlimate-project/Data-platform/issues/166)) ([619069e](https://github.com/Mosqlimate-project/Data-platform/commit/619069ee86cb3531d0f44614aba43878a5037411))
* **dashboard:** include logic to display adm_level 1 predictions on dashboard ([#211](https://github.com/Mosqlimate-project/Data-platform/issues/211)) ([75e5d1d](https://github.com/Mosqlimate-project/Data-platform/commit/75e5d1d822a7b93ada353150f24c0717a0c5b4b0))
* **datastore:** include episcanner year field on /datastore/ form ([#177](https://github.com/Mosqlimate-project/Data-platform/issues/177)) ([026c2e5](https://github.com/Mosqlimate-project/Data-platform/commit/026c2e5c0cdadc12a5616bd03410db3b6125fcb9))
* **docs:** Improve the api documentation with mosqlient package examples ([71801e9](https://github.com/Mosqlimate-project/Data-platform/commit/71801e98b544c9a6cc559a82e644496c698c13df))
* **mkdocs:** update mkdocs-jupyter dependencies to fix container initialization ([#184](https://github.com/Mosqlimate-project/Data-platform/issues/184)) ([22aff40](https://github.com/Mosqlimate-project/Data-platform/commit/22aff4062140b6e163a9855e261ac6eb0b98eaf0))
* **validation:** improve the prediction's validation ([#202](https://github.com/Mosqlimate-project/Data-platform/issues/202)) ([403d249](https://github.com/Mosqlimate-project/Data-platform/commit/403d249d1f968c42de91b88b70055b9dccbeaac3))


### Features

* **datastore:** episcanner API endpoint ([#175](https://github.com/Mosqlimate-project/Data-platform/issues/175)) ([f45d469](https://github.com/Mosqlimate-project/Data-platform/commit/f45d46937106fdef9c54e3a86214dbba1d708563))
* **datastore:** serve aedes_eggs_data.zip ([#174](https://github.com/Mosqlimate-project/Data-platform/issues/174)) ([61ad5b9](https://github.com/Mosqlimate-project/Data-platform/commit/61ad5b9aa3d34c1df9477da2b4e7fb481e2f78dc))
* **macro-forecast-map:** add MacroForecastMap view ([#173](https://github.com/Mosqlimate-project/Data-platform/issues/173)) ([0e48e12](https://github.com/Mosqlimate-project/Data-platform/commit/0e48e12fb70c273d60d9b56b4b6d9614e36de5f9))
* **postgis:** install postgis on mosqlimate-postgres image ([#168](https://github.com/Mosqlimate-project/Data-platform/issues/168)) ([e6ca18f](https://github.com/Mosqlimate-project/Data-platform/commit/e6ca18f73320bd0857c0efe7d291f1d0e3630b06))
* **tags:** include tags on registry.Model ([#189](https://github.com/Mosqlimate-project/Data-platform/issues/189)) ([a4f6698](https://github.com/Mosqlimate-project/Data-platform/commit/a4f66986e9932629d99977e9d86cdd8a5f394841))
* **vis:** Prepare "Results prob lstm" plot; add geo specific models to receive geo data ([#172](https://github.com/Mosqlimate-project/Data-platform/issues/172)) ([1eae6ed](https://github.com/Mosqlimate-project/Data-platform/commit/1eae6ed1e955711684110c7df5411008d9be3f82))

# 1.0.0 (2023-12-19)


### Bug Fixes

* **api:** fix validations ([#138](https://github.com/Mosqlimate-project/Data-platform/issues/138)) ([b45743d](https://github.com/Mosqlimate-project/Data-platform/commit/b45743d7c497b5575b4b3d49234aae1e5ea9fb24))
* **API:** include missing parameters on dj models & more ([#120](https://github.com/Mosqlimate-project/Data-platform/issues/120)) ([b77fc82](https://github.com/Mosqlimate-project/Data-platform/commit/b77fc825331ee9d6b36f9cdfb3f8351e5514f2b6))
* **contaovos api - datastore:** change contaovos api POST method to GET ([#105](https://github.com/Mosqlimate-project/Data-platform/issues/105)) ([a131009](https://github.com/Mosqlimate-project/Data-platform/commit/a131009aa0e964cfb7112a29b5229fccd4fab05a))
* **models-box:** improve models-box layout & profile container ([#104](https://github.com/Mosqlimate-project/Data-platform/issues/104)) ([302e787](https://github.com/Mosqlimate-project/Data-platform/commit/302e78733f8fdd8701480092e0aad2ba411bdca8))
* **packages:** fix pydantic version ([#59](https://github.com/Mosqlimate-project/Data-platform/issues/59)) ([2b07955](https://github.com/Mosqlimate-project/Data-platform/commit/2b0795522d506c29095614f967580e7d0f1b7987))
* **postgres:** force postgres to use 1000 max_connections ([#113](https://github.com/Mosqlimate-project/Data-platform/issues/113)) ([0cc51a3](https://github.com/Mosqlimate-project/Data-platform/commit/0cc51a3d7afa57130ac6163d9376d47a09686cda))
* **predictions-api:** adm_level as None is breaking api result ([#110](https://github.com/Mosqlimate-project/Data-platform/issues/110)) ([097e022](https://github.com/Mosqlimate-project/Data-platform/commit/097e02268a969f0dc3bad374ae405fe22989e073))
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
* **registry - docs:** include adm_level field & add translations tags on views and docs & more ([#108](https://github.com/Mosqlimate-project/Data-platform/issues/108)) ([ed6e687](https://github.com/Mosqlimate-project/Data-platform/commit/ed6e6877ba6051d1639e0839d323f75d728d3890))
* **tasks:** add periodic task to update TotalCases model ([#124](https://github.com/Mosqlimate-project/Data-platform/issues/124)) ([f593c6d](https://github.com/Mosqlimate-project/Data-platform/commit/f593c6d1a8b0b0f6433ad479c9a31d113062233d))
* **templates:** add /datastore/ page ([#122](https://github.com/Mosqlimate-project/Data-platform/issues/122)) ([189c9d6](https://github.com/Mosqlimate-project/Data-platform/commit/189c9d6197a133de976ee224590ab9be0d1cd6bb))
* **templates:** include translations blocks ([#107](https://github.com/Mosqlimate-project/Data-platform/issues/107)) ([d6add3f](https://github.com/Mosqlimate-project/Data-platform/commit/d6add3f939882ef42af0f95e11247ad5b6f968d3))
* **vis:** include /vis/home/ ([#130](https://github.com/Mosqlimate-project/Data-platform/issues/130)) ([5fe2f00](https://github.com/Mosqlimate-project/Data-platform/commit/5fe2f0054c4c407db1c9e82bb44bdbfc95089868))
* **visualization:** prepare environment to include Plotly Dash ([#111](https://github.com/Mosqlimate-project/Data-platform/issues/111)) ([745324f](https://github.com/Mosqlimate-project/Data-platform/commit/745324facbcf4521b30533638791325e96d09184))
