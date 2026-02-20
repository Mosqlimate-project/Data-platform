# Bem-vindo à documentação da API Mosqlimate
A API Mosqlimate tem como objetivo principal fornecer acesso aos dados e modelos de previsão para doenças arbovirais.

## Dados
A parte de acesso aos dados, também chamada de [datastore](https://api.mosqlimate.org/docs/datastore/), oferece acesso a dados de notificação de doenças, séries temporais climáticas relevantes, como temperatura e precipitação, e dados de abundância de mosquitos. O *escopo geográfico* da API é o Brasil, a nível municipal.

## Modelos
A parte de modelos da API, chamada de [Model Registry](https://api.mosqlimate.org/docs/registry/), permite que usuários registrados façam upload de metadados sobre modelos de previsão de código aberto que utilizam dados Mosqlimate. Para registrar um modelo, um usuário precisa:

- Ter uma conta na plataforma;
- Ter o código do seu modelo em um repositório GitHub ou GitLab.

## Previsões
Outro tipo de informação que pode ser carregado aqui são as previsões geradas pelos modelos. As previsões carregadas são usadas para popular nosso painel de previsão, onde os modelos podem ser visualmente comparados em sua capacidade de prever dengue e outras doenças transmitidas por mosquitos.

## Uso
Instruções de uso detalhadas com exemplos de código podem ser encontradas na documentação específica de cada endpoint da API. Para solicitar dados da plataforma é necessária uma conta (consulte [Autorização](/docs/uid-key)).

## Mosqlient
Mosqlient oferece uma biblioteca Python para puxar dados da API interativamente. Você pode verificar sua documentação em [Mosqlimate-client readthedocs](https://mosqlimate-client.readthedocs.io/en/latest/).
