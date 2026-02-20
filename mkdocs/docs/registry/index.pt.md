# API de Registro de Modelos
`https://api.mosqlimate.org/api/registry/`

O registro de modelos é uma ferramenta para interagir com o banco de dados de modelos e previsões do Mosqlimate.

## Inserindo modelos e previsões
Registrando modelos de previsão que desejam compartilhar suas previsões na plataforma Mosqlimate.

Assim como tudo em nossa API, o registro de modelos pode ser acessado programaticamente. Você pode [inserir novos modelos](https://api.mosqlimate.org/docs/registry/POST/models/) na plataforma, ou [publicar previsões](https://api.mosqlimate.org/docs/registry/POST/predictions/) geradas a partir de um modelo registrado.

As previsões publicadas estarão disponíveis para visualização, juntamente com os dados, no painel de controle de nossas plataformas.

## Puxando modelos e previsões
Você também pode puxar modelos e previsões da plataforma. O endpoint de [registro de modelos](https://api.mosqlimate.org/docs/registry/GET/models/) retornará uma lista de todos os modelos inseridos na plataforma, enquanto o endpoint de [previsões](https://api.mosqlimate.org/docs/registry/GET/predictions/) retornará uma lista das previsões.
